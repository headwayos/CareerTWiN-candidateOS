import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";

const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code" });
const firaSans = Fira_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-fira-sans" });

export const metadata: Metadata = {
  title: "CareerTwin Candidate OS - Inspector",
  description: "Developer-native candidate operating system inspector",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${firaSans.variable} ${firaCode.variable} font-sans h-full bg-[#F0F9FF] text-[#0C4A6E]`}>
        {children}
      </body>
    </html>
  );
}
