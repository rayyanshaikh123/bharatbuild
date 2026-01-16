import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BharatBuild - Enterprise Field Management",
  description: "Enterprise Field Management System for construction projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to avoid flash-of-incorrect-theme on first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='theme';var v=localStorage.getItem(k);if(v){document.documentElement.classList.toggle('dark',v==='dark')}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.toggle('dark',true)}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
      >
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
