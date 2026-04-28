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
interface RankEntry { id: string; name: string; role: PersonRole; children: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cls(s: number | null): "seguro" | "promissor" | "incerto" | "none" {
  if (s === null) return "none";
  if (s >= 8) return "seguro";
  if (s >= 5) return "promissor";
  return "incerto";
}

const CLS = {
  seguro:    { label: "Seguros",     bg: "#16a34a" },
  promissor: { label: "Promissores", bg: "#f59e0b" },
  incerto:   { label: "Incertos",    bg: "#ef4444" },
  none:      { label: "Sem nota",    bg: "#f3f4f6" },
};

function ClassBadge({ score }: { score: number | null }) {
  const c = cls(score);
  if (c === "none") return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: CLS[c].bg }}>{CLS[c].label.slice(0, -1)}</span>
  );
}

// ─── ScoreInput ───────────────────────────────────────────────────────────────

function ScoreInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [txt, setTxt] = useState(value !== null ? String(value) : "");
  useEffect(() => { setTxt(value !== null ? String(value) : ""); }, [value]);

  function apply(raw: string) {
    setTxt(raw);
    if (raw === "") { onChange(null); return; }
    const n = Math.min(10, Math.max(0, Math.round(parseFloat(raw))));
    if (!isNaN(n)) onChange(n);
  }

  const color = cls(value) === "none" ? "#9ca3af" : CLS[cls(value)].bg;

  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-brand-400">
      <button type="button" onClick={() => apply(String(Math.max(0, (value ?? 0) - 1)))}
        className="px-1.5 py-1 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">−</button>
      <input type="number" min="0" max="10" value={txt} onChange={e => apply(e.target.value)}
        placeholder="—" className="w-8 text-center text-sm font-bold focus:outline-none py-1 bg-transparent"
        style={{ color }} />
      <button type="button" onClick={() => apply(String(Math.min(10, (value ?? 0) + 1)))}
        className="px-1.5 py-1 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">+</button>
    </div>
  );
}

// ─── GoalInput — local string state, sem trava ao digitar ────────────────────

function GoalInput({ initial, onChange, className }: {
  initial: number | null; onChange: (v: number | null) => void; className?: string;
}) {
  const [txt, setTxt] = useState(initial !== null ? String(initial) : "");
  const prev = useRef(initial);

  useEffect(() => {
    if (prev.current === null && initial !== null) setTxt(String(initial));
    prev.current = initial;
  }, [initial]);

  function apply(raw: string) {
    setTxt(raw);
    if (raw === "") { onChange(null); return; }
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0) onChange(n);
  }

  return (
    <input type="text" inputMode="numeric" value={txt}
      onChange={e => apply(e.target.value)}
      placeholder="Definir meta..."
      className={className} />
  );
}

// ─── Dashboard — componentes visuais ─────────────────────────────────────────

