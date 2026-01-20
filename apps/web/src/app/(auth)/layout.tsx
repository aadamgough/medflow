export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Dense dot grid background with subtle ripple */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dense dot grid - smaller spacing, more dots */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at center, #64748B 0.75px, transparent 0.75px)`,
            backgroundSize: '8px 8px',
            opacity: 0.45,
          }}
        />
        
        {/* Very subtle animated ripple glow */}
        <div 
          className="absolute inset-0 animate-subtle-ripple"
          style={{
            background: `radial-gradient(ellipse 600px 400px at 30% 40%, rgba(3, 105, 161, 0.03) 0%, transparent 50%)`,
          }}
        />
        <div 
          className="absolute inset-0 animate-subtle-ripple-2"
          style={{
            background: `radial-gradient(ellipse 500px 350px at 70% 60%, rgba(14, 165, 233, 0.025) 0%, transparent 50%)`,
          }}
        />
        
        {/* Soft radial vignette - subtle fade at edges */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 120% 100% at 50% 50%, transparent 0%, var(--background) 90%)`,
          }}
        />
        
        {/* Checkered border margins - Hex.tech style */}
        <div className="checkered-border-left" />
        <div className="checkered-border-right" />
        <div className="checkered-border-top" />
        <div className="checkered-border-bottom" />
      </div>
      
      <main className="flex-1 relative z-10">{children}</main>
    </div>
  );
}
