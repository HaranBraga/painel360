"use client";
import { useState, useEffect, useMemo } from "react";
import { Printer, Search } from "lucide-react";
import { RelatoriosTabs } from "@/components/layout/RelatoriosTabs";

type Lider = { id: string; name: string; roleLabel: string; count: number };

export default function RelatoriosLideresPage() {
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/relatorios/lideres")
      .then(r => r.json())
      .then(d => { setLideres(d.lideres ?? []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return lideres;
    const q = search.toLowerCase();
    return lideres.filter(l => l.name.toLowerCase().includes(q));
  }, [lideres, search]);

  const totalRede = filtered.reduce((s, l) => s + l.count, 0);
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="flex flex-col h-screen print:h-auto print:block">
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Líderes e quantidade de pessoas na rede</p>
        </div>
        <RelatoriosTabs />
      </header>

      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap print:hidden">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
          <Printer size={14} /> Imprimir / PDF
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length.toLocaleString("pt-BR")} líder(es)
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 print:bg-white print:overflow-visible">
        <div className="max-w-4xl mx-auto p-6 print:p-0 print:max-w-full">
          <div className="bg-white border border-gray-200 rounded-xl print:border-0 print:rounded-none">
            <div className="hidden print:block px-6 pt-6 pb-3 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">Líderes e quantidade de pessoas na rede</h1>
              <p className="text-xs text-gray-500 mt-1">Gerado em {hoje} · {filtered.length} líder(es) · {totalRede.toLocaleString("pt-BR")} pessoas no total</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Nenhum líder encontrado</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 print:bg-white">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-gray-600 uppercase px-4 py-2.5 w-12">#</th>
                    <th className="text-left text-[11px] font-semibold text-gray-600 uppercase px-4 py-2.5">Nome</th>
                    <th className="text-right text-[11px] font-semibold text-gray-600 uppercase px-4 py-2.5 w-32">Pessoas na rede</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => (
                    <tr key={l.id} className="border-b border-gray-100 last:border-0 print:break-inside-avoid">
                      <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2 text-gray-900">{l.name}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-800 tabular-nums">{l.count.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300 print:bg-white">
                  <tr>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase">Total</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 tabular-nums">{totalRede.toLocaleString("pt-BR")}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 1.2cm; size: A4; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
