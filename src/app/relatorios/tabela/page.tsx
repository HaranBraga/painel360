"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search, Download, Filter, ArrowUp, ArrowDown, ChevronsUpDown, X,
  Settings2, Users as UsersIcon,
} from "lucide-react";
import { RelatoriosTabs } from "@/components/layout/RelatoriosTabs";
import { RoleBadge } from "@/components/ui/RoleBadge";
import toast from "react-hot-toast";

type Col = {
  key: string;          // chave única
  label: string;        // header
  type: "text" | "number" | "date" | "badge" | "score" | "link" | "boolean";
  custom?: boolean;     // true se é customField
  filterable?: boolean; // dá pra filtrar via lista de valores únicos
  width?: number;
  get: (row: any) => any;
  render?: (val: any, row: any) => any;
};

const baseCols: Col[] = [
  { key: "name",       label: "Nome",      type: "link", filterable: false, get: r => r.name,
    render: (v, r) => <Link href={`/pessoas/${r.id}`} className="font-medium text-brand-600 hover:underline">{v}</Link> },
  { key: "role",       label: "Papel",     type: "badge", filterable: true, get: r => r.role?.label,
    render: (_, r) => r.role ? <RoleBadge role={r.role} /> : "—" },
  { key: "lider",      label: "Líder",     type: "text",  filterable: true, get: r => r.parent?.name ?? "" },
  { key: "phone",      label: "Telefone",  type: "text",  filterable: false, get: r => r.phone },
  { key: "cidade",     label: "Cidade",    type: "text",  filterable: true, get: r => r.cidade ?? "" },
  { key: "bairro",     label: "Bairro",    type: "text",  filterable: true, get: r => r.bairro ?? "" },
  { key: "zona",       label: "Zona",      type: "text",  filterable: true, get: r => r.zona ?? "" },
  { key: "genero",     label: "Gênero",    type: "text",  filterable: true, get: r => r.genero ?? "" },
  { key: "score",      label: "Média",     type: "score", filterable: false, get: r => r.score },
  { key: "score1",     label: "Aval. 1",   type: "score", filterable: false, get: r => r.score1 },
  { key: "score2",     label: "Aval. 2",   type: "score", filterable: false, get: r => r.score2 },
  { key: "score3",     label: "Aval. 3",   type: "score", filterable: false, get: r => r.score3 },
  { key: "rede",       label: "Na rede",   type: "number",filterable: false, get: r => r._count?.children ?? 0 },
  { key: "createdAt",  label: "Criado em", type: "date",  filterable: false, get: r => r.createdAt },
];

