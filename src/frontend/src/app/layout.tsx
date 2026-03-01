import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VisionFlow | AI Video Processing",
  description: "Next-gen computer vision platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(
        inter.className, 
        "min-h-screen bg-[#F0F7FF] bg-gradient-to-br from-white via-[#F0F7FF] to-[#D7EFFF] text-slate-900"
      )}>
        <header className="border-b border-ice-blue/30 bg-white/50 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#D7EFFF] rounded-lg flex items-center justify-center border border-blue-200">
                <div className="w-4 h-4 bg-blue-500 rounded-sm animate-pulse" />
              </div>
              <span className="font-bold text-xl tracking-tight">Vision<span className="text-blue-600">Flow</span></span>
            </div>
            <nav className="text-sm font-medium text-slate-500">
              v1.0.0 Beta
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}