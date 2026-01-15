export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #CBD5E1 1px, transparent 1px),
              linear-gradient(to bottom, #CBD5E1 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
        
        <div 
          className="absolute inset-0 animate-ripple-1"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94A3B8 1px, transparent 1px),
              linear-gradient(to bottom, #94A3B8 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 700px 700px at 20% 30%, black 0%, transparent 30%)',
            WebkitMaskImage: 'radial-gradient(ellipse 700px 700px at 20% 30%, black 0%, transparent 30%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-ripple-2"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94A3B8 1px, transparent 1px),
              linear-gradient(to bottom, #94A3B8 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 600px 600px at 35% 25%, black 0%, transparent 30%)',
            WebkitMaskImage: 'radial-gradient(ellipse 600px 600px at 35% 25%, black 0%, transparent 30%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-ripple-3"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94A3B8 1px, transparent 1px),
              linear-gradient(to bottom, #94A3B8 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 550px 550px at 35% 85%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 550px 550px at 35% 85%, black 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-ripple-4"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94A3B8 1px, transparent 1px),
              linear-gradient(to bottom, #94A3B8 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 650px 650px at 85% 25%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 650px 650px at 85% 25%, black 0%, transparent 70%)',
          }}
        />
      </div>
      
      <main className="flex-1 relative z-10">{children}</main>
    </div>
  );
}
