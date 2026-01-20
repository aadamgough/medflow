/**
 * Extraction Types for Medical Documents
 * 
 * These types define the structured JSON schemas for each document type.
 * The extraction pipeline will produce data conforming to these schemas.
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export interface PatientInfo {
  name?: string;
  dateOfBirth?: string; // ISO date string
  patientId?: string;   // MRN or other identifier
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  address?: AddressInfo;
  phone?: string;
  email?: string;
}

export interface AddressInfo {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface ProviderInfo {
  name?: string;
  npi?: string;        // National Provider Identifier
  specialty?: string;
  organization?: string;
  phone?: string;
  fax?: string;
}

export interface FacilityInfo {
  name?: string;
  address?: AddressInfo;
  phone?: string;
  fax?: string;
}

export interface MedicationEntry {
  name: string;
  genericName?: string;
  brandName?: string;
  rxnormCode?: string;
  dosage?: string;
  strength?: string;
  unit?: string;
  frequency?: string;
  route?: 'ORAL' | 'IV' | 'IM' | 'TOPICAL' | 'INHALATION' | 'SUBCUTANEOUS' | 'OTHER';
  startDate?: string;
  endDate?: string;
  prescribedBy?: string;
  instructions?: string;
  confidence: number;
}

export interface DiagnosisEntry {
  description: string;
  icdCode?: string;      // ICD-10 code
  snomedCode?: string;   // SNOMED CT code
  type: 'PRIMARY' | 'SECONDARY' | 'ADMITTING' | 'DISCHARGE' | 'COMPLICATION' | 'RULED_OUT';
  onsetDate?: string;
  resolvedDate?: string;
  status?: 'ACTIVE' | 'RESOLVED' | 'CHRONIC' | 'RULED_OUT';
  confidence: number;
}

export interface ProcedureEntry {
  name: string;
  cptCode?: string;      // CPT code
  icdPcsCode?: string;   // ICD-10-PCS code
  snomedCode?: string;
  date?: string;
  performedBy?: string;
  facility?: string;
  notes?: string;
  confidence: number;
}

export interface AllergyEntry {
  allergen: string;
  reaction?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
  onsetDate?: string;
  confidence: number;
}

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  temperatureUnit?: 'F' | 'C';
  oxygenSaturation?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'in';
  bmi?: number;
  recordedAt?: string;
}

// =============================================================================
// EXTRACTION METADATA
// =============================================================================

export interface ExtractionMetadata {
  extractedAt: string;
  ocrEngines: ('AWS_TEXTRACT' | 'MISTRAL_OCR' | 'TESSERACT')[];
  extractionMethod: 'HYBRID_TEXTRACT_MISTRAL' | 'TEXTRACT_ONLY' | 'MISTRAL_ONLY' | 'RULE_BASED' | 'LLM_ASSISTED';
  overallConfidence: number;
  processingTimeMs: number;
  pageCount: number;
  warnings: ValidationWarning[];
  lowConfidenceFields: string[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedValue?: string;
}

export interface FieldConfidence {
  [fieldPath: string]: number;
}

// =============================================================================
// LAB RESULT EXTRACTION
// =============================================================================

export interface LabResultExtraction {
  documentType: 'LAB_RESULT';
  
  // Patient & Provider info
  patient: PatientInfo;
  orderingProvider?: ProviderInfo;
  laboratory?: FacilityInfo;
  
  // Dates
  collectionDate?: string;
  receivedDate?: string;
  reportDate?: string;
  
  // Order information
  orderNumber?: string;
  accessionNumber?: string;
  specimenType?: string;
  specimenSource?: string;
  
  // Test results
  testResults: LabTestResult[];
  
  // Grouped panels (e.g., "Basic Metabolic Panel", "CBC")
  panels?: LabPanel[];
  
  // Clinical notes/comments
  clinicalNotes?: string;
  
  // Metadata
  _metadata: ExtractionMetadata;
}

export interface LabTestResult {
  testName: string;
  loincCode?: string;
  value: string | number;
  unit?: string;
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
  };
  flag?: 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' | 'ABNORMAL' | 'NORMAL';
  status?: 'FINAL' | 'PRELIMINARY' | 'CORRECTED' | 'CANCELLED';
  performedDate?: string;
  notes?: string;
  confidence: number;
}

export interface LabPanel {
  panelName: string;
  loincCode?: string;
  testNames: string[]; // References to testResults by testName
}

// =============================================================================
// DISCHARGE SUMMARY EXTRACTION
// =============================================================================

export interface DischargeSummaryExtraction {
  documentType: 'DISCHARGE_SUMMARY';
  
  // Patient info
  patient: PatientInfo;
  
  // Encounter details
  admission: {
    date: string;
    time?: string;
    source?: 'EMERGENCY' | 'TRANSFER' | 'ELECTIVE' | 'OBSERVATION' | 'OTHER';
    reason: string;
    admittingDiagnosis?: string;
  };
  
  discharge: {
    date: string;
    time?: string;
    disposition: string; // "Home", "SNF", "Rehab", "AMA", "Expired", etc.
    condition?: 'STABLE' | 'IMPROVED' | 'UNCHANGED' | 'DETERIORATED';
  };
  
  // Length of stay
  lengthOfStayDays?: number;
  
  // Providers
  attendingPhysician?: ProviderInfo;
  consultants?: ProviderInfo[];
  
  // Facility
  facility?: FacilityInfo;
  unit?: string; // ICU, Med-Surg, etc.
  
  // Clinical information
  diagnoses: DiagnosisEntry[];
  procedures: ProcedureEntry[];
  
  // Medications
  medications: {
    onAdmission?: MedicationEntry[];
    onDischarge: MedicationEntry[];
    discontinued?: MedicationEntry[];
    changed?: MedicationChange[];
  };
  
  // Allergies
  allergies?: AllergyEntry[];
  
  // Hospital course narrative
  hospitalCourse?: string;
  
  // Key findings
  significantFindings?: string[];
  
  // Discharge instructions
  dischargeInstructions?: {
    activity?: string;
    diet?: string;
    woundCare?: string;
    medications?: string;
    warningSignsToWatch?: string[];
    other?: string;
  };
  
  // Follow-up
  followUp?: FollowUpInstruction[];
  
  // Vital signs at discharge
  dischargeVitals?: VitalSigns;
  
  // Metadata
  _metadata: ExtractionMetadata;
}

export interface MedicationChange {
  medication: string;
  changeType: 'DOSE_INCREASE' | 'DOSE_DECREASE' | 'FREQUENCY_CHANGE' | 'ROUTE_CHANGE' | 'SUBSTITUTION';
  previousValue?: string;
  newValue?: string;
  reason?: string;
  confidence: number;
}

export interface FollowUpInstruction {
  provider?: string;
  specialty?: string;
  facility?: string;
  timeframe: string; // "2 weeks", "1 month", etc.
  reason?: string;
  phone?: string;
  appointmentScheduled?: boolean;
  appointmentDate?: string;
  confidence: number;
}

// =============================================================================
// CONSULTATION NOTE EXTRACTION
// =============================================================================

export interface ConsultationNoteExtraction {
  documentType: 'CONSULTATION_NOTE';
  
  patient: PatientInfo;
  
  // Consultation details
  consultDate: string;
  consultationType?: 'INITIAL' | 'FOLLOW_UP' | 'URGENT' | 'ROUTINE';
  requestingProvider?: ProviderInfo;
  consultingProvider: ProviderInfo;
  facility?: FacilityInfo;
  
  // Reason for consultation
  reasonForConsult: string;
  
  // Clinical content
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  
  // Review of systems
  reviewOfSystems?: {
    [system: string]: string;
  };
  
  // Physical exam
  physicalExam?: {
    general?: string;
    vitals?: VitalSigns;
    [system: string]: string | VitalSigns | undefined;
  };
  
  // Assessment
  diagnoses: DiagnosisEntry[];
  differentialDiagnoses?: DiagnosisEntry[];
  
  // Plan
  plan?: string;
  recommendedTests?: string[];
  recommendedProcedures?: ProcedureEntry[];
  recommendedMedications?: MedicationEntry[];
  
  // Follow-up
  followUp?: FollowUpInstruction[];
  
  // Metadata
  _metadata: ExtractionMetadata;
}

// =============================================================================
// PRESCRIPTION EXTRACTION
// =============================================================================

export interface PrescriptionExtraction {
  documentType: 'PRESCRIPTION';
  
  patient: PatientInfo;
  prescriber: ProviderInfo;
  pharmacy?: FacilityInfo;
  
  prescriptionDate: string;
  
  medications: PrescriptionMedication[];
  
  // DEA number (for controlled substances)
  deaNumber?: string;
  
  // Metadata
  _metadata: ExtractionMetadata;
}

export interface PrescriptionMedication extends MedicationEntry {
  quantity?: number;
  quantityUnit?: string;
  daysSupply?: number;
  refills?: number;
  refillsRemaining?: number;
  dispenseAsWritten?: boolean;
  priorAuthorizationNumber?: string;
}

// =============================================================================
// RADIOLOGY REPORT EXTRACTION
// =============================================================================

export interface RadiologyReportExtraction {
  documentType: 'RADIOLOGY_REPORT';
  
  patient: PatientInfo;
  orderingProvider?: ProviderInfo;
  radiologist: ProviderInfo;
  facility?: FacilityInfo;
  
  // Study details
  studyDate: string;
  studyType: string; // "CT", "MRI", "X-Ray", "Ultrasound", etc.
  bodyPart?: string;
  laterality?: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'N/A';
  
  // Order info
  accessionNumber?: string;
  orderNumber?: string;
  
  // Clinical info
  indication?: string;
  clinicalHistory?: string;
  comparison?: string; // Prior studies compared
  
  // Technique
  technique?: string;
  contrastUsed?: boolean;
  contrastType?: string;
  
  // Findings
  findings: string;
  
  // Structured findings (if extractable)
  structuredFindings?: RadiologyFinding[];
  
  // Impression
  impression: string;
  
  // Recommendations
  recommendations?: string[];
  
  // Critical findings
  criticalFinding?: boolean;
  criticalFindingCommunicated?: boolean;
  criticalFindingCommunicatedTo?: string;
  criticalFindingCommunicatedAt?: string;
  
  // Metadata
  _metadata: ExtractionMetadata;
}

export interface RadiologyFinding {
  anatomicLocation: string;
  finding: string;
  size?: string;
  characteristics?: string[];
  impression?: 'NORMAL' | 'ABNORMAL' | 'UNCHANGED' | 'IMPROVED' | 'WORSENED' | 'NEW';
  confidence: number;
}

// =============================================================================
// CONSENT FORM EXTRACTION
// =============================================================================

export interface ConsentFormExtraction {
  documentType: 'CONSENT_FORM';
  
  patient: PatientInfo;
  
  // Consent details
  consentType: 'GENERAL' | 'PROCEDURE' | 'SURGERY' | 'ANESTHESIA' | 'RESEARCH' | 'HIPAA' | 'OTHER';
  consentFor?: string; // Specific procedure or treatment
  
  // Provider info
  provider?: ProviderInfo;
  facility?: FacilityInfo;
  
  // Content
  risksDisclosed?: string[];
  benefitsDisclosed?: string[];
  alternativesDisclosed?: string[];
  
  // Signatures
  patientSignature?: {
    signed: boolean;
    signatureDate?: string;
    signatureTime?: string;
    signedBy?: string; // If signed by representative
    relationship?: string; // Relationship to patient if not patient
  };
  
  witnessSignature?: {
    signed: boolean;
    signatureDate?: string;
    witnessName?: string;
  };
  
  providerSignature?: {
    signed: boolean;
    signatureDate?: string;
    providerName?: string;
  };
  
  // Additional info
  interpreterUsed?: boolean;
  interpreterLanguage?: string;
  
  // Metadata
  _metadata: ExtractionMetadata;
}

// =============================================================================
// CLINICAL TRIAL DOCUMENT EXTRACTION
// =============================================================================

export interface ClinicalTrialExtraction {
  documentType: 'CLINICAL_TRIAL';
  
  patient: PatientInfo;
  
  // Trial information
  trialName?: string;
  trialId?: string; // NCT number
  sponsor?: string;
  principalInvestigator?: ProviderInfo;
  site?: FacilityInfo;
  
  // Enrollment
  enrollmentDate?: string;
  randomizationDate?: string;
  treatmentArm?: string;
  
  // Consent
  consentDate?: string;
  consentVersion?: string;
  
  // Visit information (if visit-specific document)
  visitDate?: string;
  visitNumber?: string;
  visitType?: string;
  
  // Assessments
  adverseEvents?: AdverseEvent[];
  concomitantMedications?: MedicationEntry[];
  
  // Status
  participationStatus?: 'ENROLLED' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN' | 'SCREEN_FAILURE';
  withdrawalDate?: string;
  withdrawalReason?: string;
  
  // Metadata
  _metadata: ExtractionMetadata;
}

export interface AdverseEvent {
  description: string;
  onsetDate?: string;
  resolvedDate?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING' | 'DEATH';
  seriousness?: 'SERIOUS' | 'NON_SERIOUS';
  relatedness?: 'RELATED' | 'POSSIBLY_RELATED' | 'UNLIKELY_RELATED' | 'NOT_RELATED';
  outcome?: 'RECOVERED' | 'RECOVERING' | 'NOT_RECOVERED' | 'FATAL' | 'UNKNOWN';
  actionTaken?: string;
  confidence: number;
}

// =============================================================================
// PATHOLOGY REPORT EXTRACTION
// =============================================================================

export interface PathologyReportExtraction {
  documentType: 'PATHOLOGY_REPORT';
  
  patient: PatientInfo;
  orderingProvider?: ProviderInfo;
  pathologist: ProviderInfo;
  facility?: FacilityInfo;
  
  // Specimen info
  specimenCollectionDate: string;
  specimenReceivedDate?: string;
  reportDate: string;
  
  accessionNumber?: string;
  
  specimenType: string;
  specimenSource: string;
  
  // Clinical info
  clinicalHistory?: string;
  preoperativeDiagnosis?: string;
  
  // Gross description
  grossDescription?: string;
  
  // Microscopic description
  microscopicDescription?: string;
  
  // Diagnosis
  diagnosis: string;
  diagnoses?: DiagnosisEntry[];
  
  // Staging (for cancer)
  staging?: {
    tnmStage?: string;
    tStage?: string;
    nStage?: string;
    mStage?: string;
    grade?: string;
    marginStatus?: 'NEGATIVE' | 'POSITIVE' | 'CLOSE';
    lymphovascularInvasion?: boolean;
    perineuralInvasion?: boolean;
  };
  
  // Biomarkers / Special stains
  biomarkers?: {
    name: string;
    result: string;
    interpretation?: string;
  }[];
  
  // Additional testing recommended
  additionalTestingRecommended?: string[];
  
  // Metadata
  _metadata: ExtractionMetadata;
}

// =============================================================================
// OPERATIVE NOTE EXTRACTION
// =============================================================================

export interface OperativeNoteExtraction {
  documentType: 'OPERATIVE_NOTE';
  
  patient: PatientInfo;
  
  // Procedure details
  procedureDate: string;
  procedureStartTime?: string;
  procedureEndTime?: string;
  
  // Providers
  surgeon: ProviderInfo;
  assistant?: ProviderInfo;
  anesthesiologist?: ProviderInfo;
  
  facility?: FacilityInfo;
  operatingRoom?: string;
  
  // Diagnoses
  preoperativeDiagnosis: string;
  postoperativeDiagnosis: string;
  
  // Procedures
  procedures: ProcedureEntry[];
  
  // Anesthesia
  anesthesiaType?: 'GENERAL' | 'REGIONAL' | 'LOCAL' | 'SEDATION' | 'COMBINED';
  
  // Surgical details
  indication?: string;
  findings?: string;
  techniqueDescription?: string;
  
  // Specimens
  specimensRemoved?: string[];
  
  // Complications
  complications?: string;
  estimatedBloodLoss?: string;
  
  // Implants/devices
  implantsUsed?: {
    name: string;
    manufacturer?: string;
    serialNumber?: string;
    lotNumber?: string;
  }[];
  
  // Post-op
  drains?: string[];
  closureType?: string;
  dressingType?: string;
  
  // Patient condition
  conditionAtEnd?: 'STABLE' | 'CRITICAL' | 'GUARDED';
  dispositionFromOR?: string; // PACU, ICU, Floor
  
  // Metadata
  _metadata: ExtractionMetadata;
}

// =============================================================================
// PROGRESS NOTE EXTRACTION
// =============================================================================

export interface ProgressNoteExtraction {
  documentType: 'PROGRESS_NOTE';
  
  patient: PatientInfo;
  provider: ProviderInfo;
  facility?: FacilityInfo;
  
  noteDate: string;
  noteTime?: string;
  noteType?: 'DAILY' | 'WEEKLY' | 'ADMISSION' | 'TRANSFER' | 'OTHER';
  
  // SOAP format (if applicable)
  subjective?: string;
  objective?: {
    vitals?: VitalSigns;
    physicalExam?: string;
    labResults?: string;
    imaging?: string;
  };
  assessment?: string;
  plan?: string;
  
  // Or free-form
  narrativeNote?: string;
  
  // Current diagnoses
  diagnoses?: DiagnosisEntry[];
  
  // Current medications
  medications?: MedicationEntry[];
  
  // Orders
  newOrders?: string[];
  
  // Metadata
  _metadata: ExtractionMetadata;
}

// =============================================================================
// UNION TYPE FOR ALL EXTRACTIONS
// =============================================================================

export type DocumentExtractionData =
  | LabResultExtraction
  | DischargeSummaryExtraction
  | ConsultationNoteExtraction
  | PrescriptionExtraction
  | RadiologyReportExtraction
  | ConsentFormExtraction
  | ClinicalTrialExtraction
  | PathologyReportExtraction
  | OperativeNoteExtraction
  | ProgressNoteExtraction;

// =============================================================================
// OCR TYPES
// =============================================================================

export interface OcrPage {
  pageNumber: number;
  width: number;
  height: number;
  text: string;
  blocks: OcrBlock[];
  tables?: OcrTable[];
}

export interface OcrBlock {
  id: string;
  type: 'LINE' | 'WORD' | 'PARAGRAPH' | 'HEADER' | 'FOOTER' | 'TABLE' | 'FORM_FIELD';
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  children?: OcrBlock[];
}

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface OcrTable {
  id: string;
  pageNumber: number;
  rowCount: number;
  columnCount: number;
  cells: OcrTableCell[];
  title?: string;
  confidence: number;
}

export interface OcrTableCell {
  rowIndex: number;
  columnIndex: number;
  rowSpan: number;
  columnSpan: number;
  text: string;
  isHeader: boolean;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface OcrKeyValuePair {
  key: string;
  value: string;
  keyConfidence: number;
  valueConfidence: number;
  keyBoundingBox: BoundingBox;
  valueBoundingBox: BoundingBox;
}

// =============================================================================
// MEDICAL ENTITY TYPES (from NER)
// =============================================================================

export interface MedicalEntities {
  medications: ExtractedMedication[];
  diagnoses: ExtractedDiagnosis[];
  procedures: ExtractedProcedure[];
  anatomyTerms: ExtractedAnatomy[];
  labTests: ExtractedLabTest[];
  protectedHealthInfo: ExtractedPHI[];
}

export interface ExtractedMedication {
  text: string;
  normalizedText?: string;
  rxnormCode?: string;
  category: 'MEDICATION' | 'BRAND_NAME' | 'GENERIC_NAME';
  attributes: {
    dosage?: string;
    frequency?: string;
    route?: string;
    strength?: string;
    duration?: string;
  };
  confidence: number;
  offset: { start: number; end: number };
}

export interface ExtractedDiagnosis {
  text: string;
  normalizedText?: string;
  icdCode?: string;
  snomedCode?: string;
  category: 'DIAGNOSIS' | 'SYMPTOM' | 'SIGN';
  traits: {
    negation?: boolean;
    hypothetical?: boolean;
    familyHistory?: boolean;
  };
  confidence: number;
  offset: { start: number; end: number };
}

export interface ExtractedProcedure {
  text: string;
  normalizedText?: string;
  cptCode?: string;
  snomedCode?: string;
  confidence: number;
  offset: { start: number; end: number };
}

export interface ExtractedAnatomy {
  text: string;
  normalizedText?: string;
  snomedCode?: string;
  confidence: number;
  offset: { start: number; end: number };
}

export interface ExtractedLabTest {
  text: string;
  normalizedText?: string;
  loincCode?: string;
  value?: string;
  unit?: string;
  confidence: number;
  offset: { start: number; end: number };
}

export interface ExtractedPHI {
  text: string;
  category: 'NAME' | 'DATE' | 'ADDRESS' | 'PHONE' | 'EMAIL' | 'SSN' | 'MRN' | 'ACCOUNT_NUMBER' | 'OTHER';
  confidence: number;
  offset: { start: number; end: number };
}
