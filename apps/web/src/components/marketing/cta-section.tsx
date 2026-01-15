"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";

export function CTASection() {
  return (
    <section className="relative py-24 md:py-32">
      <Container>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-4">
              Transform your{" "}
              <span className="italic gradient-text">medical workflow</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Use our API for seamless integration or get started with our intuitive dashboard
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" className="w-full sm:w-auto group" asChild>
              <Link href="/signup">
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              asChild
            >
              <Link href="#contact">Contact Sales</Link>
            </Button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
