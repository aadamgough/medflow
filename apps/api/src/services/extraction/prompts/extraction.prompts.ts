/**
 * Extraction Prompts
 *
 * LLM prompts for structured data extraction from medical documents.
 * Each document type has a specific prompt with field definitions.
 */

import { DocumentType } from '@prisma/client';

/**
 * Base system prompt for all extraction tasks
 */
export const EXTRACTION_SYSTEM_PROMPT = `You are a medical document data extraction specialist. Your task is to extract structured information from OCR-processed medical documents with high accuracy.

CRITICAL GUIDELINES:
1. Extract ONLY information explicitly stated in the document - never infer or assume
2. Use null for missing fields rather than guessing
3. Preserve exact medical terminology, drug names, and dosages as written
4. Normalize dates to ISO 8601 format (YYYY-MM-DD) when possible
5. Include confidence scores (0.0-1.0) for each major field based on OCR clarity and certainty
6. Flag any ambiguous or potentially incorrect extractions in the extraction_notes

CONFIDENCE SCORING:
- 1.0: Clear, unambiguous text with high OCR confidence
- 0.8-0.9: Clear text, minor formatting issues
- 0.6-0.8: Readable but some uncertainty (smudges, handwriting)
- 0.4-0.6: Partially readable, some guessing required
- <0.4: Very uncertain, consider marking as null

OUTPUT FORMAT:
Respond with valid JSON matching the requested schema. Include:
{
  "extracted_data": { ... schema-specific fields ... },
  "field_confidences": { "field.path": confidence_score, ... },
  "extraction_notes": "Any issues, ambiguities, or concerns"
}`;

/**
 * Schema-specific prompts for each document type
 */