export default function RelatoriosTabelaPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [customFields, setCustomFields] = useState<any[]>([]);

  // Colunas custom geradas dinamicamente
  const allCols = useMemo<Col[]>(() => {
    const customCols: Col[] = customFields.map(f => ({
      key: `cf_${f.key}`,
      label: f.label,
      type: f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "boolean" ? "boolean" : "text",
      custom: true,
      filterable: f.type === "select" || f.type === "boolean",
      get: r => r.customFields?.[f.key],
    }));
    return [...baseCols, ...customCols];
  }, [customFields]);

  // Visibilidade de colunas
  const [visibleCols, setVisibleCols] = useState<string[]>(() => baseCols.filter(c => !["score1", "score2", "score3", "createdAt"].includes(c.key)).map(c => c.key));
  useEffect(() => {
    // Quando custom fields chegam, adiciona automaticamente
    setVisibleCols(prev => [...prev, ...customFields.map(f => `cf_${f.key}`).filter(k => !prev.includes(k))]);
  }, [customFields]);

  // Filtros por coluna: { colKey: Set<value> }
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});

  // Sort
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>({ key: "name", dir: "asc" });

  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [showColPicker, setShowColPicker] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/contacts?limit=2000").then(r => r.json()),
      fetch("/api/custom-fields").then(r => r.json()),
    ]).then(([d, cf]) => {
      setRows(d.contacts ?? []);
      setTotal(d.total ?? 0);
      setCustomFields(cf ?? []);
      setLoading(false);
    });
  }, []);

  // Aplicar filtros e ordenação no client
  const filtered = useMemo(() => {
    let result = rows;

    // Busca textual
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => {
        return [r.name, r.phone, r.email, r.cidade, r.bairro, r.parent?.name, r.role?.label]
          .filter(Boolean)
          .some((v: any) => String(v).toLowerCase().includes(q));
      });
    }

    // Filtros por coluna
    for (const [colKey, vals] of Object.entries(colFilters)) {
      if (!vals.length) continue;
      const col = allCols.find(c => c.key === colKey);
      if (!col) continue;
      const set = new Set(vals.map(v => String(v)));
      result = result.filter(r => {
        const v = col.get(r);
        if (v === null || v === undefined || v === "") return set.has("(vazio)");
        return set.has(String(v));
      });
    }

    // Ordenação
    if (sort) {
      const col = allCols.find(c => c.key === sort.key);
      if (col) {
        result = [...result].sort((a, b) => {
          const va = col.get(a);
          const vb = col.get(b);
          // Nulls/vazios sempre no fim
          const aNull = va === null || va === undefined || va === "";
          const bNull = vb === null || vb === undefined || vb === "";
          if (aNull && bNull) return 0;
          if (aNull) return 1;
          if (bNull) return -1;
          const cmp = typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }

    return result;
  }, [rows, search, colFilters, sort, allCols]);

  const visible = allCols.filter(c => visibleCols.includes(c.key));

  function toggleCol(key: string) {
    setVisibleCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function toggleSort(key: string) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  function exportCSV() {
    const header = visible.map(c => c.label);
    const lines = [header.join(",")];
    for (const r of filtered) {
      const row = visible.map(c => {
        let v = c.get(r);
        if (c.type === "badge") v = r.role?.label ?? "";
        if (c.key === "name") v = r.name;
        if (v === null || v === undefined) v = "";
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      });
      lines.push(row.join(","));
    }
    const csv = "﻿" + lines.join("\n"); // BOM para Excel reconhecer UTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pessoas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${filtered.length} linha(s)`);
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Vista de tabela — filtre, ordene e exporte como Excel</p>
        </div>
        <RelatoriosTabs />
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar (nome, telefone, cidade...)"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="relative">
          <button onClick={() => setShowColPicker(s => !s)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm">
            <Settings2 size={14} /> Colunas <span className="text-xs text-gray-400">({visibleCols.length}/{allCols.length})</span>
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-64 max-h-80 overflow-y-auto">
              <p className="text-[10px] uppercase font-semibold text-gray-400 px-2 py-1">Mostrar colunas</p>
              {allCols.map(c => (
                <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-gray-50 rounded">
                  <input type="checkbox" checked={visibleCols.includes(c.key)} onChange={() => toggleCol(c.key)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="flex-1">{c.label}</span>
                  {c.custom && <span className="text-[9px] text-indigo-500">custom</span>}
                </label>
              ))}
            </div>
          )}
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          <Download size={14} /> CSV
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          <UsersIcon size={11} className="inline mr-1" />
          {filtered.length.toLocaleString("pt-BR")} {filtered.length !== rows.length && `de ${rows.length.toLocaleString("pt-BR")}`}
        </span>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Nenhuma pessoa encontrada</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                {visible.map(c => (
                  <ColumnHeader
                    key={c.key} col={c} rows={rows} sort={sort}
                    activeFilter={colFilters[c.key] ?? []}
                    onSort={() => toggleSort(c.key)}
                    onFilter={(v: string[]) => setColFilters(p => ({ ...p, [c.key]: v }))}
                    open={openFilter === c.key}
                    setOpen={(o: boolean) => setOpenFilter(o ? c.key : null)}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-brand-50/30 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                  {visible.map(c => (
                    <td key={c.key} className="px-3 py-2 align-middle whitespace-nowrap">
                      <CellValue col={c} row={r} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ColumnHeader({ col, rows, sort, activeFilter, onSort, onFilter, open, setOpen }: any) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [setOpen]);

  // Valores únicos da coluna (pra filtro)
  const uniqueValues = useMemo(() => {
    if (!col.filterable) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const v = col.get(r);
      if (v === null || v === undefined || v === "") set.add("(vazio)");
      else set.add(String(v));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [col, rows]);

  const sortIcon = sort?.key === col.key
    ? sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
    : <ChevronsUpDown size={11} className="opacity-40" />;

  return (
    <th className="text-left text-[11px] font-semibold text-gray-600 uppercase px-3 py-2 sticky top-0 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-1.5" ref={ref}>
        <button onClick={onSort} className="flex items-center gap-1 hover:text-gray-900">
          {col.label}
          {sortIcon}
        </button>
        {col.filterable && (
          <div className="relative">
            <button onClick={() => setOpen(!open)} className={`p-1 rounded hover:bg-gray-200 ${activeFilter.length > 0 ? "text-brand-600" : "text-gray-400"}`}>
              <Filter size={11} />
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-2 w-56 max-h-72 overflow-y-auto">
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Filtrar</span>
                  {activeFilter.length > 0 && (
                    <button onClick={() => onFilter([])} className="text-[10px] text-red-500 hover:text-red-700">limpar</button>
                  )}
                </div>
                {uniqueValues.length === 0 ? (
                  <p className="text-xs text-gray-400 px-2 py-1">Sem valores</p>
                ) : (
                  uniqueValues.map(v => {
                    const on = activeFilter.includes(v);
                    return (
                      <label key={v} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-gray-50 rounded">
                        <input type="checkbox" checked={on}
                          onChange={() => onFilter(on ? activeFilter.filter((x: string) => x !== v) : [...activeFilter, v])}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                        <span className="flex-1 truncate normal-case">{v}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

function CellValue({ col, row }: { col: Col; row: any }) {
  const v = col.get(row);

  if (col.render) return col.render(v, row);

  if (v === null || v === undefined || v === "") {
    return <span className="text-gray-300">—</span>;
  }

  if (col.type === "score") {
    const num = Number(v);
    if (isNaN(num)) return "—";
    return <span className="font-semibold text-amber-700">{num.toFixed(1)}</span>;
  }

  if (col.type === "number") {
    return <span className="font-mono text-gray-700">{Number(v).toLocaleString("pt-BR")}</span>;
  }

  if (col.type === "date") {
    try {
      const d = new Date(v);
      return <span className="text-gray-600">{d.toLocaleDateString("pt-BR")}</span>;
    } catch { return String(v); }
  }

  if (col.type === "boolean") {
    return v ? <span className="text-emerald-600">Sim</span> : <span className="text-gray-400">Não</span>;
  }

  return <span className="text-gray-800">{String(v)}</span>;
}
