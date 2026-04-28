"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, Save } from "lucide-react";
import { type PersonRole } from "@/components/ui/RoleBadge";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ScoredContact {
  id: string; name: string;
  roleId: string; role: PersonRole;
  parent?: { id: string; name: string; score: number | null } | null;
  score: number | null;
  score1: number | null; score2: number | null; score3: number | null;
  _count?: { children: number };
}

interface Stats {
  total: number; scored: number; avg: number | null;
  byClass: { seguro: number; promissor: number; incerto: number };
  distribution: Record<number, number>;
  byRole: Array<{
    id: string; key: string; label: string; color: string; bgColor: string; level: number;
    scored: number; avg: number | null; seguro: number; promissor: number; incerto: number;
  }>;
}

interface Goals { total_pessoas: number | null; total_lideres: number | null; total_coordenadores: number | null; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cls(s: number | null): "seguro" | "promissor" | "incerto" | "none" {
  if (s === null) return "none";
  if (s >= 8) return "seguro";
  if (s >= 5) return "promissor";
  return "incerto";
}

const CLS = {
  seguro:    { label: "Seguros",    color: "#fff", bg: "#16a34a" },
  promissor: { label: "Promissores",color: "#fff", bg: "#f59e0b" },
  incerto:   { label: "Incertos",   color: "#fff", bg: "#ef4444" },
  none:      { label: "Sem nota",   color: "#6b7280", bg: "#f3f4f6" },
};

function ClassBadge({ score }: { score: number | null }) {
  const c = cls(score);
  if (c === "none") return <span className="text-xs text-gray-400">—</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: CLS[c].bg }}>{CLS[c].label.slice(0,-1)}</span>;
}

// ─── Mini score input ─────────────────────────────────────────────────────────

function ScoreInput({ label, value, onChange }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
}) {
  const [txt, setTxt] = useState(value !== null ? String(value) : "");
  useEffect(() => { setTxt(value !== null ? String(value) : ""); }, [value]);

  function apply(raw: string) {
    setTxt(raw);
    if (raw === "") { onChange(null); return; }
    const n = Math.min(10, Math.max(0, Math.round(parseFloat(raw))));
    if (!isNaN(n)) onChange(n);
  }

  const c = cls(value);
  const color = c === "none" ? "#9ca3af" : CLS[c].bg;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-brand-400">
        <button type="button" onClick={() => apply(String(Math.max(0, (value ?? 0) - 1)))}
          className="px-1.5 py-1 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">−</button>
        <input type="number" min="0" max="10" value={txt} onChange={e => apply(e.target.value)}
          placeholder="—"
          className="w-8 text-center text-sm font-bold focus:outline-none py-1 bg-transparent"
          style={{ color }} />
        <button type="button" onClick={() => apply(String(Math.min(10, (value ?? 0) + 1)))}
          className="px-1.5 py-1 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">+</button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function BarChart({ distribution }: { distribution: Record<number, number> }) {
  const max = Math.max(...Object.values(distribution), 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-28 mb-1">
        {Array.from({ length: 11 }, (_, i) => i).map(s => {
          const count = distribution[s] ?? 0;
          const pct = count > 0 ? Math.max(6, Math.round(count / max * 100)) : 0;
          const c = cls(s);
          const color = c === "none" ? "#e5e7eb" : CLS[c].bg;
          return (
            <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
              {count > 0 && <span className="text-xs text-gray-600 font-semibold leading-none">{count}</span>}
              <div className="w-full rounded-t-sm transition-all" style={{ height: `${pct}%`, backgroundColor: color, minHeight: count > 0 ? 6 : 0 }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 11 }, (_, i) => i).map(s => (
          <div key={s} className="flex-1 text-center text-xs text-gray-400">{s}</div>
        ))}
      </div>
      {/* Legenda */}
      <div className="flex items-center gap-3 mt-2 justify-center">
        {(["incerto","promissor","seguro"] as const).map(c => (
          <span key={c} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: CLS[c].bg }} />
            {CLS[c].label} {c === "incerto" ? "(0-4)" : c === "promissor" ? "(5-7)" : "(8-10)"}
          </span>
        ))}
      </div>
    </div>
  );
}

function BigCard({ label, value, bg, small }: { label: string; value: string | number; bg: string; small?: boolean }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ backgroundColor: bg }}>
      <p className="text-xs text-white/80 font-medium">{label}</p>
      <p className={`text-white font-bold ${small ? "text-2xl" : "text-3xl"}`}>{value}</p>
    </div>
  );
}

function OutlineCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border-2 border-gray-200 p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function TabDashboard({ stats, roles }: { stats: Stats | null; roles: PersonRole[] }) {
  const [goals, setGoals]   = useState<Goals>({ total_pessoas: null, total_lideres: null, total_coordenadores: null });
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => setGoals({
      total_pessoas:      d.goal_total_pessoas      ? parseInt(d.goal_total_pessoas) : null,
      total_lideres:      d.goal_total_lideres      ? parseInt(d.goal_total_lideres) : null,
      total_coordenadores:d.goal_total_coordenadores? parseInt(d.goal_total_coordenadores) : null,
    }));
    fetch("/api/roles").then(r => r.json()).then((rs: PersonRole[]) => {
      Promise.all(rs.map(role =>
        fetch(`/api/contacts?roleId=${role.id}&limit=1`).then(r => r.json()).then(d => ({ id: role.id, total: d.total }))
      )).then(results => {
        const c: Record<string, number> = {};
        for (const r of results) c[r.id] = r.total;
        setCounts(c);
      });
    });
  }, []);

  if (!stats) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const pct = (n: number) => stats.scored > 0 ? Math.round(n / stats.scored * 100) : 0;
  const liderRole = roles.find(r => r.key === "LIDER");
  const liderCount = liderRole ? (counts[liderRole.id] ?? 0) : 0;
  const metaLideres = goals.total_lideres;
  const pctAlcancada = metaLideres ? Math.min(100, Math.round(liderCount / metaLideres * 100)) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Linha 1: Cards de classificação + gráfico */}
      <div className="grid grid-cols-3 gap-4">
        {/* Coluna: % */}
        <div className="flex flex-col gap-3">
          <BigCard label="% Seguros"    value={`${pct(stats.byClass.seguro)}%`}    bg="#16a34a" />
          <BigCard label="% Promissores" value={`${pct(stats.byClass.promissor)}%`} bg="#f59e0b" />
          <BigCard label="% Incertos"   value={`${pct(stats.byClass.incerto)}%`}   bg="#ef4444" />
        </div>
        {/* Coluna: Qtd */}
        <div className="flex flex-col gap-3">
          <BigCard label="Quantidade Seguros"    value={stats.byClass.seguro}    bg="#16a34a" />
          <BigCard label="Quantidade Promissores" value={stats.byClass.promissor} bg="#f59e0b" />
          <BigCard label="Quantidade Incertos"   value={stats.byClass.incerto}   bg="#ef4444" />
        </div>
        {/* Gráfico de barras */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Quantidade por nota</p>
          <BarChart distribution={stats.distribution} />
        </div>
      </div>

      {/* Linha 2: métricas resumo */}
      <div className="grid grid-cols-4 gap-4">
        <OutlineCard label={`Total ${liderRole?.label ?? "Líderes"}`} value={liderCount.toLocaleString("pt-BR")} />
        <OutlineCard label="Média de Confiança" value={stats.avg ?? "—"} />
        <OutlineCard label={`Meta ${liderRole?.label ?? "Líderes"}`} value={metaLideres?.toLocaleString("pt-BR") ?? "—"} />
        <OutlineCard label="% Alcançada" value={pctAlcancada !== null ? `${pctAlcancada}%` : "—"} />
      </div>

      {/* Linha 3: por cargo */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Nota média por cargo</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {stats.byRole.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-4">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full w-32 text-center shrink-0"
                style={{ color: r.color, backgroundColor: r.bgColor }}>{r.label}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-gray-900">{r.avg ?? "—"}</span>
                  <span className="text-xs text-gray-400">{r.scored} aval.</span>
                </div>
                {r.scored > 0 && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500" style={{ width: `${r.seguro/r.scored*100}%` }} />
                    <div className="h-full bg-amber-400" style={{ width: `${r.promissor/r.scored*100}%` }} />
                    <div className="h-full bg-red-400" style={{ width: `${r.incerto/r.scored*100}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Avaliação (3 avaliadores) ────────────────────────────────────────────────

function TabAvaliacao({ roles, onScoreChange }: { roles: PersonRole[]; onScoreChange: () => void }) {
  const [contacts, setContacts] = useState<ScoredContact[]>([]);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const saveTimers              = useRef<Record<string, NodeJS.Timeout>>({});
  const searchDebounce          = useRef<NodeJS.Timeout>();

  const load = useCallback(async (p = 1, q = search, r = roleFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (q) params.set("search", q);
      if (r) params.set("roleId", r);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0); setPage(data.page ?? 1); setPages(data.pages ?? 1);
    } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(1); }, []);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => load(1, v, roleFilter), 400);
  }

  function handleEvaluatorChange(id: string, field: "score1" | "score2" | "score3", value: number | null) {
    // Atualiza local imediatamente (sem delay visual)
    setContacts(cs => cs.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      const scores = [updated.score1, updated.score2, updated.score3].filter(v => v !== null) as number[];
      const avg = scores.length > 0 ? +((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null;
      return { ...updated, score: avg };
    }));

    clearTimeout(saveTimers.current[`${id}-${field}`]);
    saveTimers.current[`${id}-${field}`] = setTimeout(async () => {
      await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      onScoreChange();
    }, 800);
  }

  const displayed = classFilter
    ? contacts.filter(c => cls(c.score ?? c.parent?.score ?? null) === classFilter)
    : contacts;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); load(1, search, e.target.value); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos os cargos</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todas as classificações</option>
          <option value="seguro">Seguro (8–10)</option>
          <option value="promissor">Promissor (5–7)</option>
          <option value="incerto">Incerto (0–4)</option>
          <option value="none">Sem nota</option>
        </select>
        <span className="text-xs text-gray-400">{total.toLocaleString("pt-BR")} pessoas</span>
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2 bg-gray-50 text-xs text-gray-400 font-medium rounded-t-xl">
            <span>Pessoa</span>
            <span className="flex items-center gap-8 pr-1">
              <span className="w-20 text-center">Avaliador 1</span>
              <span className="w-20 text-center">Avaliador 2</span>
              <span className="w-20 text-center">Avaliador 3</span>
              <span className="w-20 text-center">Média</span>
            </span>
          </div>

          {displayed.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">Nenhuma pessoa encontrada</div>}

          {displayed.map(c => {
            const effectiveScore = c.score ?? c.parent?.score ?? null;
            const inherited = c.score === null && c.parent?.score != null;
            return (
              <div key={c.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>{c.name[0]}</div>
                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ color: c.role.color, backgroundColor: c.role.bgColor }}>{c.role.label}</span>
                    {c.parent && <span className="text-xs text-gray-400">▸ {c.parent.name}</span>}
                  </div>
                </div>
                {/* 3 avaliadores */}
                <div className="flex items-center gap-3 shrink-0">
                  <ScoreInput label="Av. 1" value={c.score1} onChange={v => handleEvaluatorChange(c.id, "score1", v)} />
                  <ScoreInput label="Av. 2" value={c.score2} onChange={v => handleEvaluatorChange(c.id, "score2", v)} />
                  <ScoreInput label="Av. 3" value={c.score3} onChange={v => handleEvaluatorChange(c.id, "score3", v)} />
                  {/* Média */}
                  <div className="flex flex-col items-center gap-0.5 w-20">
                    <span className="text-xs text-gray-400 font-medium">Média</span>
                    <div className="flex items-center gap-1.5">
                      {inherited ? (
                        <span className="text-xs text-gray-400">{c.parent?.score} (herd.)</span>
                      ) : (
                        <>
                          <span className="text-base font-bold" style={{ color: effectiveScore !== null ? CLS[cls(effectiveScore)].bg : "#9ca3af" }}>
                            {c.score !== null ? c.score : "—"}
                          </span>
                          {c.score !== null && <ClassBadge score={c.score} />}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
          <span className="text-sm text-gray-500">Página {page} de {pages}</span>
          <button disabled={page >= pages} onClick={() => load(page + 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima →</button>
        </div>
      )}
    </div>
  );
}

// ─── Metas ────────────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-gray-500">{value.toLocaleString("pt-BR")} / {max.toLocaleString("pt-BR")} — <strong>{pct}%</strong> alcançado</p>
    </div>
  );
}

function TabMetas({ stats, roles }: { stats: Stats | null; roles: PersonRole[] }) {
  const [goals, setGoals]   = useState<Goals>({ total_pessoas: null, total_lideres: null, total_coordenadores: null });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => setGoals({
      total_pessoas:      d.goal_total_pessoas      ? parseInt(d.goal_total_pessoas) : null,
      total_lideres:      d.goal_total_lideres      ? parseInt(d.goal_total_lideres) : null,
      total_coordenadores:d.goal_total_coordenadores? parseInt(d.goal_total_coordenadores) : null,
    }));
    fetch("/api/roles").then(r => r.json()).then((rs: PersonRole[]) => {
      Promise.all(rs.map(r => fetch(`/api/contacts?roleId=${r.id}&limit=1`).then(res => res.json()).then(d => ({ id: r.id, total: d.total }))))
        .then(results => { const c: Record<string, number> = {}; for (const r of results) c[r.id] = r.total; setCounts(c); });
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_total_pessoas:       goals.total_pessoas ?? "",
        goal_total_lideres:       goals.total_lideres ?? "",
        goal_total_coordenadores: goals.total_coordenadores ?? "",
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const total = stats?.total ?? 0;
  const liderRole = roles.find(r => r.key === "LIDER");
  const coordRole = roles.find(r => r.key === "COORDENADOR");
  const liderCount = liderRole ? (counts[liderRole.id] ?? 0) : 0;
  const coordCount = coordRole ? (counts[coordRole.id] ?? 0) : 0;

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  const MetaCard = ({ label, current, goal, color, field, onGoalChange }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-800">{label}</p>
        <span className="text-2xl font-bold text-gray-900">{current.toLocaleString("pt-BR")}</span>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1.5">Meta</label>
        <input type="number" min="0" value={goal ?? ""} onChange={e => onGoalChange(e.target.value ? parseInt(e.target.value) : null)} placeholder="Definir meta..." className={inp} />
      </div>
      {goal && <ProgressBar value={current} max={goal} color={color} />}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-5">
        <MetaCard label="Total de Pessoas" current={total} goal={goals.total_pessoas} color="#6366f1"
          field="total_pessoas" onGoalChange={(v: any) => setGoals(g => ({ ...g, total_pessoas: v }))} />
        <MetaCard label={`Total de ${liderRole?.label ?? "Líderes"}`} current={liderCount} goal={goals.total_lideres} color={liderRole?.color ?? "#b45309"}
          field="total_lideres" onGoalChange={(v: any) => setGoals(g => ({ ...g, total_lideres: v }))} />
        <MetaCard label={`Total de ${coordRole?.label ?? "Coordenadores"}`} current={coordCount} goal={goals.total_coordenadores} color={coordRole?.color ?? "#1d4ed8"}
          field="total_coordenadores" onGoalChange={(v: any) => setGoals(g => ({ ...g, total_coordenadores: v }))} />
      </div>
      <button onClick={save} disabled={saving}
        className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-semibold self-start">
        <Save size={14} /> {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar Metas"}
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ScorePage() {
  const [tab, setTab]     = useState<"dashboard" | "avaliacao" | "metas">("dashboard");
  const [roles, setRoles] = useState<PersonRole[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadStats = useCallback(async () => {
    const r = await fetch("/api/score"); setStats(await r.json()); setDirty(false);
  }, []);

  useEffect(() => {
    fetch("/api/roles").then(r => r.json()).then(setRoles);
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === "dashboard" && dirty) loadStats();
  }, [tab]);

  const TABS = [
    { key: "dashboard",  label: "Dashboard" },
    { key: "avaliacao",  label: "Avaliação" },
    { key: "metas",      label: "Metas" },
  ] as const;

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Score</h1>
          <p className="text-sm text-gray-500">Avaliação de confiança da rede</p>
        </div>
        <button onClick={loadStats} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Atualizar
        </button>
      </header>

      {/* Tabs */}
      <div className="flex px-6 bg-white border-b border-gray-200 shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors relative ${tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.key === "dashboard" && dirty && <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-brand-500 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === "dashboard" && <TabDashboard stats={stats} roles={roles} />}
        {tab === "avaliacao" && <TabAvaliacao roles={roles} onScoreChange={() => setDirty(true)} />}
        {tab === "metas"     && <TabMetas stats={stats} roles={roles} />}
      </div>
    </div>
  );
}
