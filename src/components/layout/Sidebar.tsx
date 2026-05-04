"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Settings, Grid3X3, Star, BarChart3 } from "lucide-react";

const nav = [
  { href: "/pessoas",       label: "Pessoas",        icon: Users     },
  { href: "/score",         label: "Score",          icon: Star      },
  { href: "/relatorios",    label: "Relatórios",     icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações",  icon: Settings  },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex flex-col w-60 bg-white border-r border-gray-200 shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Grid3X3 size={16} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg">Painel 360</span>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Painel 360 v0.1</p>
      </div>
    </aside>
  );
}
