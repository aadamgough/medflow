import { textractService } from './textract.service';
import { mistralOCRService } from './mistral.service';
import { IOcrService, OcrServiceResult, OcrServiceOptions } from './types';
import { selectOcrEngine, extractionConfig, OcrEngine } from '../../config/extraction';
import { logger } from '../../utils/logger';
import { OcrEngine as PrismaOcrEngine } from '@prisma/client';

export class OcrOrchestrator {
  private services: Map<OcrEngine, IOcrService> = new Map<OcrEngine, IOcrService>([
    ['AWS_TEXTRACT', textractService],
    ['MISTRAL_OCR', mistralOCRService],
  ]);

  async processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    documentType?: string,
    options?: OcrServiceOptions
  ): Promise<OcrServiceResult> {
    const hasComplexTables =
      documentType === 'LAB_RESULT' || documentType === 'PATHOLOGY_REPORT';
    const selectedEngine = selectOcrEngine(documentType, hasComplexTables);

    logger.info('OCR engine selected', { selectedEngine, documentType, hasComplexTables });

    const service = this.services.get(selectedEngine);

    if (!service?.isAvailable()) {
      const fallbackEngine = extractionConfig.fallbackEngine as OcrEngine;
      const fallbackService = this.services.get(fallbackEngine);

      if (fallbackService?.isAvailable()) {
        logger.warn('Primary OCR engine unavailable, using fallback', {
          primary: selectedEngine,
          fallback: fallbackEngine,
        });
        return fallbackService.processDocument(fileBuffer, mimeType, options);
      }

      throw new Error(
        `No OCR engines available. Primary: ${selectedEngine}, Fallback: ${fallbackEngine}`
      );
    }

    try {
      return await service.processDocument(fileBuffer, mimeType, options);
    } catch (error) {
      const fallbackEngine = extractionConfig.fallbackEngine as OcrEngine;
      const fallbackService = this.services.get(fallbackEngine);

      if (fallbackService?.isAvailable() && fallbackEngine !== selectedEngine) {
        logger.warn('Primary OCR failed, trying fallback', {
          primary: selectedEngine,
          fallback: fallbackEngine,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return fallbackService.processDocument(fileBuffer, mimeType, options);
      }

      throw error;
    }
  }

  async processWithEnsemble(
    fileBuffer: Buffer,
    mimeType: string,
    options?: OcrServiceOptions
  ): Promise<{ primary: OcrServiceResult; secondary?: OcrServiceResult }> {
    const availableServices = Array.from(this.services.entries()).filter(([, service]) =>
      service.isAvailable()
    );

    if (availableServices.length === 0) {
      throw new Error('No OCR engines available');
    }

    const [primaryEngine, primaryService] = availableServices[0];
    const primary = await primaryService.processDocument(fileBuffer, mimeType, options);

    let secondary: OcrServiceResult | undefined;

    if (extractionConfig.enableEnsembleMode && availableServices.length > 1) {
      const [secondaryEngine, secondaryService] = availableServices[1];
      try {
        secondary = await secondaryService.processDocument(fileBuffer, mimeType, options);
      } catch (error) {
        logger.warn('Secondary OCR engine failed in ensemble mode', {
          engine: secondaryEngine,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    return { primary, secondary };
  }

  getAvailableEngines(): PrismaOcrEngine[] {
    const available: PrismaOcrEngine[] = [];
    this.services.forEach((service, engine) => {
      if (service.isAvailable()) {
        available.push(engine as PrismaOcrEngine);
      }
    });
    return available;
  }
}

export const ocrOrchestrator = new OcrOrchestrator();

export { textractService } from './textract.service';
export { mistralOCRService } from './mistral.service';
export * from './types';
