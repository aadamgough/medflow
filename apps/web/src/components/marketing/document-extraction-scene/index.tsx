"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Container } from "@/components/shared/container";
import { FloatingDocument } from "./floating-document";
import { StructuredOutput } from "./structured-output";

export function DocumentExtractionScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const documentY = useTransform(scrollYProgress, [0.2, 0.8], [0, -15]);
  const extractionProgress = useTransform(scrollYProgress, [0.25, 0.65], [0, 1]);
  const sectionOpacity = useTransform(scrollYProgress, [0.1, 0.2, 0.7, 0.85], [0, 1, 1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[180vh]"
    >
      <div className="sticky top-0 min-h-screen flex flex-col justify-center py-8">
        <Container size="xl">
          <motion.div 
            style={{ opacity: sectionOpacity }}
            className="relative"
          >
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-3xl md:text-5xl lg:text-5xl font-serif">
                Watch your documents{" "}
                <span className="italic gradient-text">come to life</span>
              </h2>
              <p className="mt-3 text-muted-foreground text-base lg:text-lg max-w-2xl mx-auto">
                Extract structured data from any medical document in seconds
              </p>
            </div>

            <div className="relative flex flex-col lg:flex-row items-start justify-center gap-4 lg:gap-6">
              <motion.div
                style={{ y: documentY }}
                className="relative z-10 flex-shrink-0"
              >
                <FloatingDocument extractionProgress={extractionProgress} />
              </motion.div>

              <div className="flex-shrink-0">
                <StructuredOutput extractionProgress={extractionProgress} />
              </div>
            </div>
          </motion.div>
        </Container>
      </div>
    </section>
  );
}
