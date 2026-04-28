import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairScan AI Bias Detection",
  description: "Find hidden bias in your AI systems. Upload a dataset, get a fairness audit in 30 seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}