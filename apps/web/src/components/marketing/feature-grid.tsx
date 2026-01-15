"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  BarChart3,
  Zap,
  Code2,
} from "lucide-react";
import { Container } from "@/components/shared/container";

const sideFeatures = [
  {
    icon: Code2,
    title: "REST API",
    description: "Simple API endpoints to integrate query requests into your workflow.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    description: "Query patient records using natural language and get instant answers.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track processing metrics, extraction accuracy, and patient insights.",
  },
  {
    icon: Zap,
    title: "Real-time Processing",
    description: "Documents processed in seconds with instant structured output.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <Container>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-4">
            Everything you need to{" "}
            <span className="italic gradient-text">manage patient records</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            MedFlow provides a complete suite of tools for processing,
            organizing, and understanding medical documentation.
          </p>
        </motion.div>

        {/* Exa-style feature layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <h3 className="text-3xl font-serif text-foreground mb-2">Document Extraction</h3>
          <p className="text-muted-foreground">
            Upload any medical document and get accurate, structured JSON output automatically.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main feature - left side */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:w-[60%]"
          >
              {/* JSON output display */}
              <div className="relative rounded-lg overflow-hidden border border-border bg-[#1e1e1e] p-4 font-mono text-[13px] leading-relaxed">
                <pre className="overflow-x-auto">
                  <code>
                    <span className="text-[#d4d4d4]">{"{"}</span>{"\n"}
                    {"  "}<span className="text-[#9cdcfe]">&quot;patient&quot;</span><span className="text-[#d4d4d4]">: {"{"}</span>{"\n"}
                    {"    "}<span className="text-[#9cdcfe]">&quot;name&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;John M. Anderson&quot;</span><span className="text-[#d4d4d4]">,</span>{"\n"}
                    {"    "}<span className="text-[#9cdcfe]">&quot;dob&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;1958-03-15&quot;</span><span className="text-[#d4d4d4]">,</span>{"\n"}
                    {"    "}<span className="text-[#9cdcfe]">&quot;mrn&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;2024-0847291&quot;</span>{"\n"}
                    {"  "}<span className="text-[#d4d4d4]">{"}"},</span>{"\n"}
                    {"  "}<span className="text-[#9cdcfe]">&quot;visit&quot;</span><span className="text-[#d4d4d4]">: {"{"}</span>{"\n"}
                    {"    "}<span className="text-[#9cdcfe]">&quot;admitted&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;2024-01-10&quot;</span><span className="text-[#d4d4d4]">,</span>{"\n"}
                    {"    "}<span className="text-[#9cdcfe]">&quot;discharged&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;2024-01-14&quot;</span><span className="text-[#d4d4d4]">,</span>{"\n"}
                    {"    "}<span className="text-[#9cdcfe]">&quot;type&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Emergency&quot;</span>{"\n"}
                    {"  "}<span className="text-[#d4d4d4]">{"}"},</span>{"\n"}
                    {"  "}<span className="text-[#9cdcfe]">&quot;diagnoses&quot;</span><span className="text-[#d4d4d4]">: [</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;code&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;E11.65&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;description&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Type 2 Diabetes&quot;</span><span className="text-[#d4d4d4]"> {"}"},</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;code&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;I10&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;description&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Hypertension&quot;</span><span className="text-[#d4d4d4]"> {"}"},</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;code&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;N17.9&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;description&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Acute Kidney Injury&quot;</span><span className="text-[#d4d4d4]"> {"}"}</span>{"\n"}
                    {"  "}<span className="text-[#d4d4d4]">],</span>{"\n"}
                    {"  "}<span className="text-[#9cdcfe]">&quot;medications&quot;</span><span className="text-[#d4d4d4]">: [</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;name&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Metformin&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;dose&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;1000mg&quot;</span><span className="text-[#d4d4d4]"> {"}"},</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;name&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Lisinopril&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;dose&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;20mg&quot;</span><span className="text-[#d4d4d4]"> {"}"},</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;name&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Atorvastatin&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;dose&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;40mg&quot;</span><span className="text-[#d4d4d4]"> {"}"}</span>{"\n"}
                    {"  "}<span className="text-[#d4d4d4]">],</span>{"\n"}
                    {"  "}<span className="text-[#9cdcfe]">&quot;followUp&quot;</span><span className="text-[#d4d4d4]">: [</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;provider&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;PCP&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;timeframe&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;7 days&quot;</span><span className="text-[#d4d4d4]"> {"}"},</span>{"\n"}
                    {"    "}<span className="text-[#d4d4d4]">{"{"} </span><span className="text-[#9cdcfe]">&quot;provider&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;Endocrinology&quot;</span><span className="text-[#d4d4d4]">, </span><span className="text-[#9cdcfe]">&quot;timeframe&quot;</span><span className="text-[#d4d4d4]">: </span><span className="text-[#ce9178]">&quot;2 weeks&quot;</span><span className="text-[#d4d4d4]"> {"}"}</span>{"\n"}
                    {"  "}<span className="text-[#d4d4d4]">]</span>{"\n"}
                    <span className="text-[#d4d4d4]">{"}"}</span>
                  </code>
                </pre>
              </div>
          </motion.div>

          {/* Side features - right side */}
          <div className="lg:w-[40%] space-y-4">
            {sideFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-white/50 hover:bg-white hover:shadow-sm transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
