import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/sidebar"
import { getAllChats } from "@/lib/db"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const chats = getAllChats()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        fontSans.variable
      )}
    >
      <body>
        <ThemeProvider>
          <div className="flex h-svh w-full overflow-hidden">
            {/* 1. Left column: Sidebar */}
            <Sidebar initialChats={chats} />

            {/* 2. Right column: Header + Main chat */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <SiteHeader />
              <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
