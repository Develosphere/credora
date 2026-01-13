export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
          C
        </div>
        <span className="text-2xl font-semibold">Credora</span>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        AI-powered CFO for e-commerce businesses
      </p>
    </div>
  );
}
