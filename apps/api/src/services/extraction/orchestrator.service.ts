/**
 * Extraction Orchestrator Service
 *
 * Coordinates the full extraction pipeline: classification, LLM extraction,
 * schema mapping, validation, and confidence scoring.
 */

import { DocumentType, OcrEngine, ExtractionMethod } from '@prisma/client';
import { getMistralClient, isMistralConfigured } from '../../config/mistral';
import { extractionConfig, extractionLlmConfig } from '../../config/extraction';
import { logger } from '../../utils/logger';
import { DocumentExtractionData, ValidationWarning } from '../../types/extraction.types';
import {
  ExtractionResult,
  OcrInput,
  LLMExtractionResponse,
  ValidationError,
  ExtractionPipelineOptions,
} from './types';
import { schemaMapper } from './schema-mapper.service';
import { EXTRACTION_SYSTEM_PROMPT, createExtractionUserPrompt } from './prompts/extraction.prompts';

export class ExtractionOrchestrator {
  /**
   * Extract structured data from OCR results.
   *
   * @param ocrInput - OCR processing results
   * @param documentType - The classified document type
   * @param options - Optional extraction options
   * @returns Extraction result with structured data and confidence scores
   */
  async extract(
    ocrInput: OcrInput,
    documentType: DocumentType,
    options?: ExtractionPipelineOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const confidenceThreshold = options?.confidenceThreshold ?? extractionConfig.confidenceThreshold;

    logger.info('Starting extraction', {
      documentType,
      ocrEngine: ocrInput.engine,
      textLength: ocrInput.rawText.length,
    });

    try {
      // Prepare the text input - combine raw text with table data if available
      const enrichedText = this.prepareTextForExtraction(ocrInput);

      // Call LLM for extraction
      const llmResponse = await this.callExtractionLLM(enrichedText, documentType);

      // Map to typed schema and validate
      const validationResult = schemaMapper.parseAndValidate(
        llmResponse,
        documentType,
        [ocrInput.engine],
        Date.now() - startTime
      );

      if (!validationResult.isValid || !validationResult.normalizedData) {
        logger.warn('Extraction validation failed', {
          documentType,
          errors: validationResult.errors,
        });

        // Return a minimal result with errors
        return this.createFailedResult(
          documentType,
          validationResult.errors,
          validationResult.warnings,
          Date.now() - startTime
        );
      }

      // Calculate confidence and determine review status
      const fieldConfidences = llmResponse.field_confidences || {};
      const overallConfidence = schemaMapper.calculateOverallConfidence(fieldConfidences);
      const lowConfidenceFields = Object.entries(fieldConfidences)
        .filter(([, conf]) => conf < confidenceThreshold)
        .map(([field]) => field);

      const requiresReview = schemaMapper.shouldRequireReview(
        overallConfidence,
        lowConfidenceFields,
        validationResult.warnings
      );

      const processingTimeMs = Date.now() - startTime;

      logger.info('Extraction completed', {
        documentType,
        overallConfidence,
        lowConfidenceFieldCount: lowConfidenceFields.length,
        requiresReview,
        processingTimeMs,
      });

      return {
        extractedData: validationResult.normalizedData,
        fieldConfidences,
        lowConfidenceFields,
        overallConfidence,
        requiresReview,
        validationWarnings: validationResult.warnings,
        validationErrors: validationResult.errors,
        processingTimeMs,
        extractionMethod: 'LLM_ASSISTED' as ExtractionMethod,
      };
    } catch (error) {
      logger.error('Extraction failed', {
        documentType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.createFailedResult(
        documentType,
        [
          {
            field: '_extraction',
            message: error instanceof Error ? error.message : 'Extraction failed',
            code: 'PARSE_ERROR',
          },
        ],
        [],
        Date.now() - startTime
      );
    }
  }

  /**
   * Prepare text for extraction by combining raw text with structured table data.
   */
  private prepareTextForExtraction(ocrInput: OcrInput): string {
    let text = ocrInput.rawText;

    // Append table data in a structured format if available
    if (ocrInput.tables && ocrInput.tables.length > 0) {
      text += '\n\n--- EXTRACTED TABLES ---\n';

      for (const table of ocrInput.tables) {
        if (table.title) {
          text += `\nTable: ${table.title}\n`;
        }

        // Convert table cells to a readable format
        const rows: string[][] = [];
        for (const cell of table.cells) {
          if (!rows[cell.rowIndex]) {
            rows[cell.rowIndex] = [];
          }
          rows[cell.rowIndex][cell.columnIndex] = cell.text;
        }

        // Format as markdown table
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i] || [];
          text += '| ' + row.join(' | ') + ' |\n';
          if (i === 0) {
            text += '| ' + row.map(() => '---').join(' | ') + ' |\n';
          }
        }
        text += '\n';
      }
    }

    // Append key-value pairs if available
    if (ocrInput.keyValuePairs && ocrInput.keyValuePairs.length > 0) {
      text += '\n\n--- FORM FIELDS ---\n';
      for (const kvp of ocrInput.keyValuePairs) {
        text += `${kvp.key}: ${kvp.value}\n`;
      }
    }

    return text;
  }

