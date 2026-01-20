import {
  AnalyzeDocumentCommand,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  FeatureType,
  Block,
  BlockType,
} from '@aws-sdk/client-textract';
import { textractClient, isAwsConfigured, s3Config } from '../../config/aws';
import { storageService } from '../storage.service';
import { logger } from '../../utils/logger';
import { IOcrService, OcrServiceResult, OcrServiceOptions } from './types';
import {
  OcrPage,
  OcrBlock,
  OcrTable,
  OcrTableCell,
  OcrKeyValuePair,
} from '../../types/extraction.types';
import crypto from 'crypto';

const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 5000;

export class TextractService implements IOcrService {
  isAvailable(): boolean {
    return isAwsConfigured();
  }

  async processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    options: OcrServiceOptions = {}
  ): Promise<OcrServiceResult> {
    const startTime = Date.now();

    const features = this.buildFeatures(options);
    const isPdf = mimeType === 'application/pdf';

    logger.info('Starting Textract analysis', { features, mimeType, isPdf });

    let blocks: Block[];

    if (isPdf) {
      blocks = await this.analyzeMultiPageDocument(fileBuffer, mimeType, features, options.queries);
    } else {
      blocks = await this.analyzeSinglePage(fileBuffer, features, options.queries);
    }

    const result = this.parseTextractResponse(blocks);

    return {
      engine: 'AWS_TEXTRACT',
      engineVersion: '2018-06-27',
      rawText: result.rawText,
      pages: result.pages,
      tables: result.tables,
      keyValuePairs: result.keyValuePairs,
      overallConfidence: result.overallConfidence,
      wordCount: result.wordCount,
      processingTimeMs: Date.now() - startTime,
      rawResponse: blocks,
    };
  }

  private buildFeatures(options: OcrServiceOptions): FeatureType[] {
    const features: FeatureType[] = [];
    if (options.enableTables !== false) features.push('TABLES');
    if (options.enableForms !== false) features.push('FORMS');
    if (options.queries?.length) features.push('QUERIES');
    return features;
  }

  private async analyzeSinglePage(
    fileBuffer: Buffer,
    features: FeatureType[],
    queries?: string[]
  ): Promise<Block[]> {
    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBuffer },
      FeatureTypes: features,
      QueriesConfig: queries?.length
        ? { Queries: queries.map((q) => ({ Text: q })) }
        : undefined,
    });

    const response = await textractClient.send(command);
    return response.Blocks || [];
  }

  private async analyzeMultiPageDocument(
    fileBuffer: Buffer,
    mimeType: string,
    features: FeatureType[],
    queries?: string[]
  ): Promise<Block[]> {
    const processingId = `textract-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const { bucket, key } = await storageService.uploadForTextractProcessing(
      fileBuffer,
      processingId,
      mimeType
    );

    try {
      const startCommand = new StartDocumentAnalysisCommand({
        DocumentLocation: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        FeatureTypes: features,
        QueriesConfig: queries?.length
          ? { Queries: queries.map((q) => ({ Text: q })) }
          : undefined,
      });

      const startResponse = await textractClient.send(startCommand);
      const jobId = startResponse.JobId;

      if (!jobId) {
        throw new Error('Textract did not return a JobId');
      }

      logger.info('Textract async job started', { jobId, bucket, key });

      const blocks = await this.pollForResults(jobId);
      return blocks;
    } finally {
      await storageService.deleteTextractProcessingFile(key);
    }
  }

  private async pollForResults(jobId: string): Promise<Block[]> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const getCommand = new GetDocumentAnalysisCommand({ JobId: jobId });
      const response = await textractClient.send(getCommand);
      const status = response.JobStatus;

      logger.debug('Textract job status', { jobId, status, attempt });

      if (status === 'SUCCEEDED') {
        const allBlocks: Block[] = response.Blocks || [];
        let nextToken = response.NextToken;

        while (nextToken) {
          const nextResponse = await textractClient.send(
            new GetDocumentAnalysisCommand({
              JobId: jobId,
              NextToken: nextToken,
            })
          );
          allBlocks.push(...(nextResponse.Blocks || []));
          nextToken = nextResponse.NextToken;
        }

        logger.info('Textract job completed', { jobId, totalBlocks: allBlocks.length });
        return allBlocks;
      }

      if (status === 'FAILED') {
        throw new Error(`Textract job failed: ${response.StatusMessage}`);
      }

      await this.sleep(POLL_INTERVAL_MS);
    }

    throw new Error(`Textract job timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseTextractResponse(blocks: Block[]): {
    rawText: string;
    pages: OcrPage[];
    tables: OcrTable[];
    keyValuePairs: OcrKeyValuePair[];
    overallConfidence: number;
    wordCount: number;
  } {
    const blockMap = new Map<string, Block>();
    blocks.forEach((b) => b.Id && blockMap.set(b.Id, b));

    const lines = blocks.filter((b) => b.BlockType === 'LINE');
    const rawText = lines.map((l) => l.Text || '').join('\n');
    const wordCount = blocks.filter((b) => b.BlockType === 'WORD').length;

    const confidences = blocks
      .filter((b) => b.Confidence !== undefined)
      .map((b) => b.Confidence!);
    const overallConfidence = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length / 100
      : 0;

    const pageBlocks = blocks.filter((b) => b.BlockType === 'PAGE');
    const pages: OcrPage[] = pageBlocks.map((pageBlock, idx) =>
      this.parsePageBlock(pageBlock, blockMap, idx + 1)
    );

    if (pages.length === 0 && lines.length > 0) {
      pages.push({
        pageNumber: 1,
        width: 1,
        height: 1,
        text: rawText,
        blocks: lines.map((l) => this.convertToOcrBlock(l)),
      });
    }

    const tables = this.parseTables(blocks, blockMap);
    const keyValuePairs = this.parseKeyValuePairs(blocks, blockMap);

    return { rawText, pages, tables, keyValuePairs, overallConfidence, wordCount };
  }

  private parsePageBlock(
    pageBlock: Block,
    blockMap: Map<string, Block>,
    pageNum: number
  ): OcrPage {
    const childIds = pageBlock.Relationships?.find((r) => r.Type === 'CHILD')?.Ids || [];
    const childBlocks = childIds
      .map((id) => blockMap.get(id))
      .filter((b): b is Block => b !== undefined);

    const lineBlocks = childBlocks.filter((b) => b.BlockType === 'LINE');
    const text = lineBlocks.map((l) => l.Text || '').join('\n');

    const tableBlocks = childBlocks.filter((b) => b.BlockType === 'TABLE');
    const tables = tableBlocks.map((tb, idx) => this.parseTableBlock(tb, blockMap, pageNum, idx));

    return {
      pageNumber: pageNum,
      width: 1,
      height: 1,
      text,
      blocks: lineBlocks.map((l) => this.convertToOcrBlock(l)),
      tables,
    };
  }

  private convertToOcrBlock(block: Block): OcrBlock {
    const bbox = block.Geometry?.BoundingBox;
    return {
      id: block.Id || crypto.randomUUID(),
      type: this.mapBlockType(block.BlockType),
      text: block.Text || '',
      confidence: (block.Confidence || 0) / 100,
      boundingBox: {
        left: bbox?.Left || 0,
        top: bbox?.Top || 0,
        width: bbox?.Width || 0,
        height: bbox?.Height || 0,
      },
    };
  }

  private mapBlockType(blockType?: BlockType): OcrBlock['type'] {
    switch (blockType) {
      case 'LINE':
        return 'LINE';
      case 'WORD':
        return 'WORD';
      case 'TABLE':
        return 'TABLE';
      case 'KEY_VALUE_SET':
        return 'FORM_FIELD';
      default:
        return 'PARAGRAPH';
    }
  }

  private parseTables(blocks: Block[], blockMap: Map<string, Block>): OcrTable[] {
    const tableBlocks = blocks.filter((b) => b.BlockType === 'TABLE');
    return tableBlocks.map((tableBlock, idx) => this.parseTableBlock(tableBlock, blockMap, 1, idx));
  }

  private parseTableBlock(
    tableBlock: Block,
    blockMap: Map<string, Block>,
    pageNumber: number,
    tableIndex: number
  ): OcrTable {
    const cellIds = tableBlock.Relationships?.find((r) => r.Type === 'CHILD')?.Ids || [];
    const cells: OcrTableCell[] = [];

    let maxRow = 0;
    let maxCol = 0;

    cellIds.forEach((cellId) => {
      const cell = blockMap.get(cellId);
      if (cell?.BlockType === 'CELL') {
        const rowIdx = cell.RowIndex || 1;
        const colIdx = cell.ColumnIndex || 1;
        maxRow = Math.max(maxRow, rowIdx);
        maxCol = Math.max(maxCol, colIdx);

        const wordIds = cell.Relationships?.find((r) => r.Type === 'CHILD')?.Ids || [];
        const text = wordIds
          .map((id) => blockMap.get(id)?.Text || '')
          .join(' ')
          .trim();

        const bbox = cell.Geometry?.BoundingBox;
        cells.push({
          rowIndex: rowIdx - 1,
          columnIndex: colIdx - 1,
          rowSpan: cell.RowSpan || 1,
          columnSpan: cell.ColumnSpan || 1,
          text,
          isHeader: rowIdx === 1,
          confidence: (cell.Confidence || 0) / 100,
          boundingBox: {
            left: bbox?.Left || 0,
            top: bbox?.Top || 0,
            width: bbox?.Width || 0,
            height: bbox?.Height || 0,
          },
        });
      }
    });

    return {
      id: tableBlock.Id || `table-${pageNumber}-${tableIndex}`,
      pageNumber,
      rowCount: maxRow,
      columnCount: maxCol,
      cells,
      confidence: (tableBlock.Confidence || 0) / 100,
    };
  }

  private parseKeyValuePairs(blocks: Block[], blockMap: Map<string, Block>): OcrKeyValuePair[] {
    const kvPairs: OcrKeyValuePair[] = [];

    const keyBlocks = blocks.filter(
      (b) => b.BlockType === 'KEY_VALUE_SET' && b.EntityTypes?.includes('KEY')
    );

    keyBlocks.forEach((keyBlock) => {
      const valueRelation = keyBlock.Relationships?.find((r) => r.Type === 'VALUE');
      const valueBlockId = valueRelation?.Ids?.[0];
      const valueBlock = valueBlockId ? blockMap.get(valueBlockId) : undefined;

      const keyText = this.getTextFromBlock(keyBlock, blockMap);
      const valueText = valueBlock ? this.getTextFromBlock(valueBlock, blockMap) : '';

      if (keyText) {
        const keyBbox = keyBlock.Geometry?.BoundingBox;
        const valueBbox = valueBlock?.Geometry?.BoundingBox;

        kvPairs.push({
          key: keyText,
          value: valueText,
          keyConfidence: (keyBlock.Confidence || 0) / 100,
          valueConfidence: (valueBlock?.Confidence || 0) / 100,
          keyBoundingBox: {
            left: keyBbox?.Left || 0,
            top: keyBbox?.Top || 0,
            width: keyBbox?.Width || 0,
            height: keyBbox?.Height || 0,
          },
          valueBoundingBox: {
            left: valueBbox?.Left || 0,
            top: valueBbox?.Top || 0,
            width: valueBbox?.Width || 0,
            height: valueBbox?.Height || 0,
          },
        });
      }
    });

    return kvPairs;
  }

  private getTextFromBlock(block: Block, blockMap: Map<string, Block>): string {
    const childIds = block.Relationships?.find((r) => r.Type === 'CHILD')?.Ids || [];
    return childIds
      .map((id) => blockMap.get(id)?.Text || '')
      .join(' ')
      .trim();
  }
}

export const textractService = new TextractService();
