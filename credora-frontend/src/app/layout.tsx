import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CustomCursor } from "@/components/ui/CustomCursor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Credora - AI-powered CFO for E-commerce",
  description:
    "Automated P&L, cash forecasting, SKU economics, and what-if simulations for your e-commerce business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased cursor-none`}>
        <ThemeProvider defaultTheme="system" storageKey="credora-theme">
          <QueryProvider>
            <CustomCursor />
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