export const EXTRACTION_PROMPTS: Record<DocumentType, string> = {
  LAB_RESULT: `Extract laboratory test results using this schema:

{
  "documentType": "LAB_RESULT",
  "patient": {
    "name": "string or null",
    "dateOfBirth": "YYYY-MM-DD or null",
    "patientId": "MRN or identifier",
    "gender": "MALE|FEMALE|OTHER|UNKNOWN or null"
  },
  "orderingProvider": {
    "name": "string or null",
    "npi": "string or null"
  },
  "laboratory": {
    "name": "string or null",
    "address": { "street": "", "city": "", "state": "", "zipCode": "" }
  },
  "collectionDate": "YYYY-MM-DD or null",
  "receivedDate": "YYYY-MM-DD or null",
  "reportDate": "YYYY-MM-DD or null",
  "orderNumber": "string or null",
  "accessionNumber": "string or null",
  "specimenType": "string or null",
  "specimenSource": "string or null",
  "testResults": [
    {
      "testName": "required string",
      "loincCode": "string or null",
      "value": "string or number",
      "unit": "string or null",
      "referenceRange": {
        "low": number or null,
        "high": number or null,
        "text": "original range text"
      },
      "flag": "HIGH|LOW|CRITICAL_HIGH|CRITICAL_LOW|ABNORMAL|NORMAL or null",
      "status": "FINAL|PRELIMINARY|CORRECTED|CANCELLED or null",
      "confidence": 0.0-1.0
    }
  ],
  "panels": [
    {
      "panelName": "string",
      "loincCode": "string or null",
      "testNames": ["references to testResults"]
    }
  ],
  "clinicalNotes": "string or null"
}

IMPORTANT FOR LAB RESULTS:
- Extract ALL test results, including those in tables
- Preserve exact test names as written
- Include reference ranges exactly as shown
- Flag abnormal values correctly (H=HIGH, L=LOW, etc.)
- Group tests into panels when panel names are present (CBC, BMP, etc.)`,

  DISCHARGE_SUMMARY: `Extract discharge summary information using this schema:

{
  "documentType": "DISCHARGE_SUMMARY",
  "patient": {
    "name": "string or null",
    "dateOfBirth": "YYYY-MM-DD or null",
    "patientId": "MRN",
    "gender": "MALE|FEMALE|OTHER|UNKNOWN or null",
    "address": { "street": "", "city": "", "state": "", "zipCode": "" }
  },
  "admission": {
    "date": "YYYY-MM-DD (required)",
    "time": "HH:MM or null",
    "source": "EMERGENCY|TRANSFER|ELECTIVE|OBSERVATION|OTHER or null",
    "reason": "required string",
    "admittingDiagnosis": "string or null"
  },
  "discharge": {
    "date": "YYYY-MM-DD (required)",
    "time": "HH:MM or null",
    "disposition": "where patient went (Home, SNF, Rehab, etc.)",
    "condition": "STABLE|IMPROVED|UNCHANGED|DETERIORATED or null"
  },
  "lengthOfStayDays": number or null,
  "attendingPhysician": {
    "name": "string",
    "npi": "string or null",
    "specialty": "string or null"
  },
  "facility": {
    "name": "string or null",
    "address": {}
  },
  "unit": "ICU, Med-Surg, etc. or null",
  "diagnoses": [
    {
      "description": "required string",
      "icdCode": "ICD-10 code or null",
      "type": "PRIMARY|SECONDARY|ADMITTING|DISCHARGE|COMPLICATION|RULED_OUT",
      "status": "ACTIVE|RESOLVED|CHRONIC|RULED_OUT or null",
      "confidence": 0.0-1.0
    }
  ],
  "procedures": [
    {
      "name": "required string",
      "cptCode": "string or null",
      "date": "YYYY-MM-DD or null",
      "performedBy": "string or null",
      "confidence": 0.0-1.0
    }
  ],
  "medications": {
    "onAdmission": [...medication entries...],
    "onDischarge": [...medication entries...],
    "discontinued": [...medication entries...],
    "changed": [
      {
        "medication": "string",
        "changeType": "DOSE_INCREASE|DOSE_DECREASE|FREQUENCY_CHANGE|ROUTE_CHANGE|SUBSTITUTION",
        "previousValue": "string",
        "newValue": "string",
        "confidence": 0.0-1.0
      }
    ]
  },
  "allergies": [
    {
      "allergen": "string",
      "reaction": "string or null",
      "severity": "MILD|MODERATE|SEVERE|LIFE_THREATENING or null",
      "confidence": 0.0-1.0
    }
  ],
  "hospitalCourse": "narrative text",
  "significantFindings": ["array of key findings"],
  "dischargeInstructions": {
    "activity": "string or null",
    "diet": "string or null",
    "woundCare": "string or null",
    "medications": "string or null",
    "warningSignsToWatch": ["array of warning signs"]
  },
  "followUp": [
    {
      "provider": "string or null",
      "specialty": "string or null",
      "timeframe": "2 weeks, 1 month, etc.",
      "reason": "string or null",
      "confidence": 0.0-1.0
    }
  ],
  "dischargeVitals": {
    "bloodPressureSystolic": number or null,
    "bloodPressureDiastolic": number or null,
    "heartRate": number or null,
    "temperature": number or null,
    "oxygenSaturation": number or null
  }
}

IMPORTANT FOR DISCHARGE SUMMARIES:
- Capture ALL diagnoses, distinguishing primary from secondary
- Extract complete medication reconciliation
- Include hospital course narrative in full
- Parse follow-up appointments with timeframes`,

  CONSULTATION_NOTE: `Extract consultation note information using this schema:

{
  "documentType": "CONSULTATION_NOTE",
  "patient": { ...patient info... },
  "consultDate": "YYYY-MM-DD (required)",
  "consultationType": "INITIAL|FOLLOW_UP|URGENT|ROUTINE or null",
  "requestingProvider": { ...provider info... },
  "consultingProvider": { ...provider info (required)... },
  "facility": { ...facility info... },
  "reasonForConsult": "required string",
  "chiefComplaint": "string or null",
  "historyOfPresentIllness": "string or null",
  "pastMedicalHistory": "string or null",
  "pastSurgicalHistory": "string or null",
  "familyHistory": "string or null",
  "socialHistory": "string or null",
  "reviewOfSystems": { "cardiovascular": "", "respiratory": "", ... },
  "physicalExam": {
    "general": "string",
    "vitals": { ...vital signs... },
    "cardiovascular": "string",
    ...
  },
  "diagnoses": [...diagnosis entries...],
  "differentialDiagnoses": [...diagnosis entries...],
  "plan": "string or null",
  "recommendedTests": ["array of tests"],
  "recommendedProcedures": [...procedure entries...],
  "recommendedMedications": [...medication entries...],
  "followUp": [...follow-up entries...]
}`,

  PRESCRIPTION: `Extract prescription information using this schema:

{
  "documentType": "PRESCRIPTION",
  "patient": { ...patient info... },
  "prescriber": {
    "name": "required string",
    "npi": "string or null",
    "specialty": "string or null",
    "organization": "string or null",
    "phone": "string or null"
  },
  "pharmacy": { ...facility info or null... },
  "prescriptionDate": "YYYY-MM-DD (required)",
  "deaNumber": "string or null (for controlled substances)",
  "medications": [
    {
      "name": "required string",
      "genericName": "string or null",
      "brandName": "string or null",
      "rxnormCode": "string or null",
      "dosage": "string or null",
      "strength": "string or null",
      "unit": "string or null",
      "frequency": "string or null",
      "route": "ORAL|IV|IM|TOPICAL|INHALATION|SUBCUTANEOUS|OTHER or null",
      "instructions": "sig instructions",
      "quantity": number or null,
      "quantityUnit": "string or null",
      "daysSupply": number or null,
      "refills": number or null,
      "dispenseAsWritten": boolean or null,
      "confidence": 0.0-1.0
    }
  ]
}

IMPORTANT FOR PRESCRIPTIONS:
- Extract EXACT drug name, strength, and dosage
- Parse sig instructions carefully
- Include refill information
- Note if DAW (dispense as written) is indicated`,

  RADIOLOGY_REPORT: `Extract radiology report information using this schema:

{
  "documentType": "RADIOLOGY_REPORT",
  "patient": { ...patient info... },
  "orderingProvider": { ...provider info... },
  "radiologist": { ...provider info (required)... },
  "facility": { ...facility info... },
  "studyDate": "YYYY-MM-DD (required)",
  "studyType": "CT|MRI|X-Ray|Ultrasound|etc. (required)",
  "bodyPart": "string or null",
  "laterality": "LEFT|RIGHT|BILATERAL|N/A or null",
  "accessionNumber": "string or null",
  "orderNumber": "string or null",
  "indication": "string or null",
  "clinicalHistory": "string or null",
  "comparison": "prior studies compared or null",
  "technique": "string or null",
  "contrastUsed": boolean or null,
  "contrastType": "string or null",
  "findings": "required string - full findings section",
  "structuredFindings": [
    {
      "anatomicLocation": "string",
      "finding": "string",
      "size": "string or null",
      "characteristics": ["array of descriptors"],
      "impression": "NORMAL|ABNORMAL|UNCHANGED|IMPROVED|WORSENED|NEW or null",
      "confidence": 0.0-1.0
    }
  ],
  "impression": "required string - radiologist impression",
  "recommendations": ["array of follow-up recommendations"],
  "criticalFinding": boolean,
  "criticalFindingCommunicated": boolean or null,
  "criticalFindingCommunicatedTo": "string or null",
  "criticalFindingCommunicatedAt": "datetime or null"
}

IMPORTANT FOR RADIOLOGY:
- Capture the FULL findings and impression text
- Note any critical findings and communication
- Include comparison to prior studies if mentioned
- Parse structured findings when possible`,

  PATHOLOGY_REPORT: `Extract pathology report information using this schema:

{
  "documentType": "PATHOLOGY_REPORT",
  "patient": { ...patient info... },
  "orderingProvider": { ...provider info... },
  "pathologist": { ...provider info (required)... },
  "facility": { ...facility info... },
  "specimenCollectionDate": "YYYY-MM-DD (required)",
  "specimenReceivedDate": "YYYY-MM-DD or null",
  "reportDate": "YYYY-MM-DD (required)",
  "accessionNumber": "string or null",
  "specimenType": "required string",
  "specimenSource": "required string",
  "clinicalHistory": "string or null",
  "preoperativeDiagnosis": "string or null",
  "grossDescription": "string or null",
  "microscopicDescription": "string or null",
  "diagnosis": "required string - final diagnosis",
  "diagnoses": [...diagnosis entries...],
  "staging": {
    "tnmStage": "string or null",
    "tStage": "string or null",
    "nStage": "string or null",
    "mStage": "string or null",
    "grade": "string or null",
    "marginStatus": "NEGATIVE|POSITIVE|CLOSE or null",
    "lymphovascularInvasion": boolean or null,
    "perineuralInvasion": boolean or null
  },
  "biomarkers": [
    {
      "name": "string",
      "result": "string",
      "interpretation": "string or null"
    }
  ],
  "additionalTestingRecommended": ["array of recommended tests"]
}`,

  OPERATIVE_NOTE: `Extract operative note information using this schema:

{
  "documentType": "OPERATIVE_NOTE",
  "patient": { ...patient info... },
  "procedureDate": "YYYY-MM-DD (required)",
  "procedureStartTime": "HH:MM or null",
  "procedureEndTime": "HH:MM or null",
  "surgeon": { ...provider info (required)... },
  "assistant": { ...provider info or null... },
  "anesthesiologist": { ...provider info or null... },
  "facility": { ...facility info... },
  "operatingRoom": "string or null",
  "preoperativeDiagnosis": "required string",
  "postoperativeDiagnosis": "required string",
  "procedures": [
    {
      "name": "required string",
      "cptCode": "string or null",
      "confidence": 0.0-1.0
    }
  ],
  "anesthesiaType": "GENERAL|REGIONAL|LOCAL|SEDATION|COMBINED or null",
  "indication": "string or null",
  "findings": "string or null",
  "techniqueDescription": "string or null",
  "specimensRemoved": ["array of specimens"],
  "complications": "string or null",
  "estimatedBloodLoss": "string or null",
  "implantsUsed": [
    {
      "name": "string",
      "manufacturer": "string or null",
      "serialNumber": "string or null",
      "lotNumber": "string or null"
    }
  ],
  "drains": ["array of drain descriptions"],
  "closureType": "string or null",
  "conditionAtEnd": "STABLE|CRITICAL|GUARDED or null",
  "dispositionFromOR": "PACU, ICU, Floor, etc."
}`,

  PROGRESS_NOTE: `Extract progress note information using this schema:

{
  "documentType": "PROGRESS_NOTE",
  "patient": { ...patient info... },
  "provider": { ...provider info (required)... },
  "facility": { ...facility info... },
  "noteDate": "YYYY-MM-DD (required)",
  "noteTime": "HH:MM or null",
  "noteType": "DAILY|WEEKLY|ADMISSION|TRANSFER|OTHER or null",
  "subjective": "string or null",
  "objective": {
    "vitals": { ...vital signs... },
    "physicalExam": "string or null",
    "labResults": "string or null",
    "imaging": "string or null"
  },
  "assessment": "string or null",
  "plan": "string or null",
  "narrativeNote": "if not SOAP format, full note text",
  "diagnoses": [...diagnosis entries...],
  "medications": [...medication entries...],
  "newOrders": ["array of new orders"]
}`,

  CONSENT_FORM: `Extract consent form information using this schema:

{
  "documentType": "CONSENT_FORM",
  "patient": { ...patient info... },
  "consentType": "GENERAL|PROCEDURE|SURGERY|ANESTHESIA|RESEARCH|HIPAA|OTHER (required)",
  "consentFor": "specific procedure or treatment name",
  "provider": { ...provider info... },
  "facility": { ...facility info... },
  "risksDisclosed": ["array of disclosed risks"],
  "benefitsDisclosed": ["array of disclosed benefits"],
  "alternativesDisclosed": ["array of alternatives"],
  "patientSignature": {
    "signed": boolean,
    "signatureDate": "YYYY-MM-DD or null",
    "signatureTime": "HH:MM or null",
    "signedBy": "patient name or representative",
    "relationship": "if signed by representative"
  },
  "witnessSignature": {
    "signed": boolean,
    "signatureDate": "YYYY-MM-DD or null",
    "witnessName": "string or null"
  },
  "providerSignature": {
    "signed": boolean,
    "signatureDate": "YYYY-MM-DD or null",
    "providerName": "string or null"
  },
  "interpreterUsed": boolean or null,
  "interpreterLanguage": "string or null"
}`,

  PATIENT_INTAKE: `Extract patient intake form information using this schema:

{
  "documentType": "CONSENT_FORM",
  "patient": {
    "name": "required string",
    "dateOfBirth": "YYYY-MM-DD",
    "gender": "MALE|FEMALE|OTHER|UNKNOWN",
    "address": { ...full address... },
    "phone": "string",
    "email": "string or null"
  },
  "emergencyContact": {
    "name": "string",
    "relationship": "string",
    "phone": "string"
  },
  "insurance": {
    "provider": "string",
    "policyNumber": "string",
    "groupNumber": "string or null"
  },
  "primaryCarePhysician": { ...provider info... },
  "medicalHistory": ["array of conditions"],
  "surgicalHistory": ["array of surgeries"],
  "allergies": [...allergy entries...],
  "currentMedications": [...medication entries...],
  "familyHistory": { "condition": "affected relative", ... },
  "socialHistory": {
    "smoking": "string or null",
    "alcohol": "string or null",
    "occupation": "string or null"
  }
}`,

  INSURANCE_FORM: `Extract insurance form information using this schema:

{
  "documentType": "CONSENT_FORM",
  "patient": { ...patient info... },
  "insuranceProvider": "string",
  "policyNumber": "string",
  "groupNumber": "string or null",
  "subscriberName": "string",
  "subscriberDOB": "YYYY-MM-DD or null",
  "subscriberRelationship": "self, spouse, child, etc.",
  "claimNumber": "string or null",
  "authorizationNumber": "string or null",
  "serviceDate": "YYYY-MM-DD or null",
  "diagnosisCodes": ["array of ICD codes"],
  "procedureCodes": ["array of CPT codes"],
  "amountBilled": number or null,
  "amountApproved": number or null,
  "patientResponsibility": number or null
}`,

  REFERRAL: `Extract referral information using this schema:

{
  "documentType": "CONSULTATION_NOTE",
  "patient": { ...patient info... },
  "referralDate": "YYYY-MM-DD",
  "referringProvider": { ...provider info (required)... },
  "referredToProvider": { ...provider info... },
  "referredToSpecialty": "string",
  "urgency": "ROUTINE|URGENT|EMERGENT or null",
  "reasonForReferral": "required string",
  "clinicalHistory": "string or null",
  "currentMedications": [...medication entries...],
  "relevantDiagnoses": [...diagnosis entries...],
  "relevantTestResults": "string or null",
  "questionsForSpecialist": ["array of specific questions"],
  "preferredAppointmentTimeframe": "string or null"
}`,

  CLINICAL_TRIAL: `Extract clinical trial document information using this schema:

{
  "documentType": "CLINICAL_TRIAL",
  "patient": { ...patient info... },
  "trialName": "string or null",
  "trialId": "NCT number or protocol ID",
  "sponsor": "string or null",
  "principalInvestigator": { ...provider info... },
  "site": { ...facility info... },
  "enrollmentDate": "YYYY-MM-DD or null",
  "randomizationDate": "YYYY-MM-DD or null",
  "treatmentArm": "string or null",
  "consentDate": "YYYY-MM-DD or null",
  "consentVersion": "string or null",
  "visitDate": "YYYY-MM-DD or null",
  "visitNumber": "string or null",
  "visitType": "screening, baseline, follow-up, etc.",
  "adverseEvents": [
    {
      "description": "string",
      "onsetDate": "YYYY-MM-DD or null",
      "severity": "MILD|MODERATE|SEVERE|LIFE_THREATENING|DEATH",
      "seriousness": "SERIOUS|NON_SERIOUS",
      "relatedness": "RELATED|POSSIBLY_RELATED|UNLIKELY_RELATED|NOT_RELATED",
      "outcome": "RECOVERED|RECOVERING|NOT_RECOVERED|FATAL|UNKNOWN",
      "confidence": 0.0-1.0
    }
  ],
  "concomitantMedications": [...medication entries...],
  "participationStatus": "ENROLLED|ACTIVE|COMPLETED|WITHDRAWN|SCREEN_FAILURE",
  "withdrawalDate": "YYYY-MM-DD or null",
  "withdrawalReason": "string or null"
}`,

  UNKNOWN: `Extract whatever information is available from this document:

{
  "documentType": "PROGRESS_NOTE",
  "patient": { ...patient info if found... },
  "provider": { ...provider info if found... },
  "facility": { ...facility info if found... },
  "documentDate": "YYYY-MM-DD or null",
  "content": "main text content",
  "diagnoses": [...any diagnoses found...],
  "medications": [...any medications found...],
  "procedures": [...any procedures found...],
  "notes": "any other relevant information"
}

Since the document type is unknown, extract as much structured information as possible
while focusing on patient, provider, dates, diagnoses, medications, and procedures.`,
};

/**
 * Get the extraction prompt for a specific document type
 */
export function getExtractionPrompt(documentType: DocumentType): string {
  return EXTRACTION_PROMPTS[documentType] || EXTRACTION_PROMPTS.UNKNOWN;
}

/**
 * Create the user prompt with the OCR text
 */
export function createExtractionUserPrompt(ocrText: string, documentType: DocumentType): string {
  const schemaPrompt = getExtractionPrompt(documentType);

  return `Extract structured data from the following ${documentType.replace(/_/g, ' ')} document.

${schemaPrompt}

---
DOCUMENT TEXT:
${ocrText.slice(0, 12000)}
${ocrText.length > 12000 ? '\n[... document truncated due to length ...]' : ''}
---

Extract all available information and return as JSON with extracted_data, field_confidences, and extraction_notes.`;
}
