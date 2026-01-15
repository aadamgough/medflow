import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo Icon - Boxy medical/flow symbol */}
      <div className={cn("relative", sizes[size])}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Gradient definitions - Medical Blue */}
          <defs>
            <linearGradient
              id="logoGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#0369A1" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>
          </defs>
          
          {/* Boxy M shape */}
          <rect x="4" y="8" width="8" height="24" fill="url(#logoGradient)" />
          <rect x="16" y="8" width="8" height="24" fill="url(#logoGradient)" />
          <rect x="28" y="8" width="8" height="24" fill="url(#logoGradient)" />
          <rect x="8" y="8" width="12" height="8" fill="url(#logoGradient)" />
          <rect x="20" y="8" width="12" height="8" fill="url(#logoGradient)" />
        </svg>
      </div>

      {showText && (
        <span className={cn("font-semibold tracking-tight", textSizes[size])}>
          <span className="text-foreground">Med</span>
          <span className="gradient-text">Flow</span>
        </span>
      )}
    </div>
  );
}
