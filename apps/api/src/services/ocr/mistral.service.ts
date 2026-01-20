import { getMistralClient, mistralOcrConfig, isMistralConfigured, MISTRAL_OCR_MODEL } from '../../config/mistral';
import { logger } from '../../utils/logger';
import { IOcrService, OcrServiceResult, OcrServiceOptions } from './types';
import { OcrPage, OcrBlock, OcrTable, OcrTableCell } from '../../types/extraction.types';

export class MistralOCRService implements IOcrService {
  isAvailable(): boolean {
    return isMistralConfigured();
  }

  async processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    options: OcrServiceOptions = {}
  ): Promise<OcrServiceResult> {
    const startTime = Date.now();

    if (!this.isAvailable()) {
      throw new Error('Mistral OCR is not configured');
    }

    const client = getMistralClient();
    const base64 = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    logger.info('Starting Mistral OCR', { mimeType, bufferSize: fileBuffer.length });

    const response = await client.ocr.process({
      model: MISTRAL_OCR_MODEL,
      document: {
        type: 'image_url',
        imageUrl: dataUrl,
      },
      includeImageBase64: mistralOcrConfig.includeImages,
    });

    const result = this.parseMistralResponse(response);

    return {
      engine: 'MISTRAL_OCR',
      engineVersion: MISTRAL_OCR_MODEL,
      rawText: result.rawText,
      pages: result.pages,
      tables: result.tables,
      keyValuePairs: [],
      overallConfidence: result.overallConfidence,
      wordCount: result.wordCount,
      processingTimeMs: Date.now() - startTime,
      rawResponse: response,
    };
  }

  private parseMistralResponse(response: unknown): {
    rawText: string;
    pages: OcrPage[];
    tables: OcrTable[];
    overallConfidence: number;
    wordCount: number;
  } {
    const pages: OcrPage[] = [];
    const tables: OcrTable[] = [];
    let allText = '';

    const typedResponse = response as {
      pages?: Array<{
        markdown?: string;
        text?: string;
        width?: number;
        height?: number;
      }>;
      text?: string;
    };

    const ocrPages = typedResponse.pages || [];

    ocrPages.forEach((page, pageIdx) => {
      const pageText = page.markdown || page.text || '';
      allText += pageText + '\n';

      const pageTables = this.extractMarkdownTables(pageText, pageIdx + 1);
      tables.push(...pageTables);

      pages.push({
        pageNumber: pageIdx + 1,
        width: page.width || 1,
        height: page.height || 1,
        text: pageText,
        blocks: this.createBlocksFromText(pageText),
        tables: pageTables,
      });
    });

    if (pages.length === 0 && typedResponse.text) {
      allText = typedResponse.text;
      const pageTables = this.extractMarkdownTables(allText, 1);
      tables.push(...pageTables);

      pages.push({
        pageNumber: 1,
        width: 1,
        height: 1,
        text: allText,
        blocks: this.createBlocksFromText(allText),
        tables: pageTables,
      });
    }

    const wordCount = allText.split(/\s+/).filter((w) => w.length > 0).length;
    const overallConfidence = mistralOcrConfig.confidenceThreshold;

    return {
      rawText: allText.trim(),
      pages,
      tables,
      overallConfidence,
      wordCount,
    };
  }

  private createBlocksFromText(text: string): OcrBlock[] {
    const lines = text.split('\n').filter((l) => l.trim());
    const totalLines = lines.length || 1;

    return lines.map((line, idx) => ({
      id: `mistral-line-${idx}`,
      type: 'LINE' as const,
      text: line,
      confidence: mistralOcrConfig.confidenceThreshold,
      boundingBox: {
        left: 0,
        top: idx / totalLines,
        width: 1,
        height: 1 / totalLines,
      },
    }));
  }

  private extractMarkdownTables(markdown: string, pageNumber: number): OcrTable[] {
    const tables: OcrTable[] = [];
    const tableRegex = /\|(.+\|)+\n\|[-:\s|]+\|\n(\|.+\|\n?)+/g;
    let match;
    let tableIdx = 0;

    while ((match = tableRegex.exec(markdown)) !== null) {
      const tableText = match[0];
      const rows = tableText
        .trim()
        .split('\n')
        .filter((row) => !row.match(/^\|[-:\s|]+\|$/));

      const cells: OcrTableCell[] = [];
      let maxCols = 0;

      rows.forEach((row, rowIdx) => {
        const cellTexts = row
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        maxCols = Math.max(maxCols, cellTexts.length);

        cellTexts.forEach((cellText, colIdx) => {
          cells.push({
            rowIndex: rowIdx,
            columnIndex: colIdx,
            rowSpan: 1,
            columnSpan: 1,
            text: cellText,
            isHeader: rowIdx === 0,
            confidence: mistralOcrConfig.confidenceThreshold,
            boundingBox: { left: 0, top: 0, width: 0, height: 0 },
          });
        });
      });

      tables.push({
        id: `mistral-table-${pageNumber}-${tableIdx}`,
        pageNumber,
        rowCount: rows.length,
        columnCount: maxCols,
        cells,
        confidence: mistralOcrConfig.confidenceThreshold,
      });

      tableIdx++;
    }

    return tables;
  }
}

export const mistralOCRService = new MistralOCRService();
