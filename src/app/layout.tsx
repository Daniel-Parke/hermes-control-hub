import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Control Hub | Hermes Agent",
  description: "Monitor, update, and control the essence of your AI agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-dark-950 text-white">
        <SidebarProvider>
          <div className="h-full flex flex-col lg:flex-row">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
              <MobileHeader />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
