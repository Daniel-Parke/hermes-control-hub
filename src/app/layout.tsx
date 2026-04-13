import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Literata, EB_Garamond, Lora, Merriweather } from "next/font/google";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], display: "swap" });
const ebGaramond = EB_Garamond({ variable: "--font-eb-garamond", subsets: ["latin"], display: "swap" });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap" });
const merriweather = Merriweather({ variable: "--font-merriweather", weight: ["300", "400", "700"], subsets: ["latin"], display: "swap" });

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
      className={`${inter.variable} ${jetbrainsMono.variable} ${literata.variable} ${ebGaramond.variable} ${lora.variable} ${merriweather.variable} h-full antialiased`}
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
