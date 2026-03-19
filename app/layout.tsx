import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A8N CRM",
  description: "Acceler8Now CRM",
  icons: {
    icon: "https://www.acceler8now.com/hubfs/acceler8now_2021/images/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
