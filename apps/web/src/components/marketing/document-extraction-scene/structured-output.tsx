"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

interface StructuredOutputProps {
  extractionProgress: MotionValue<number>;
}

const extractedData = [
  {
    id: "patient",
    label: "Patient",
    fields: [
      { key: "Name", value: "John Michael Anderson", delay: 0 },
      { key: "DOB", value: "March 15, 1958", delay: 0.04 },
      { key: "MRN", value: "2024-0847291", delay: 0.08 },
    ],
  },
  {
    id: "visit",
    label: "Visit",
    fields: [
      { key: "Admitted", value: "January 10, 2024", delay: 0.12 },
      { key: "Discharged", value: "January 14, 2024", delay: 0.16 },
      { key: "Length", value: "4 days", delay: 0.2 },
    ],
  },
  {
    id: "diagnoses",
    label: "Diagnoses",
    fields: [
      { key: "Primary", value: "Type 2 Diabetes (E11.65)", delay: 0.24 },
      { key: "Secondary", value: "Hypertension (I10)", delay: 0.30 },
      { key: "Secondary", value: "Acute Kidney Injury (N17.9)", delay: 0.36 },
      { key: "Secondary", value: "Hyperlipidemia (E78.2)", delay: 0.42 },
      { key: "Secondary", value: "Obesity (E66.9)", delay: 0.48 },
    ],
  },
  {
    id: "medications",
    label: "Medications",
    fields: [
      { key: "Metformin", value: "1000mg BID", delay: 0.54 },
      { key: "Lisinopril", value: "20mg daily", delay: 0.60 },
      { key: "Atorvastatin", value: "40mg QHS", delay: 0.66 },
      { key: "Aspirin", value: "81mg daily", delay: 0.72 },
      { key: "Lantus", value: "20 units QHS", delay: 0.78 },
    ],
  },
  {
    id: "followup",
    label: "Follow-up",
    fields: [
      { key: "Primary Care", value: "Within 7 days", delay: 0.84 },
      { key: "Endocrinology", value: "2 weeks", delay: 0.90 },
      { key: "Labs", value: "BMP, HbA1c in 3 months", delay: 0.96 },
    ],
  },
];

export function StructuredOutput({ extractionProgress }: StructuredOutputProps) {
  const containerOpacity = useTransform(extractionProgress, [0, 0.06], [0, 1]);
  
  return (
    <motion.div 
      className="w-[300px] md:w-[340px] lg:w-[380px] space-y-3"
      style={{ opacity: containerOpacity }}
    >
      {extractedData.map((section) => (
        <ExtractedCard
          key={section.id}
          section={section}
          extractionProgress={extractionProgress}
        />
      ))}
    </motion.div>
  );
}

interface ExtractedCardProps {
  section: typeof extractedData[0];
  extractionProgress: MotionValue<number>;
}

function ExtractedCard({ section, extractionProgress }: ExtractedCardProps) {
  const baseDelay = section.fields[0]?.delay ?? 0;
  
  const cardOpacity = useTransform(
    extractionProgress,
    [Math.max(0, baseDelay - 0.04), baseDelay],
    [0, 1]
  );
  
  const cardY = useTransform(
    extractionProgress,
    [Math.max(0, baseDelay - 0.04), baseDelay],
    [12, 0]
  );

  return (
    <motion.div
      className="relative bg-white border border-border p-4"
      style={{
        opacity: cardOpacity,
        y: cardY,
      }}
    >
      {/* Section Label */}
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 pb-2 border-b border-border">
        {section.label}
      </div>
      
      {/* Fields */}
      <div className="space-y-1.5">
        {section.fields.map((field, index) => (
          <ExtractedField
            key={`${field.key}-${index}`}
            field={field}
            extractionProgress={extractionProgress}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface ExtractedFieldProps {
  field: { key: string; value: string; delay: number };
  extractionProgress: MotionValue<number>;
}

function ExtractedField({ field, extractionProgress }: ExtractedFieldProps) {
  const opacity = useTransform(
    extractionProgress,
    [field.delay, field.delay + 0.05],
    [0, 1]
  );
  
  const x = useTransform(
    extractionProgress,
    [field.delay, field.delay + 0.05],
    [-8, 0]
  );

  return (
    <motion.div
      className="grid grid-cols-[100px_1fr] gap-3 items-baseline"
      style={{ opacity, x }}
    >
      <span className="text-muted-foreground text-xs">{field.key}</span>
      <span className="font-medium text-foreground text-sm text-right">{field.value}</span>
    </motion.div>
  );
}
