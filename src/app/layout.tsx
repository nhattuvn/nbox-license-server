import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NBOX License Server",
  description: "License verification server for NBOX Flow Render Automation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f0f11", color: "#e8e8ea" }}>
        {children}
      </body>
    </html>
  );
}
