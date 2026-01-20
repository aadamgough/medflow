import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { logger } from '../utils/logger';
import { extractionConfig } from '../config/extraction';
import { PreprocessedDocument } from './ocr/types';

export class DocumentPreprocessor {
  async preprocess(fileBuffer: Buffer, mimeType: string): Promise<PreprocessedDocument> {
    if (mimeType === 'application/pdf') {
      return this.preprocessPdf(fileBuffer);
    }
    return this.preprocessImage(fileBuffer, mimeType);
  }

  private async preprocessImage(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<PreprocessedDocument> {
    let image = sharp(fileBuffer);
    const metadata = await image.metadata();

    let wasRotated = false;

    if (extractionConfig.preprocessing.autoRotate) {
      image = image.rotate();
      wasRotated = true;
    }

    const targetDpi = extractionConfig.preprocessing.targetDpi;
    const currentDpi = metadata.density || 72;

    if (currentDpi < targetDpi && metadata.width && metadata.height) {
      const scale = Math.min(targetDpi / currentDpi, 2);
      const newWidth = Math.round(metadata.width * scale);
      const newHeight = Math.round(metadata.height * scale);

      image = image.resize(newWidth, newHeight, { kernel: 'lanczos3' });

      logger.info('Upscaled image for better OCR', {
        originalDpi: currentDpi,
        targetDpi,
        scale,
      });
    }

    if (extractionConfig.preprocessing.enhanceContrast) {
      image = image.normalize();
    }

    const processedBuffer = await image.png().toBuffer();
    const qualityScore = this.calculateQualityScore(metadata);

    return {
      buffer: processedBuffer,
      mimeType: 'image/png',
      pageCount: 1,
      dpi: targetDpi,
      wasRotated,
      wasDeskewed: false,
      qualityScore,
    };
  }

  private async preprocessPdf(fileBuffer: Buffer): Promise<PreprocessedDocument> {
    let pageCount = 1;

    try {
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch (error) {
      logger.warn('Could not parse PDF for page count', { error });
    }

    logger.info('PDF preprocessing complete', { pageCount, bufferSize: fileBuffer.length });

    return {
      buffer: fileBuffer,
      mimeType: 'application/pdf',
      pageCount,
      qualityScore: 0.8,
    };
  }

  private calculateQualityScore(metadata: sharp.Metadata): number {
    let score = 1.0;

    const minDimension = Math.min(metadata.width || 0, metadata.height || 0);
    if (minDimension < 500) score -= 0.3;
    else if (minDimension < 1000) score -= 0.1;

    const dpi = metadata.density || 72;
    if (dpi < 150) score -= 0.2;
    else if (dpi < 200) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  async extractPdfPages(
    fileBuffer: Buffer,
    pageRange?: { start: number; end: number }
  ): Promise<Buffer[]> {
    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    const start = pageRange?.start ?? 0;
    const end = Math.min(pageRange?.end ?? totalPages, totalPages);

    const pageBuffers: Buffer[] = [];

    for (let i = start; i < end; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      pageBuffers.push(Buffer.from(pdfBytes));
    }

    return pageBuffers;
  }
}

export const documentPreprocessor = new DocumentPreprocessor();