  /**
   * Call the LLM for structured extraction.
   */
  private async callExtractionLLM(
    text: string,
    documentType: DocumentType
  ): Promise<LLMExtractionResponse> {
    if (!isMistralConfigured()) {
      throw new Error('Mistral LLM is not configured for extraction');
    }

    const client = getMistralClient();
    const userPrompt = createExtractionUserPrompt(text, documentType);

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt < extractionLlmConfig.retries; attempt++) {
      try {
        const response = await client.chat.complete({
          model: extractionLlmConfig.model,
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: extractionLlmConfig.temperature,
          maxTokens: extractionLlmConfig.maxTokens,
          responseFormat: { type: 'json_object' },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('No response from LLM');
        }

        // Handle content which can be string or ContentChunk[]
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const parsed = JSON.parse(contentStr) as LLMExtractionResponse;

        // Validate basic structure
        if (!parsed.extracted_data) {
          throw new Error('LLM response missing extracted_data field');
        }

        return parsed;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn('LLM extraction attempt failed', {
          attempt: attempt + 1,
          maxRetries: extractionLlmConfig.retries,
          error: lastError.message,
        });

        // Wait before retry (exponential backoff)
        if (attempt < extractionLlmConfig.retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error('LLM extraction failed after retries');
  }

  /**
   * Create a failed extraction result.
   */
  private createFailedResult(
    documentType: DocumentType,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    processingTimeMs: number
  ): ExtractionResult {
    // Create minimal extracted data structure based on document type
    const minimalData = this.createMinimalExtractedData(documentType, processingTimeMs);

    return {
      extractedData: minimalData,
      fieldConfidences: {},
      lowConfidenceFields: [],
      overallConfidence: 0,
      requiresReview: true,
      validationWarnings: warnings,
      validationErrors: errors,
      processingTimeMs,
      extractionMethod: 'LLM_ASSISTED' as ExtractionMethod,
    };
  }

  /**
   * Create minimal extracted data for failed extractions.
   */
  private createMinimalExtractedData(
    documentType: DocumentType,
    processingTimeMs: number
  ): DocumentExtractionData {
    const baseMetadata = {
      extractedAt: new Date().toISOString(),
      ocrEngines: [] as ('AWS_TEXTRACT' | 'MISTRAL_OCR' | 'TESSERACT')[],
      extractionMethod: 'LLM_ASSISTED' as const,
      overallConfidence: 0,
      processingTimeMs,
      pageCount: 1,
      warnings: [
        {
          field: '_extraction',
          message: 'Extraction failed - manual review required',
          severity: 'HIGH' as const,
        },
      ],
      lowConfidenceFields: [],
    };

    // Return type-appropriate minimal structure
    switch (documentType) {
      case 'LAB_RESULT':
        return {
          documentType: 'LAB_RESULT',
          patient: {},
          testResults: [],
          _metadata: baseMetadata,
        } as DocumentExtractionData;

      case 'DISCHARGE_SUMMARY':
        return {
          documentType: 'DISCHARGE_SUMMARY',
          patient: {},
          admission: { date: '', reason: '' },
          discharge: { date: '', disposition: '' },
          diagnoses: [],
          procedures: [],
          medications: { onDischarge: [] },
          _metadata: baseMetadata,
        } as DocumentExtractionData;

      case 'PRESCRIPTION':
        return {
          documentType: 'PRESCRIPTION',
          patient: {},
          prescriber: { name: '' },
          prescriptionDate: '',
          medications: [],
          _metadata: baseMetadata,
        } as DocumentExtractionData;

      case 'RADIOLOGY_REPORT':
        return {
          documentType: 'RADIOLOGY_REPORT',
          patient: {},
          radiologist: { name: '' },
          studyDate: '',
          studyType: '',
          findings: '',
          impression: '',
          _metadata: baseMetadata,
        } as DocumentExtractionData;

      case 'CONSULTATION_NOTE':
        return {
          documentType: 'CONSULTATION_NOTE',
          patient: {},
          consultDate: '',
          consultingProvider: { name: '' },
          reasonForConsult: '',
          diagnoses: [],
          _metadata: baseMetadata,
        } as DocumentExtractionData;

      default:
        // Use progress note as default/fallback
        return {
          documentType: 'PROGRESS_NOTE',
          patient: {},
          provider: { name: '' },
          noteDate: '',
          _metadata: baseMetadata,
        } as DocumentExtractionData;
    }
  }

  /**
   * Check if the extraction service is available.
   */
  isAvailable(): boolean {
    return isMistralConfigured();
  }
}

export const extractionOrchestrator = new ExtractionOrchestrator();
