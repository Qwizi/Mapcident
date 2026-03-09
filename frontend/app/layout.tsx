import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/Navbar"
import { Toaster } from "@/components/ui/sonner"

// Layout uses cookies() → must never be statically cached
export const dynamic = "force-dynamic"

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "MapCident",
  description: "System zgłaszania problemów miejskich",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className="dark">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <Navbar />
        <main>{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
