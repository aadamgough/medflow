import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  product: [
    { label: "Features", href: "#features", disabled: true },
    { label: "Pricing", href: "#pricing", disabled: true },
    { label: "Security", href: "#security", disabled: true },
    { label: "Roadmap", href: "#roadmap", disabled: true },
  ],
  company: [
    { label: "About", href: "/about", disabled: true },
    { label: "Blog", href: "/blog", disabled: true },
    { label: "Careers", href: "/careers", disabled: true },
    { label: "Contact", href: "/contact", disabled: true },
  ],
  resources: [
    { label: "Documentation", href: "/docs", disabled: true },
    { label: "API Reference", href: "/api", disabled: true },
    { label: "Support", href: "/support", disabled: true },
    { label: "Status", href: "/status", disabled: true },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy", disabled: true },
    { label: "Terms of Service", href: "/terms", disabled: true },
    { label: "HIPAA Compliance", href: "/hipaa", disabled: true },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com", label: "Twitter", disabled: true },
  { icon: Github, href: "https://github.com", label: "GitHub", disabled: true },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn", disabled: true },
];

export function Footer() {
  return (
    <footer className="relative pt-16 pb-8 border-t border-border">
      <Container>
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Logo and description */}
          <div className="col-span-2">
            <Logo size="md" className="mb-4" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Transform medical records into actionable insights with
              AI-powered document processing.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  {link.disabled ? (
                    <span className="text-sm text-muted-foreground/50 cursor-not-allowed">
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  {link.disabled ? (
                    <span className="text-sm text-muted-foreground/50 cursor-not-allowed">
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  {link.disabled ? (
                    <span className="text-sm text-muted-foreground/50 cursor-not-allowed">
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  {link.disabled ? (
                    <span className="text-sm text-muted-foreground/50 cursor-not-allowed">
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MedFlow. All rights reserved.
          </p>

          {/* Social links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((link) =>
              link.disabled ? (
                <span
                  key={link.label}
                  className="text-muted-foreground/50 cursor-not-allowed"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </span>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </a>
              )
            )}
          </div>
        </div>
      </Container>
    </footer>
  );
}
