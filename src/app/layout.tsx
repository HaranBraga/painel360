import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Painel 360",
  description: "Gestão de rede de pessoas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
          <Sidebar />
          <main className="flex-1 overflow-auto print:overflow-visible">{children}</main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
