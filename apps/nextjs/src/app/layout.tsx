import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@acme/ui/components/sonner";
import { cn } from "@acme/ui/lib/utils";

import { AuthMenu } from "@/components/auth-menu";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { env } from "@/env";
import { TRPCReactProvider } from "@/trpc/react";

import "@/app/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.VERCEL_ENV === "production"
      ? "https://turbo.t3.gg"
      : "http://localhost:3000",
  ),
  title: "Turbo Kit",
  description: "Opinionated full-stack template for quickly bootstrapping a Next.js and turborepo app with tRPC, Drizzle, Shadcn/ui, Better Auth, and more.",
  openGraph: {
    title: "Turbo Kit",
    description: "Opinionated full-stack template for quickly bootstrapping a Next.js and turborepo app with tRPC, Drizzle, Shadcn/ui, Better Auth, and more.",
    url: "https://turbo-kit.vercel.app",
    siteName: "Turbo Kit",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jullerino",
    creator: "@jullerino",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
            <AuthMenu />
          </div>
          <TRPCReactProvider>{props.children}</TRPCReactProvider>
          <Toaster />
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
