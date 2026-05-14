"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Printer, Search, Filter, X } from "lucide-react";
import { RelatoriosTabs } from "@/components/layout/RelatoriosTabs";

type Item = { id: string; name: string; roleLabel: string; count: number };
type Section = { key: string; label: string; items: Item[] };

type StdFilter = { key: string; label: string; values: string[] };
type CfFilter = { key: string; label: string; type: string; values: string[] };
type FilterOptions = { standard: StdFilter[]; custom: CfFilter[] };

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
  const [filterOpts, setFilterOpts] = useState<FilterOptions>({ standard: [], custom: [] });

  // Filtros selecionados: chave do campo (std_cidade / cf_religiao) → valores escolhidos
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  // Carrega opções de filtro uma única vez
  useEffect(() => {
    fetch("/api/relatorios/lideres/filtros")
      .then(r => r.json())
      .then(d => setFilterOpts({ standard: d.standard ?? [], custom: d.custom ?? [] }))
      .catch(() => setFilterOpts({ standard: [], custom: [] }));
  }, []);

  // Refaz a query toda vez que filtros mudam — com debounce de 200ms pra
  // não disparar uma chamada a cada toggle de checkbox.
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, vals] of Object.entries(filters)) {
      for (const v of vals) params.append(k, v);
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/relatorios/lideres${params.toString() ? `?${params.toString()}` : ""}`, { signal: controller.signal })
        .then(r => r.json())
        .then(d => { setSections(d.sections ?? []); setLoading(false); })
        .catch(err => { if (err?.name !== "AbortError") setLoading(false); });
    }, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [filters]);

  const filteredSections = useMemo<Section[]>(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.map(s => ({
      ...s,
      items: s.items.filter(l => l.name.toLowerCase().includes(q)),
    }));
  }, [sections, search]);

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

  const activeFilterCount = Object.values(filters).reduce((n, vs) => n + vs.length, 0);

  // Lista dos filtros ativos pra exibir no cabeçalho do PDF
  const activeFilterChips = useMemo(() => {
    const labelByKey: Record<string, string> = {};
    for (const f of filterOpts.standard) labelByKey[`std_${f.key}`] = f.label;
    for (const f of filterOpts.custom)   labelByKey[`cf_${f.key}`]  = f.label;

    const chips: { label: string; values: string }[] = [];
    for (const [k, vs] of Object.entries(filters)) {
      if (!vs.length) continue;
      const display = vs.map(v => v === "true" ? "Sim" : v === "false" ? "Não" : v).join(", ");
      chips.push({ label: labelByKey[k] ?? k, values: display });
    }
    return chips;
  }, [filters, filterOpts]);

  function clearAll() { setFilters({}); }

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

        <FilterMenu options={filterOpts} filters={filters} setFilters={setFilters} />

        {activeFilterCount > 0 && (
          <button onClick={clearAll}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-2 py-1.5">
            <X size={12} /> Limpar filtros
          </button>
        )}

        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
          <Printer size={14} /> Imprimir / PDF
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          {totalPessoas.toLocaleString("pt-BR")} pessoa(s) · {totalApoiadores.toLocaleString("pt-BR")} apoiador(es)
        </span>
      </div>

      {/* Chips dos filtros ativos (visível tb. no print pra contextualizar o PDF) */}
      {activeFilterChips.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 flex-wrap text-xs print:bg-white print:border-gray-300">
          <span className="font-semibold text-amber-800 print:text-gray-700">Filtros ativos:</span>
          {activeFilterChips.map((c, i) => (
            <span key={i} className="bg-white border border-amber-200 rounded-full px-2 py-0.5 text-amber-700 print:border-gray-300 print:text-gray-800">
              <strong>{c.label}:</strong> {c.values}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 print:bg-white print:overflow-visible">
        <div className="max-w-6xl mx-auto p-6 print:p-0 print:max-w-full">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
          ) : blocks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center py-20 text-gray-400 text-sm">Nenhum resultado pros filtros selecionados</div>
          ) : (
            blocks.map((blk, blkIdx) => {
              const isLastBlock = blkIdx === blocks.length - 1;
              return (
                <div key={blkIdx}
                  className={`report-page bg-white border border-gray-200 rounded-xl p-6 mb-6 print:border-0 print:rounded-none print:p-0 print:mb-0 ${isLastBlock ? "" : "print:break-after-page"}`}>

                  {blkIdx === 0 && (
                    <div className="mb-3 print:mb-2 print:pb-2 print:border-b print:border-gray-300">
                      <h2 className="text-lg font-bold text-gray-900 print:text-base">Apoiadores diretos por líder</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Gerado em {hoje} · {totalPessoas.toLocaleString("pt-BR")} pessoa(s) · {totalApoiadores.toLocaleString("pt-BR")} apoiador(es) no total
                      </p>
                    </div>
                  )}

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

// ─── Menu de filtros ─────────────────────────────────────────────────────────

function FilterMenu({ options, filters, setFilters }: {
  options: FilterOptions;
  filters: Record<string, string[]>;
  setFilters: (f: Record<string, string[]>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const allFields = useMemo(() => {
    const out: { key: string; label: string; type?: string; values: string[] }[] = [];
    for (const f of options.standard) out.push({ key: `std_${f.key}`, label: f.label, values: f.values });
    for (const f of options.custom)   out.push({ key: `cf_${f.key}`,  label: f.label, type: f.type, values: f.values });
    return out;
  }, [options]);

  const activeCount = Object.values(filters).reduce((n, vs) => n + vs.length, 0);

  function toggleValue(fieldKey: string, value: string) {
    const current = filters[fieldKey] ?? [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    const updated = { ...filters };
    if (next.length === 0) delete updated[fieldKey];
    else updated[fieldKey] = next;
    setFilters(updated);
  }

  function clearField(fieldKey: string) {
    const updated = { ...filters };
    delete updated[fieldKey];
    setFilters(updated);
  }

  const active = allFields.find(f => f.key === activeField);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium ${
          activeCount > 0
            ? "bg-brand-50 border-brand-200 text-brand-700"
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}>
        <Filter size={14} /> Filtros
        {activeCount > 0 && <span className="bg-brand-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{activeCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-xl flex w-[480px] max-w-[90vw]">
          {/* Lista de campos */}
          <div className="w-44 border-r border-gray-100 max-h-96 overflow-y-auto py-1">
            <p className="text-[10px] uppercase font-semibold text-gray-400 px-3 py-1.5">Campos</p>
            {allFields.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">Nenhum campo</p>}
            {allFields.map(f => {
              const count = filters[f.key]?.length ?? 0;
              const isActive = activeField === f.key;
              return (
                <button key={f.key} onClick={() => setActiveField(f.key)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                  }`}>
                  <span className="truncate">{f.label}</span>
                  {count > 0 && <span className="bg-brand-600 text-white text-[9px] font-bold rounded-full px-1.5">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Valores do campo selecionado */}
          <div className="flex-1 max-h-96 overflow-y-auto py-1">
            {!active ? (
              <p className="text-xs text-gray-400 px-3 py-3">Selecione um campo à esquerda</p>
            ) : (
              <>
                <div className="flex items-center justify-between px-3 py-1.5">
                  <p className="text-[10px] uppercase font-semibold text-gray-400">{active.label}</p>
                  {(filters[active.key]?.length ?? 0) > 0 && (
                    <button onClick={() => clearField(active.key)} className="text-[10px] text-red-500 hover:text-red-700">limpar</button>
                  )}
                </div>
                {active.values.map(v => {
                  const display = active.type === "boolean" ? (v === "true" ? "Sim" : "Não") : v;
                  const on = (filters[active.key] ?? []).includes(v);
                  return (
                    <label key={v} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={on} onChange={() => toggleValue(active.key, v)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      <span className="flex-1 truncate">{display}</span>
                    </label>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
