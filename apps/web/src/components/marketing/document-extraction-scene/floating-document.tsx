"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

interface FloatingDocumentProps {
  extractionProgress: MotionValue<number>;
}

// Extensive medical document content
const documentLines = [
  { id: 1, type: "header", text: "DISCHARGE SUMMARY", extractable: false },
  { id: 2, type: "spacer", text: "", extractable: false },
  { id: 3, type: "row", text: "Community Medical Center", extractable: false },
  { id: 4, type: "row", text: "Department of Internal Medicine", extractable: false },
  { id: 5, type: "spacer", text: "", extractable: false },
  { id: 6, type: "divider", text: "", extractable: false },
  { id: 7, type: "spacer", text: "", extractable: false },
  { id: 8, type: "label", text: "PATIENT INFORMATION", extractable: false },
  { id: 9, type: "field", text: "Name: John Michael Anderson", extractable: true, field: "name" },
  { id: 10, type: "field", text: "Date of Birth: March 15, 1958 (Age: 65)", extractable: true, field: "dob" },
  { id: 11, type: "field", text: "Medical Record #: MRN-2024-0847291", extractable: true, field: "mrn" },
  { id: 12, type: "field", text: "Attending Physician: Dr. Sarah Chen, MD", extractable: false },
  { id: 13, type: "spacer", text: "", extractable: false },
  { id: 14, type: "label", text: "ADMISSION DETAILS", extractable: false },
  { id: 15, type: "field", text: "Date of Admission: January 10, 2024", extractable: true, field: "admission" },
  { id: 16, type: "field", text: "Date of Discharge: January 14, 2024", extractable: true, field: "discharge" },
  { id: 17, type: "field", text: "Length of Stay: 4 days", extractable: true, field: "los" },
  { id: 18, type: "field", text: "Admission Type: Emergency", extractable: false },
  { id: 19, type: "spacer", text: "", extractable: false },
  { id: 20, type: "divider", text: "", extractable: false },
  { id: 21, type: "spacer", text: "", extractable: false },
  { id: 22, type: "label", text: "PRINCIPAL DIAGNOSIS", extractable: false },
  { id: 23, type: "diagnosis", text: "Type 2 Diabetes Mellitus, uncontrolled (E11.65)", extractable: true, field: "dx1" },
  { id: 24, type: "spacer", text: "", extractable: false },
  { id: 25, type: "label", text: "SECONDARY DIAGNOSES", extractable: false },
  { id: 26, type: "diagnosis", text: "Essential Hypertension, Stage 2 (I10)", extractable: true, field: "dx2" },
  { id: 27, type: "diagnosis", text: "Acute Kidney Injury, resolved (N17.9)", extractable: true, field: "dx3" },
  { id: 28, type: "diagnosis", text: "Hyperlipidemia, mixed (E78.2)", extractable: true, field: "dx4" },
  { id: 29, type: "diagnosis", text: "Obesity, BMI 32.4 (E66.9)", extractable: true, field: "dx5" },
  { id: 30, type: "spacer", text: "", extractable: false },
  { id: 31, type: "divider", text: "", extractable: false },
  { id: 32, type: "spacer", text: "", extractable: false },
  { id: 33, type: "label", text: "DISCHARGE MEDICATIONS", extractable: false },
  { id: 34, type: "medication", text: "1. Metformin 1000mg PO BID with meals", extractable: true, field: "med1" },
  { id: 35, type: "medication", text: "2. Lisinopril 20mg PO daily", extractable: true, field: "med2" },
  { id: 36, type: "medication", text: "3. Atorvastatin 40mg PO QHS", extractable: true, field: "med3" },
  { id: 37, type: "medication", text: "4. Aspirin 81mg PO daily", extractable: true, field: "med4" },
  { id: 38, type: "medication", text: "5. Lantus 20 units SC QHS", extractable: true, field: "med5" },
  { id: 39, type: "spacer", text: "", extractable: false },
  { id: 40, type: "divider", text: "", extractable: false },
  { id: 41, type: "spacer", text: "", extractable: false },
  { id: 42, type: "label", text: "HOSPITAL COURSE", extractable: false },
  { id: 43, type: "text", text: "Patient presented to ED with polyuria, polydipsia, and fatigue.", extractable: false },
  { id: 44, type: "text", text: "Initial labs notable for glucose 423, HbA1c 11.2%, Cr 1.8.", extractable: false },
  { id: 45, type: "text", text: "Started on IV insulin drip with transition to basal-bolus.", extractable: false },
  { id: 46, type: "text", text: "Kidney function improved with hydration. Cr at discharge: 1.1.", extractable: false },
  { id: 47, type: "spacer", text: "", extractable: false },
  { id: 48, type: "label", text: "FOLLOW-UP INSTRUCTIONS", extractable: false },
  { id: 49, type: "text", text: "• Primary Care: Within 7 days", extractable: false },
  { id: 50, type: "text", text: "• Endocrinology: 2 weeks", extractable: false },
  { id: 51, type: "text", text: "• Labs: BMP, HbA1c in 3 months", extractable: false },
];

