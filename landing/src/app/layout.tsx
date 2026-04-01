import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Murtakaz — Strategy Execution Platform",
  description: "The unified platform for strategy execution, KPI governance, and performance management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
