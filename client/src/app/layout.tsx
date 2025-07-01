import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { CallManagerProvider } from "@/components/CallManagerProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Power Dialer",
  description: "Power Dialer",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CallManagerProvider>
            {children}
            <Toaster richColors position="top-center" />
          </CallManagerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}