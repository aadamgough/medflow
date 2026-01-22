/**
 * Classification Prompts
 *
 * LLM prompts for document type classification.
 */

export const CLASSIFICATION_SYSTEM_PROMPT = `You are a medical document classification expert. Your task is to analyze OCR-extracted text from medical documents and determine the document type.

You must classify documents into one of the following types:

1. LAB_RESULT - Laboratory test results including blood work, urinalysis, pathology panels
   - Key indicators: reference ranges, specimen type, collection date, test names (CBC, BMP, lipid panel), lab values with units

2. DISCHARGE_SUMMARY - Hospital discharge documentation
   - Key indicators: admission/discharge dates, hospital course, discharge diagnosis, discharge instructions, follow-up appointments

3. CONSULTATION_NOTE - Specialist consultation reports
   - Key indicators: reason for consultation, consulting physician, recommendations, assessment and plan

4. PRESCRIPTION - Medication prescriptions
   - Key indicators: Rx symbol, drug names, dosages, sig instructions, refill information, DEA number, dispense quantity

5. RADIOLOGY_REPORT - Imaging study reports (X-ray, CT, MRI, ultrasound)
   - Key indicators: technique, findings, impression, comparison to prior studies, radiologist signature

6. PATHOLOGY_REPORT - Tissue/biopsy analysis reports
   - Key indicators: specimen description, gross examination, microscopic examination, diagnosis, staging information

7. OPERATIVE_NOTE - Surgical procedure documentation
   - Key indicators: preoperative/postoperative diagnosis, procedure performed, anesthesia type, findings, complications

8. PROGRESS_NOTE - Clinical progress notes (SOAP notes, daily notes)
   - Key indicators: subjective/objective/assessment/plan format, vital signs, current medications, daily progress

9. CONSENT_FORM - Medical consent documentation
   - Key indicators: consent language, patient signature line, witness signature, risks/benefits disclosure

10. PATIENT_INTAKE - New patient registration forms
    - Key indicators: demographic information, insurance details, medical history questionnaire

11. INSURANCE_FORM - Insurance-related documents
    - Key indicators: policy numbers, claim information, authorization requests

12. REFERRAL - Patient referral documents
    - Key indicators: referring physician, reason for referral, urgency level

13. CLINICAL_TRIAL - Research study documentation
    - Key indicators: protocol number, informed consent for research, study visits, adverse event reporting

14. UNKNOWN - Use only when the document cannot be confidently classified

Respond in JSON format with the following structure:
{
  "document_type": "TYPE_NAME",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification decision",
  "alternative_types": [
    {"type": "TYPE_NAME", "confidence": 0.0-1.0}
  ]
}

Important guidelines:
- Consider the overall context and structure, not just individual keywords
- If multiple types seem possible, choose the most specific one
- Confidence should reflect certainty: >0.9 for clear matches, 0.7-0.9 for likely matches, <0.7 for uncertain
- Include up to 2 alternative types if confidence is below 0.85
- Use UNKNOWN only as a last resort when truly unclassifiable`;

export const CLASSIFICATION_USER_PROMPT = (ocrText: string): string => `Classify the following medical document:

---
${ocrText.slice(0, 8000)}
${ocrText.length > 8000 ? '\n[... text truncated ...]' : ''}
---

Provide your classification in JSON format.`;

export const CLASSIFICATION_FEW_SHOT_EXAMPLES = [
  {
    role: 'user' as const,
    content: `Classify the following medical document:

---
LABORATORY REPORT

Patient: John Smith    DOB: 01/15/1965    MRN: 123456
Collection Date: 03/15/2024    Report Date: 03/16/2024

COMPLETE BLOOD COUNT (CBC)
Test                Result    Reference Range    Flag
WBC                 7.2       4.5-11.0 K/uL
RBC                 4.8       4.5-5.5 M/uL
Hemoglobin          14.2      13.5-17.5 g/dL
Hematocrit          42.1      38.8-50.0 %
Platelet Count      245       150-400 K/uL

BASIC METABOLIC PANEL
Glucose             98        70-100 mg/dL
BUN                 15        7-20 mg/dL
Creatinine          1.1       0.7-1.3 mg/dL
Sodium              140       136-145 mEq/L
Potassium           4.2       3.5-5.0 mEq/L
---

Provide your classification in JSON format.`,
  },
  {
    role: 'assistant' as const,
    content: `{
  "document_type": "LAB_RESULT",
  "confidence": 0.98,
  "reasoning": "Document contains laboratory test results with clear reference ranges, test names (CBC, BMP), numerical values with units, collection and report dates, and standard lab report formatting.",
  "alternative_types": []
}`,
  },
  {
    role: 'user' as const,
    content: `Classify the following medical document:

---
DISCHARGE SUMMARY

Patient Name: Jane Doe
MRN: 789012
Admission Date: 03/10/2024
Discharge Date: 03/14/2024
Attending Physician: Dr. Robert Johnson, MD

ADMISSION DIAGNOSIS:
Community-acquired pneumonia

DISCHARGE DIAGNOSIS:
1. Community-acquired pneumonia, resolved
2. Type 2 diabetes mellitus

HOSPITAL COURSE:
Patient was admitted with fever, productive cough, and shortness of breath. Chest X-ray confirmed right lower lobe pneumonia. Started on IV antibiotics (ceftriaxone and azithromycin). Fever resolved by day 2. Transitioned to oral antibiotics on day 3. Oxygen requirements resolved.

DISCHARGE MEDICATIONS:
1. Azithromycin 250mg - take 1 tablet daily for 3 more days
2. Metformin 500mg - take 1 tablet twice daily with meals

FOLLOW-UP:
- PCP appointment in 1 week
- Repeat chest X-ray in 6 weeks
---

Provide your classification in JSON format.`,
  },
  {
    role: 'assistant' as const,
    content: `{
  "document_type": "DISCHARGE_SUMMARY",
  "confidence": 0.99,
  "reasoning": "Document is clearly a hospital discharge summary with admission/discharge dates, admission and discharge diagnoses, detailed hospital course narrative, discharge medications, and follow-up instructions.",
  "alternative_types": []
}`,
  },
];
