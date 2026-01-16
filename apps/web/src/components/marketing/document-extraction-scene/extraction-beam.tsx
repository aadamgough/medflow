"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

interface ExtractionBeamProps {
  progress: MotionValue<number>;
}

export function ExtractionBeam({ progress }: ExtractionBeamProps) {
  const opacity = useTransform(progress, [0.15, 0.25, 0.85, 0.95], [0, 0.6, 0.6, 0]);
  const pathLength = useTransform(progress, [0.15, 0.9], [0, 1]);

  return (
    <motion.div
      style={{ opacity }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none"
    >
      <svg
        viewBox="0 0 400 200"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0369A1" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0.1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Multiple flowing lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.path
            key={i}
            d={`M 120 ${80 + i * 15} Q 200 ${100 + i * 5} 280 ${90 + i * 10}`}
            fill="none"
            stroke="url(#beamGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#glow)"
            style={{ pathLength }}
            initial={{ pathLength: 0 }}
          />
        ))}

        {/* Particle dots */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.circle
            key={`particle-${i}`}
            r="3"
            fill="#0EA5E9"
            filter="url(#glow)"
            style={{
              opacity: useTransform(
                progress,
                [0.2 + i * 0.1, 0.25 + i * 0.1, 0.3 + i * 0.1],
                [0, 1, 0]
              ),
              cx: useTransform(
                progress,
                [0.2 + i * 0.1, 0.35 + i * 0.1],
                [140, 260]
              ),
              cy: useTransform(
                progress,
                [0.2 + i * 0.1, 0.35 + i * 0.1],
                [90 + (i % 3) * 20, 100 + (i % 3) * 15]
              ),
            }}
          />
        ))}
      </svg>
    </motion.div>
  );
}
