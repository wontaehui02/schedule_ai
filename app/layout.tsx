import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Course Dashboard",
  description: "Incheon National University 2026-1 Course Dashboard",
};

import { MenuProvider } from "@/components/MenuContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex overflow-hidden bg-[#EDEEF1]">
        <MenuProvider>
          <Sidebar />
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </MenuProvider>
      </body>
    </html>
  );
}
