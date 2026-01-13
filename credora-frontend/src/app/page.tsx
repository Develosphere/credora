import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  FileText,
  TrendingUp,
  Package,
  Calculator,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Automated P&L",
    description:
      "Real-time profit and loss statements pulled directly from your Shopify and ad platforms.",
  },
  {
    icon: TrendingUp,
    title: "Cash Forecasting",
    description:
      "Predict your cash runway with AI-powered forecasts across multiple scenarios.",
  },
  {
    icon: Package,
    title: "SKU Economics",
    description:
      "Understand true profitability per product including ad attribution and refunds.",
  },
  {
    icon: Calculator,
    title: "What-If Simulations",
    description:
      "Model the impact of pricing changes, ad spend adjustments, and inventory decisions.",
  },
  {
    icon: MessageSquare,
    title: "AI CFO Chat",
    description:
      "Ask questions about your finances and get instant, data-backed answers.",
  },
];

export default async function LandingPage() {
  // Check for existing session and validate it before redirecting
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token");

  if (sessionToken?.value) {
    // Validate the session token with the API
    try {
      const apiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/auth/session`, {
        headers: {
          Authorization: `Bearer ${sessionToken.value}`,
        },
        cache: "no-store",
      });

      // Only redirect if session is actually valid
      if (response.ok) {
        redirect("/dashboard");
      }
      // If session is invalid (401, etc.), continue to show landing page
      // The invalid cookie will be cleared when user logs in again
    } catch {
      // If API is unreachable, show landing page
      console.error("Failed to validate session");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="text-xl font-semibold">Credora</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          AI-powered CFO for
          <span className="text-primary"> e-commerce</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Connect your Shopify store and ad accounts. Get instant P&L
          statements, cash forecasts, and AI-driven insights to grow your
          business profitably.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border px-6 py-3 text-lg font-medium hover:bg-accent transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">
            Everything you need to understand your finances
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Stop guessing. Start knowing. Credora connects to your data sources
            and gives you clarity on what&apos;s working and what&apos;s not.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to take control?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join hundreds of e-commerce businesses using Credora to make
            smarter, data-driven decisions.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started for Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Credora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
