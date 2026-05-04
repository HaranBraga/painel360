"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Table2 } from "lucide-react";

const tabs = [
  { href: "/relatorios",        label: "Resumo",  icon: LayoutDashboard },
  { href: "/relatorios/tabela", label: "Tabela",  icon: Table2 },
];

export function RelatoriosTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-1 px-6 bg-white border-b border-gray-100">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = t.href === "/relatorios"
          ? path === "/relatorios"
          : path === t.href || path?.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon size={14} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
