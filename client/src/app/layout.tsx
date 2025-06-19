// app/layout.tsx or app/layout.ts (Next.js App Router)
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner" // ✅ updated import

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "9x Fold Power Dialer",
  description: "Professional power dialer application for 9x Fold",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
