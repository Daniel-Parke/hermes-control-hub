import { Literata, EB_Garamond, Lora, Merriweather } from "next/font/google";

const literata = Literata({ variable: "--font-literata", subsets: ["latin"], display: "swap" });
const ebGaramond = EB_Garamond({ variable: "--font-eb-garamond", subsets: ["latin"], display: "swap" });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap" });
const merriweather = Merriweather({ variable: "--font-merriweather", weight: ["300", "400", "700"], subsets: ["latin"], display: "swap" });

export default function StoryWeaverLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${literata.variable} ${ebGaramond.variable} ${lora.variable} ${merriweather.variable}`}>
      {children}
    </div>
  );
}