function ScoreGauge({ avg }: { avg: number | null }) {
  const c = cls(avg);
  const cfg = {
    seguro:    { color: "#16a34a", label: "Confiança Alta" },
    promissor: { color: "#d97706", label: "Confiança Moderada" },
    incerto:   { color: "#dc2626", label: "Confiança Baixa" },
    none:      { color: "#9ca3af", label: "Sem avaliações" },
  }[c];
  const pct = avg !== null ? (avg / 10) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={cfg.color} strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 50 * pct / 100} ${2 * Math.PI * 50}`}
            strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-gray-900">{avg ?? "—"}</span>
          <span className="text-xs text-gray-400">de 10</span>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
    </div>
  );
}

function DistributionBar({ byClass, scored }: { byClass: Stats["byClass"]; scored: number }) {
  if (scored === 0) return <div className="h-4 bg-gray-100 rounded-full" />;
  const pct = (n: number) => Math.max(0, Math.round(n / scored * 100));
  const segs = [
    { key: "seguro",    color: "#16a34a", label: "Seguros",     pct: pct(byClass.seguro) },
    { key: "promissor", color: "#d97706", label: "Promissores", pct: pct(byClass.promissor) },
    { key: "incerto",   color: "#dc2626", label: "Incertos",    pct: pct(byClass.incerto) },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segs.map(s => s.pct > 0 && (
          <div key={s.key} className="h-full transition-all" title={`${s.label}: ${s.pct}%`}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="flex items-center gap-4">
        {segs.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-500">{s.label} <strong className="text-gray-700">{s.pct}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteBarChart({ distribution }: { distribution: Record<number, number> }) {
  const max = Math.max(...Object.values(distribution), 1);
  const scores = Array.from({ length: 11 }, (_, i) => i);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1" style={{ height: 96 }}>
        {scores.map(s => {
          const count = distribution[s] ?? 0;
          const h = count > 0 ? Math.max(6, Math.round(count / max * 96)) : 2;
          const c = cls(s);
          const color = c === "none" ? "#e5e7eb" : { seguro: "#16a34a", promissor: "#d97706", incerto: "#dc2626" }[c];
          return (
            <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
              {count > 0 && <span className="text-xs text-gray-500 font-semibold leading-none">{count}</span>}
              <div className="w-full rounded-t-sm" style={{ height: h, backgroundColor: color }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {scores.map(s => <div key={s} className="flex-1 text-center text-xs text-gray-400">{s}</div>)}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, progress }: {
  label: string; value: string | number; sub?: string; accent?: string;
  progress?: { current: number; max: number; color: string };
}) {
  const pct = progress && progress.max > 0 ? Math.min(100, Math.round(progress.current / progress.max * 100)) : null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">{label}</p>
      <p className="text-3xl font-bold" style={{ color: accent ?? "#111827" }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {pct !== null && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: progress!.color }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct}% da meta</p>
        </div>
      )}
    </div>
  );
}

// ─── Ranking lateral ──────────────────────────────────────────────────────────

function RankList({ title, items, color, loading }: {
  title: string; items: RankEntry[]; color: string; loading: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      {loading && (
        <div className="flex justify-center py-3">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!loading && items.length === 0 && (
        <p className="text-xs text-gray-400 italic">Nenhum registro</p>
      )}
      {!loading && items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
          <span className="text-xs font-bold text-gray-300 w-4 text-right shrink-0">{i + 1}</span>
          <p className="flex-1 text-sm text-gray-800 truncate">{item.name}</p>
          <span className="text-sm font-bold shrink-0" style={{ color }}>{item.children}</span>
        </div>
      ))}
    </div>
  );
}

function RankingPanel({ roles }: { roles: PersonRole[] }) {
  const [liders, setLiders] = useState<RankEntry[]>([]);
  const [coords, setCoords] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const liderRole = roles.find(r => r.key === "LIDER");
    const coordRole = roles.find(r => r.key === "COORDENADOR");
    if (!liderRole && !coordRole) return;

    async function fetchRank(roleId: string): Promise<RankEntry[]> {
      const res = await fetch(`/api/contacts?roleId=${roleId}&limit=100`);
      const data = await res.json();
      return (data.contacts ?? [])
        .map((c: ScoredContact) => ({ id: c.id, name: c.name, role: c.role, children: c._count?.children ?? 0 }))
        .sort((a: RankEntry, b: RankEntry) => b.children - a.children)
        .slice(0, 10);
    }

    const ps: Promise<void>[] = [];
    if (liderRole) ps.push(fetchRank(liderRole.id).then(setLiders));
    if (coordRole) ps.push(fetchRank(coordRole.id).then(setCoords));
    Promise.all(ps).finally(() => setLoading(false));
  }, [roles]);

  const liderRole = roles.find(r => r.key === "LIDER");
  const coordRole = roles.find(r => r.key === "COORDENADOR");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-5">
      <p className="text-sm font-bold text-gray-700">Ranking por Rede</p>
      <RankList title={coordRole?.label ?? "Coordenadores"} items={coords}
        color={coordRole?.color ?? "#1d4ed8"} loading={loading} />
      <div className="h-px bg-gray-100" />
      <RankList title={liderRole?.label ?? "Líderes"} items={liders}
        color={liderRole?.color ?? "#b45309"} loading={loading} />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function TabDashboard({ stats, roles }: { stats: Stats | null; roles: PersonRole[] }) {
  const [goals, setGoals]   = useState<Goals>({ total_pessoas: null, total_lideres: null, total_coordenadores: null });
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => setGoals({
      total_pessoas:       d.goal_total_pessoas       ? parseInt(d.goal_total_pessoas) : null,
      total_lideres:       d.goal_total_lideres       ? parseInt(d.goal_total_lideres) : null,
      total_coordenadores: d.goal_total_coordenadores ? parseInt(d.goal_total_coordenadores) : null,
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

  if (!stats) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pct = (n: number) => stats.scored > 0 ? Math.round(n / stats.scored * 100) : 0;
  const liderRole  = roles.find(r => r.key === "LIDER");
  const coordRole  = roles.find(r => r.key === "COORDENADOR");
  const liderCount = liderRole ? (counts[liderRole.id]  ?? 0) : 0;
  const coordCount = coordRole ? (counts[coordRole.id]  ?? 0) : 0;

  return (
    <div className="flex gap-6">

      {/* ── Coluna principal ── */}
      <div className="flex flex-col gap-6 flex-1 min-w-0">

        {/* Seção 1: Hero — gauge + distribuição */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-8">
            <ScoreGauge avg={stats.avg} />
            <div className="w-px h-32 bg-gray-100 shrink-0" />
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Distribuição da base avaliada</p>
                <DistributionBar byClass={stats.byClass} scored={stats.scored} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: "Seguros",     count: stats.byClass.seguro,    color: "#16a34a", bg: "#f0fdf4" },
                  { label: "Promissores", count: stats.byClass.promissor, color: "#d97706", bg: "#fffbeb" },
                  { label: "Incertos",    count: stats.byClass.incerto,   color: "#dc2626", bg: "#fef2f2" },
                ] as const).map(item => (
                  <div key={item.label} className="rounded-xl px-4 py-3" style={{ backgroundColor: item.bg }}>
                    <p className="text-xs font-medium mb-1" style={{ color: item.color }}>{item.label}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black" style={{ color: item.color }}>{item.count}</span>
                      <span className="text-sm font-medium" style={{ color: item.color, opacity: 0.7 }}>{pct(item.count)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: KPIs com progresso de metas */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total de Pessoas" value={stats.total.toLocaleString("pt-BR")}
            sub={goals.total_pessoas ? `meta: ${goals.total_pessoas.toLocaleString("pt-BR")}` : "na rede"}
            progress={goals.total_pessoas ? { current: stats.total, max: goals.total_pessoas, color: "#6366f1" } : undefined} />
          <StatCard label={liderRole?.label ?? "Líderes"} value={liderCount.toLocaleString("pt-BR")}
            sub={goals.total_lideres ? `meta: ${goals.total_lideres.toLocaleString("pt-BR")}` : undefined}
            progress={goals.total_lideres ? { current: liderCount, max: goals.total_lideres, color: liderRole?.color ?? "#b45309" } : undefined} />
          <StatCard label={coordRole?.label ?? "Coordenadores"} value={coordCount.toLocaleString("pt-BR")}
            sub={goals.total_coordenadores ? `meta: ${goals.total_coordenadores.toLocaleString("pt-BR")}` : undefined}
            progress={goals.total_coordenadores ? { current: coordCount, max: goals.total_coordenadores, color: coordRole?.color ?? "#1d4ed8" } : undefined} />
          <StatCard label="Avaliados" value={stats.scored.toLocaleString("pt-BR")}
            sub={`${stats.total > 0 ? Math.round(stats.scored / stats.total * 100) : 0}% da rede`} />
        </div>

        {/* Seção 3: Gráfico + por cargo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Quantidade por nota (0–10)</p>
            <NoteBarChart distribution={stats.distribution} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nota média por cargo</p>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.byRole.map(r => (
                <div key={r.id} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ color: r.color, backgroundColor: r.bgColor }}>{r.label}</span>
                  <div className="flex-1 min-w-0">
                    {r.scored > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-base font-bold text-gray-900">{r.avg}</span>
                          <span className="text-xs text-gray-400">{r.scored} aval.</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-green-500" style={{ width: `${r.seguro / r.scored * 100}%` }} />
                          <div className="h-full bg-amber-400" style={{ width: `${r.promissor / r.scored * 100}%` }} />
                          <div className="h-full bg-red-400"  style={{ width: `${r.incerto / r.scored * 100}%` }} />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sem avaliações</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Ranking lateral ── */}
      <div className="w-60 shrink-0">
        <RankingPanel roles={roles} />
      </div>
    </div>
  );
}

// ─── Avaliação (3 avaliadores) ────────────────────────────────────────────────

const COL = "1fr 84px 84px 84px 96px";

function TabAvaliacao({ roles, onScoreChange }: { roles: PersonRole[]; onScoreChange: () => void }) {
  const [contacts, setContacts]     = useState<ScoredContact[]>([]);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const saveTimers     = useRef<Record<string, NodeJS.Timeout>>({});
  const searchDebounce = useRef<NodeJS.Timeout>();

  const load = useCallback(async (p = 1, q = search, r = roleFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (q) params.set("search", q);
      if (r) params.set("roleId", r);
      const res  = await fetch(`/api/contacts?${params}`);
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
    setContacts(cs => cs.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      const vals = [updated.score1, updated.score2, updated.score3].filter(v => v !== null) as number[];
      const avg = vals.length > 0 ? +((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
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

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

          {/* Header alinhado com grid fixo */}
          <div className="grid items-center px-4 py-2 bg-gray-50 text-xs text-gray-400 font-medium rounded-t-xl"
            style={{ gridTemplateColumns: COL }}>
            <span>Pessoa</span>
            <span className="text-center">Av. 1</span>
            <span className="text-center">Av. 2</span>
            <span className="text-center">Av. 3</span>
            <span className="text-center">Média</span>
          </div>

          {displayed.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">Nenhuma pessoa encontrada</div>
          )}

          {displayed.map(c => {
            const effectiveScore = c.score ?? c.parent?.score ?? null;
            const inherited = c.score === null && c.parent?.score != null;
            return (
              <div key={c.id} className="grid items-center px-4 py-2.5 hover:bg-gray-50"
                style={{ gridTemplateColumns: COL }}>

                {/* Nome + cargo */}
                <div className="min-w-0 flex items-center gap-2 pr-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>{c.name[0]}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ color: c.role.color, backgroundColor: c.role.bgColor }}>{c.role.label}</span>
                      {c.parent && <span className="text-xs text-gray-400 truncate">▸ {c.parent.name}</span>}
                    </div>
                  </div>
                </div>

                {/* Avaliadores */}
                <div className="flex justify-center">
                  <ScoreInput value={c.score1} onChange={v => handleEvaluatorChange(c.id, "score1", v)} />
                </div>
                <div className="flex justify-center">
                  <ScoreInput value={c.score2} onChange={v => handleEvaluatorChange(c.id, "score2", v)} />
                </div>
                <div className="flex justify-center">
                  <ScoreInput value={c.score3} onChange={v => handleEvaluatorChange(c.id, "score3", v)} />
                </div>

                {/* Média */}
                <div className="flex flex-col items-center gap-0.5">
                  {inherited ? (
                    <span className="text-xs text-gray-400">{c.parent?.score} (herd.)</span>
                  ) : (
                    <>
                      <span className="text-base font-bold"
                        style={{ color: effectiveScore !== null ? CLS[cls(effectiveScore)].bg : "#9ca3af" }}>
                        {c.score !== null ? c.score : "—"}
                      </span>
                      {c.score !== null && <ClassBadge score={c.score} />}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
          <span className="text-sm text-gray-500">Página {page} de {pages}</span>
          <button disabled={page >= pages} onClick={() => load(page + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima →</button>
        </div>
      )}
    </div>
  );
}

// ─── MetaCard — standalone para evitar remount ao digitar ────────────────────

function MetaCard({ label, current, goal, onGoalChange }: {
  label: string; current: number; goal: number | null; onGoalChange: (v: number | null) => void;
}) {
  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-800">{label}</p>
        <span className="text-2xl font-bold text-gray-900">{current.toLocaleString("pt-BR")}</span>
      </div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">Meta</label>
      <GoalInput initial={goal} onChange={onGoalChange} className={inp} />
    </div>
  );
}

// ─── Metas ────────────────────────────────────────────────────────────────────

function TabMetas({ stats, roles }: { stats: Stats | null; roles: PersonRole[] }) {
  const [goals, setGoals]   = useState<Goals>({ total_pessoas: null, total_lideres: null, total_coordenadores: null });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => setGoals({
      total_pessoas:       d.goal_total_pessoas       ? parseInt(d.goal_total_pessoas) : null,
      total_lideres:       d.goal_total_lideres       ? parseInt(d.goal_total_lideres) : null,
      total_coordenadores: d.goal_total_coordenadores ? parseInt(d.goal_total_coordenadores) : null,
    }));
    fetch("/api/roles").then(r => r.json()).then((rs: PersonRole[]) => {
      Promise.all(rs.map(r =>
        fetch(`/api/contacts?roleId=${r.id}&limit=1`).then(res => res.json()).then(d => ({ id: r.id, total: d.total }))
      )).then(results => {
        const c: Record<string, number> = {};
        for (const r of results) c[r.id] = r.total;
        setCounts(c);
      });
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

  const total      = stats?.total ?? 0;
  const liderRole  = roles.find(r => r.key === "LIDER");
  const coordRole  = roles.find(r => r.key === "COORDENADOR");
  const liderCount = liderRole ? (counts[liderRole.id] ?? 0) : 0;
  const coordCount = coordRole ? (counts[coordRole.id] ?? 0) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-5">
        <MetaCard label="Total de Pessoas" current={total} goal={goals.total_pessoas}
          onGoalChange={v => setGoals(g => ({ ...g, total_pessoas: v }))} />
        <MetaCard label={`Total de ${liderRole?.label ?? "Líderes"}`} current={liderCount} goal={goals.total_lideres}
          onGoalChange={v => setGoals(g => ({ ...g, total_lideres: v }))} />
        <MetaCard label={`Total de ${coordRole?.label ?? "Coordenadores"}`} current={coordCount} goal={goals.total_coordenadores}
          onGoalChange={v => setGoals(g => ({ ...g, total_coordenadores: v }))} />
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
    const r = await fetch("/api/score");
    setStats(await r.json());
    setDirty(false);
  }, []);

  useEffect(() => {
    fetch("/api/roles").then(r => r.json()).then(setRoles);
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === "dashboard" && dirty) loadStats();
  }, [tab]);

  const TABS = [
    { key: "dashboard", label: "Dashboard" },
    { key: "avaliacao", label: "Avaliação" },
    { key: "metas",     label: "Metas" },
  ] as const;

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Score</h1>
          <p className="text-sm text-gray-500">Avaliação de confiança da rede</p>
        </div>
        <button onClick={loadStats}
          className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Atualizar
        </button>
      </header>

      <div className="flex px-6 bg-white border-b border-gray-200 shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors relative ${tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.key === "dashboard" && dirty && (
              <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-brand-500 rounded-full" />
            )}
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
