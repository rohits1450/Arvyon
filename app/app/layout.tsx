import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { WalletProvider } from "@/src/context/WalletContext";
import { Navbar } from "@/src/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arvyon — ZK-Verified Autonomous AI Agents",
  description:
    "Deploy AI agents that act on-chain, with every decision paired to a zero-knowledge proof of policy compliance.",
};

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
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        <WalletProvider>
          <Navbar />
          <main className="flex flex-1 flex-col">{children}</main>
          <Toaster position="bottom-right" />
        </WalletProvider>
      </body>
    </html>
  );
}
