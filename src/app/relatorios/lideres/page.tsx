"use client";
import { useState, useEffect, useMemo } from "react";
import { Printer, Search } from "lucide-react";
import { RelatoriosTabs } from "@/components/layout/RelatoriosTabs";

type Item = { id: string; name: string; roleLabel: string; count: number };
type Section = { key: string; label: string; items: Item[] };

const ITEMS_PER_PAGE = 100;

type Block = {
  sectionLabel: string;
  sectionTotalCount: number;
  sectionTotalPeople: number;
  items: Item[];
  startIdx: number;
  isFirstChunk: boolean;
  isLastChunkOfSection: boolean;
};

export default function RelatoriosLideresPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/relatorios/lideres")
      .then(r => r.json())
      .then(d => { setSections(d.sections ?? []); setLoading(false); });
  }, []);

  const filteredSections = useMemo<Section[]>(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.map(s => ({
      ...s,
      items: s.items.filter(l => l.name.toLowerCase().includes(q)),
    }));
  }, [sections, search]);

  // Cada seção vira N blocos de até ITEMS_PER_PAGE itens. Cada bloco vira uma
  // folha A4 no PDF (forçamos page-break entre blocos pra que cada seção comece
  // numa folha nova e continue na próxima quando passar do limite).
  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = [];
    for (const sec of filteredSections) {
      if (sec.items.length === 0) continue;
      const totalCount = sec.items.reduce((s, l) => s + l.count, 0);
      const chunks = Math.max(1, Math.ceil(sec.items.length / ITEMS_PER_PAGE));
      for (let i = 0; i < chunks; i++) {
        const start = i * ITEMS_PER_PAGE;
        out.push({
          sectionLabel: sec.label,
          sectionTotalCount: totalCount,
          sectionTotalPeople: sec.items.length,
          items: sec.items.slice(start, start + ITEMS_PER_PAGE),
          startIdx: start,
          isFirstChunk: i === 0,
          isLastChunkOfSection: i === chunks - 1,
        });
      }
    }
    return out;
  }, [filteredSections]);

  const totalPessoas = filteredSections.reduce((s, sec) => s + sec.items.length, 0);
  const totalApoiadores = filteredSections.reduce(
    (s, sec) => s + sec.items.reduce((a, b) => a + b.count, 0), 0
  );
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="flex flex-col h-screen print:h-auto print:block">
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Apoiadores diretos por líder/coordenador</p>
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
          {totalPessoas.toLocaleString("pt-BR")} pessoa(s) · {totalApoiadores.toLocaleString("pt-BR")} apoiador(es)
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 print:bg-white print:overflow-visible">
        <div className="max-w-6xl mx-auto p-6 print:p-0 print:max-w-full">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
          ) : blocks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center py-20 text-gray-400 text-sm">Nenhum resultado</div>
          ) : (
            blocks.map((blk, blkIdx) => {
              const isLastBlock = blkIdx === blocks.length - 1;
              return (
                <div key={blkIdx}
                  className={`report-page bg-white border border-gray-200 rounded-xl p-6 mb-6 print:border-0 print:rounded-none print:p-0 print:mb-0 ${isLastBlock ? "" : "print:break-after-page"}`}>

                  {/* Cabeçalho do relatório só na 1ª folha de tudo */}
                  {blkIdx === 0 && (
                    <div className="mb-3 print:mb-2 print:pb-2 print:border-b print:border-gray-300">
                      <h2 className="text-lg font-bold text-gray-900 print:text-base">Apoiadores diretos por líder</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Gerado em {hoje} · {totalPessoas.toLocaleString("pt-BR")} pessoa(s) · {totalApoiadores.toLocaleString("pt-BR")} apoiador(es) no total
                      </p>
                    </div>
                  )}

                  {/* Título da seção (cada folha que começa uma seção mostra; continuação mostra com "(continuação)") */}
                  <div className="mb-2 pb-1 border-b-2 border-gray-300">
                    <h3 className="text-base font-bold text-gray-900 flex items-baseline justify-between gap-2 print:text-sm">
                      <span>
                        {blk.sectionLabel}
                        {!blk.isFirstChunk && <span className="text-xs font-normal text-gray-500 ml-1">(continuação)</span>}
                      </span>
                      <span className="text-xs font-normal text-gray-500">
                        {blk.sectionTotalPeople.toLocaleString("pt-BR")} pessoa(s) · {blk.sectionTotalCount.toLocaleString("pt-BR")} apoiador(es)
                      </span>
                    </h3>
                  </div>

                  <div className="report-cols">
                    {blk.items.map((l, i) => {
                      const idxInSection = blk.startIdx + i;
                      return (
                        <div key={l.id}
                          className={`report-row flex items-baseline gap-2 px-2 py-1 ${idxInSection % 2 === 1 ? "bg-gray-100 print:bg-gray-200" : "bg-white"}`}>
                          <span className="text-[10px] text-gray-500 tabular-nums w-7 shrink-0">{idxInSection + 1}</span>
                          <span className="flex-1 text-sm text-gray-900 truncate print:text-[11px]" title={l.name}>{l.name}</span>
                          <span className="font-semibold text-gray-900 tabular-nums text-sm print:text-[11px]">
                            {l.count.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2 border-t-2 border-gray-300 flex items-baseline justify-between print:mt-2 print:text-[10px]">
                    <span className="text-[11px] text-gray-500">
                      Página {blkIdx + 1} de {blocks.length}
                    </span>
                    {isLastBlock ? (
                      <span className="font-bold text-gray-900 tabular-nums text-base print:text-sm">
                        Total geral: {totalApoiadores.toLocaleString("pt-BR")} apoiador(es)
                      </span>
                    ) : blk.isLastChunkOfSection ? (
                      <span className="text-[11px] text-gray-400">Fim de {blk.sectionLabel}</span>
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
          column-gap: 1.5rem;
          column-rule: 1px solid #e5e7eb;
        }
        .report-row {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        @media print {
          @page { margin: 1cm; size: A4 portrait; }
          html, body { background: white !important; }
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
