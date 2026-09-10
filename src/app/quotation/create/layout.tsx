import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create quotation",
};

export default function QuotationCreateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