export function FloatingDocument({ extractionProgress }: FloatingDocumentProps) {
  return (
    <div className="relative">
      {/* Main document */}
      <div className="relative bg-white w-[500px] md:w-[580px] lg:w-[640px] border border-border">
        {/* Document content */}
        <div className="py-8 px-10 space-y-0">
          {documentLines.map((line) => {
            const extractableLines = documentLines.filter(l => l.extractable);
            const extractableIndex = extractableLines.findIndex(l => l.id === line.id);
            const extractStart = extractableIndex >= 0 ? extractableIndex / extractableLines.length : 1;
            const extractEnd = extractableIndex >= 0 ? (extractableIndex + 1) / extractableLines.length : 1;
            
            return (
              <DocumentLine
                key={line.id}
                line={line}
                extractionProgress={extractionProgress}
                extractStart={extractStart}
                extractEnd={extractEnd}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DocumentLineProps {
  line: typeof documentLines[0];
  extractionProgress: MotionValue<number>;
  extractStart: number;
  extractEnd: number;
}

function DocumentLine({ line, extractionProgress, extractStart, extractEnd }: DocumentLineProps) {
  const opacity = useTransform(
    extractionProgress,
    line.extractable ? [extractStart, extractEnd] : [0, 1],
    line.extractable ? [1, 0.2] : [1, 1]
  );
  
  const highlightOpacity = useTransform(
    extractionProgress,
    line.extractable ? [Math.max(0, extractStart - 0.01), extractStart, extractStart + 0.04] : [0, 0, 0],
    line.extractable ? [0, 1, 0] : [0, 0, 0]
  );

  const getLineStyles = () => {
    switch (line.type) {
      case "header":
        return "text-center font-bold text-foreground text-xl tracking-wide h-10 flex items-center justify-center";
      case "label":
        return "font-semibold text-foreground text-sm uppercase tracking-wider h-7 flex items-center text-primary";
      case "field":
        return "text-foreground text-sm h-6 flex items-center";
      case "row":
        return "text-muted-foreground text-sm h-5 flex items-center justify-center";
      case "diagnosis":
        return "text-foreground text-sm h-6 flex items-center pl-4";
      case "medication":
        return "text-foreground text-sm h-6 flex items-center";
      case "text":
        return "text-muted-foreground text-sm h-6 flex items-center";
      case "divider":
        return "h-px bg-border";
      case "spacer":
        return "h-3";
      default:
        return "text-foreground text-sm h-6 flex items-center";
    }
  };

  if (line.type === "divider") {
    return <div className={getLineStyles()} />;
  }

  if (line.type === "spacer") {
    return <div className={getLineStyles()} />;
  }

  return (
    <motion.div className="relative" style={{ opacity }}>
      {line.extractable && (
        <motion.div
          className="absolute -inset-x-2 -inset-y-0.5 bg-primary/15"
          style={{ opacity: highlightOpacity }}
        />
      )}
      <span className={getLineStyles()}>{line.text}</span>
    </motion.div>
  );
}

export { documentLines };
