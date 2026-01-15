"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  index?: number;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  index = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        "group relative p-6 bg-card border-2 border-border",
        "hover:border-primary transition-all duration-300",
        className
      )}
    >
      <div className="relative z-10">
        {/* Icon container */}
        <div className="inline-flex items-center justify-center w-12 h-12 border-2 border-primary text-primary mb-4">
          <Icon className="h-6 w-6" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
