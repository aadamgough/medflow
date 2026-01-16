"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { User, Stethoscope, Pill, Activity } from "lucide-react";

interface ExtractedDataProps {
  progress: MotionValue<number>;
}

const extractedItems = [
  {
    id: "patient",
    icon: User,
    label: "Patient Info",
    items: ["John Smith", "DOB: 03/15/1965", "MRN: 847291"],
    startProgress: 0.15,
  },
  {
    id: "diagnosis",
    icon: Stethoscope,
    label: "Diagnoses",
    items: ["Type 2 Diabetes Mellitus", "Hypertension, Stage 2", "Chronic Kidney Disease, Stage 3"],
    startProgress: 0.30,
  },
  {
    id: "medication",
    icon: Pill,
    label: "Medications",
    items: ["Metformin 1000mg BID", "Lisinopril 20mg daily", "Amlodipine 10mg daily"],
    startProgress: 0.50,
  },
  {
    id: "procedure",
    icon: Activity,
    label: "Procedures",
    items: ["Cardiac catheterization", "Echocardiogram"],
    startProgress: 0.70,
  },
];

function ExtractedCard({ 
  item, 
  progress 
}: { 
  item: typeof extractedItems[0]; 
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(
    progress,
    [item.startProgress, item.startProgress + 0.1],
    [0, 1]
  );
  
  const x = useTransform(
    progress,
    [item.startProgress, item.startProgress + 0.15],
    [-50, 0]
  );

  const Icon = item.icon;

  return (
    <motion.div
      style={{ opacity, x }}
      className="bg-card border-2 border-border p-4 mb-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 border-2 border-primary flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-sm">{item.label}</span>
      </div>
      <ul className="space-y-1">
        {item.items.map((text, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0 }}
            style={{
              opacity: useTransform(
                progress,
                [item.startProgress + 0.05 + i * 0.03, item.startProgress + 0.1 + i * 0.03],
                [0, 1]
              ),
            }}
            className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30"
          >
            {text}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

export function ExtractedData({ progress }: ExtractedDataProps) {
  const containerOpacity = useTransform(progress, [0.1, 0.2], [0, 1]);

  return (
    <motion.div
      style={{ opacity: containerOpacity }}
      className="w-[280px] md:w-[320px]"
    >
      <div className="mb-4">
        <h3 className="font-serif text-lg font-semibold mb-1">
          <span className="gradient-text">Structured</span> Output
        </h3>
        <p className="text-xs text-muted-foreground">
          AI-extracted medical data
        </p>
      </div>

      {extractedItems.map((item) => (
        <ExtractedCard key={item.id} item={item} progress={progress} />
      ))}
    </motion.div>
  );
}
