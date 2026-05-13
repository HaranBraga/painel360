"use client";
import { useState, useEffect, useMemo } from "react";
import { Printer, Search } from "lucide-react";
import { RelatoriosTabs } from "@/components/layout/RelatoriosTabs";

type Lider = { id: string; name: string; roleLabel: string; count: number };

// Qtd de linhas por folha A4 retrato (em pé) com 2 colunas e fonte ~11px.
// Calculado pra caber com folga mesmo na primeira página (que tem cabeçalho).
const ITEMS_PER_PAGE = 100;

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

  // Divide em "folhas" pra controlar a paginação no PDF.
  const pages = useMemo(() => {
    if (filtered.length === 0) return [[]] as Lider[][];
    const out: Lider[][] = [];
    for (let i = 0; i < filtered.length; i += ITEMS_PER_PAGE) {
      out.push(filtered.slice(i, i + ITEMS_PER_PAGE));
    }
    return out;
  }, [filtered]);

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
          <Printer size={14} /> Imprimir / PDF (A4 retrato)
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length.toLocaleString("pt-BR")} líder(es)
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 print:bg-white print:overflow-visible">
        <div className="max-w-6xl mx-auto p-6 print:p-0 print:max-w-full">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center py-20 text-gray-400 text-sm">Nenhum líder encontrado</div>
          ) : (
            pages.map((pageItems, pageIdx) => {
              const isLastPage = pageIdx === pages.length - 1;
              return (
                <div key={pageIdx}
                  className={`report-page bg-white border border-gray-200 rounded-xl p-6 mb-6 print:border-0 print:rounded-none print:p-0 print:mb-0 ${isLastPage ? "" : "print:break-after-page"}`}>

                  {pageIdx === 0 && (
                    <div className="mb-4 print:mb-3 print:pb-2 print:border-b print:border-gray-300">
                      <h2 className="text-lg font-bold text-gray-900 print:text-base">Líderes e pessoas na rede</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Gerado em {hoje} · {filtered.length.toLocaleString("pt-BR")} líder(es) · {totalRede.toLocaleString("pt-BR")} pessoas no total
                      </p>
                    </div>
                  )}

                  <div className="report-cols">
                    {pageItems.map((l, i) => {
                      const globalIdx = pageIdx * ITEMS_PER_PAGE + i;
                      return (
                        <div key={l.id}
                          className={`report-row flex items-baseline gap-2 px-2 py-1 ${globalIdx % 2 === 1 ? "bg-gray-100 print:bg-gray-200" : "bg-white"}`}>
                          <span className="text-[10px] text-gray-500 tabular-nums w-7 shrink-0">{globalIdx + 1}</span>
                          <span className="flex-1 text-sm text-gray-900 truncate print:text-[11px]" title={l.name}>{l.name}</span>
                          <span className="font-semibold text-gray-900 tabular-nums text-sm print:text-[11px]">
                            {l.count.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rodapé com numeração e total (total só na última folha) */}
                  <div className="mt-4 pt-3 border-t-2 border-gray-300 flex items-baseline justify-between print:mt-3 print:text-[10px]">
                    <span className="text-[11px] text-gray-500">
                      Página {pageIdx + 1} de {pages.length}
                    </span>
                    {isLastPage ? (
                      <span className="font-bold text-gray-900 tabular-nums text-base print:text-sm">
                        Total geral: {totalRede.toLocaleString("pt-BR")} pessoas
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">continua...</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx global>{`
        .report-cols {
          column-count: 2;
          column-gap: 2rem;
          column-rule: 1px solid #e5e7eb;
        }
        .report-row {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        @media print {
          @page { margin: 1cm; size: A4 portrait; }
          html, body { background: white !important; }
          /* Mantém as cores de fundo (zebra) ao gerar o PDF */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .report-cols {
            column-count: 2;
            column-gap: 1.5rem;
          }
          .report-row {
            padding-top: 1px;
            padding-bottom: 1px;
          }
          /* Quebra de folha entre páginas — força cada bloco numa folha A4 */
          .print\\:break-after-page {
            break-after: page;
            page-break-after: always;
          }
          .report-page {
            break-inside: avoid-page;
          }
        }
      `}</style>
    </div>
  );
}
