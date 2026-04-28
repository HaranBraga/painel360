"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, TrendingUp, Users, Star, Target, Save } from "lucide-react";
import { type PersonRole } from "@/components/ui/RoleBadge";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ScoredContact {
  id: string; name: string;
  roleId: string; role: PersonRole;
  parentId?: string | null;
  parent?: { id: string; name: string; score: number | null } | null;
  score: number | null;
  _count?: { children: number };
}

interface Stats {
  total: number; scored: number; avg: number | null;
  byClass: { seguro: number; promissor: number; incerto: number };
  byRole: Array<{
    id: string; key: string; label: string; color: string; bgColor: string; level: number;
    scored: number; avg: number | null; seguro: number; promissor: number; incerto: number;
  }>;
}

interface Goals { total_pessoas: number | null; total_lideres: number | null; total_coordenadores: number | null; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classify(s: number | null): "seguro" | "promissor" | "incerto" | "none" {
  if (s === null) return "none";
  if (s >= 8) return "seguro";
  if (s >= 5) return "promissor";
  return "incerto";
}

const CLS = {
  seguro:    { label: "Seguro",    color: "#15803d", bg: "#dcfce7", border: "#bbf7d0", range: "8–10" },
  promissor: { label: "Promissor", color: "#b45309", bg: "#fef3c7", border: "#fde68a", range: "5–7" },
  incerto:   { label: "Incerto",   color: "#b91c1c", bg: "#fee2e2", border: "#fecaca", range: "0–4" },
  none:      { label: "Sem nota",  color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb", range: "—" },
};

function ClassBadge({ score }: { score: number | null }) {
  const cfg = CLS[classify(score)];
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bg }}>{cfg.label}</span>;
}

// ─── Editor de score (sem delay visual, delay só no save) ─────────────────────

function ScoreEditor({ id, score, parentScore, onChange }: {
  id: string; score: number | null; parentScore?: number | null;
  onChange: (id: string, score: number | null) => void;
}) {
  const [val, setVal] = useState(score !== null ? String(score) : "");
  useEffect(() => { setVal(score !== null ? String(score) : ""); }, [score]);

  const inherited = score === null && parentScore != null;
  const displayScore = score ?? parentScore ?? null;
  const cls = classify(displayScore);
  const cfg = CLS[cls];

  function apply(raw: string) {
    setVal(raw);
    const n = raw === "" ? null : Math.min(10, Math.max(0, Math.round(parseFloat(raw))));
    if (raw !== "" && isNaN(n as any)) return;
    onChange(id, n);
  }

  return (
    <div className="flex items-center gap-2">
      {inherited && (
        <span className="text-xs text-gray-400 italic px-1.5">
          {parentScore} (herdado)
        </span>
      )}
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-300">
        <button type="button"
          onClick={() => apply(String(Math.max(0, (score ?? 0) - 1)))}
          className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-bold leading-none">−</button>
        <input
          type="number" min="0" max="10" step="1" value={val}
          onChange={e => apply(e.target.value)}
          placeholder="—"
          className="w-10 text-center text-sm font-bold focus:outline-none py-1.5 bg-transparent"
          style={{ color: score !== null ? cfg.color : "#9ca3af" }}
        />
        <button type="button"
          onClick={() => apply(String(Math.min(10, (score ?? 0) + 1)))}
          className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-bold leading-none">+</button>
      </div>
      {displayScore !== null && <ClassBadge score={displayScore} />}
    </div>
  );
}

// ─── Aba: Avaliação ───────────────────────────────────────────────────────────

function TabAvaliacao({ roles, onScoreChange }: {
  roles: PersonRole[];
  onScoreChange: () => void;
}) {
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
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setPages(data.pages ?? 1);
    } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(1); }, []);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => load(1, v, roleFilter), 400);
  }

  // Atualiza localmente imediato, salva na API com debounce de 800ms
  // Não atualiza painel durante edição (evita delay)
  function handleScoreChange(id: string, score: number | null) {
    setContacts(cs => cs.map(c => c.id === id ? { ...c, score } : c));

    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      onScoreChange(); // notifica que houve mudança (atualiza painel só depois)
    }, 800);
  }

  const displayed = classFilter
    ? contacts.filter(c => classify(c.score ?? c.parent?.score ?? null) === classFilter)
    : contacts;

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
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
        <span className="text-xs text-gray-400 ml-auto">{total.toLocaleString("pt-BR")} pessoas</span>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {(["seguro","promissor","incerto"] as const).map(cls => (
          <span key={cls} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLS[cls].color }} />
            {CLS[cls].label} {CLS[cls].range}
          </span>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {displayed.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">Nenhuma pessoa encontrada</div>}
          {displayed.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
                style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>
                {c.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ color: c.role.color, backgroundColor: c.role.bgColor }}>{c.role.label}</span>
                  {c.parent && <span className="text-xs text-gray-400">▸ {c.parent.name}</span>}
                </div>
                {c._count && c._count.children > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{c._count.children} na rede</p>
                )}
              </div>
              <ScoreEditor
                id={c.id}
                score={c.score}
                parentScore={c.parent?.score}
                onChange={handleScoreChange}
              />
            </div>
          ))}
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

// ─── Aba: Dashboard ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function TabDashboard({ stats, roles }: { stats: Stats | null; roles: PersonRole[] }) {
  const [goals, setGoals]     = useState<Goals>({ total_pessoas: null, total_lideres: null, total_coordenadores: null });
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    // Carrega metas
    fetch("/api/config").then(r => r.json()).then(d => {
      setGoals({
        total_pessoas: d.goal_total_pessoas ? parseInt(d.goal_total_pessoas) : null,
        total_lideres: d.goal_total_lideres ? parseInt(d.goal_total_lideres) : null,
        total_coordenadores: d.goal_total_coordenadores ? parseInt(d.goal_total_coordenadores) : null,
      });
    });
    // Carrega contagens por cargo
    fetch("/api/contacts?limit=1").then(r => r.json()).then(d => {
      fetch("/api/roles").then(r => r.json()).then((rs: PersonRole[]) => {
        Promise.all(rs.map(role =>
          fetch(`/api/contacts?roleId=${role.id}&limit=1`).then(r => r.json()).then(d => ({ id: role.id, total: d.total }))
        )).then(results => {
          const c: Record<string, number> = {};
          for (const r of results) c[r.id] = r.total;
          setCounts(c);
        });
      });
    });
  }, []);

  async function saveGoals() {
    setSaving(true);
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_total_pessoas: goals.total_pessoas ?? "",
        goal_total_lideres: goals.total_lideres ?? "",
        goal_total_coordenadores: goals.total_coordenadores ?? "",
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!stats) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const pct = (n: number) => stats.scored > 0 ? Math.round(n / stats.scored * 100) : 0;
  const classifiedPct = stats.total > 0 ? Math.round(stats.scored / stats.total * 100) : 0;

  const liderRole   = roles.find(r => r.key === "LIDER");
  const coordRole   = roles.find(r => r.key === "COORDENADOR");
  const liderCount  = liderRole ? (counts[liderRole.id] ?? 0) : 0;
  const coordCount  = coordRole ? (counts[coordRole.id] ?? 0) : 0;

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Score */}
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Star size={15} /> Distribuição Score</h2>

        <div className="grid grid-cols-3 gap-3">
          {(["seguro","promissor","incerto"] as const).map(cls => {
            const cfg = CLS[cls];
            const count = stats.byClass[cls];
            return (
              <div key={cls} className="bg-white rounded-xl border p-4" style={{ borderColor: cfg.border }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <p className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
                <p className="text-xs text-gray-400 mt-0.5">{pct(count)}% · {cfg.range}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Nota média</p>
            <p className="text-3xl font-bold text-gray-900">{stats.avg ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Classificados</p>
            <p className="text-2xl font-bold text-gray-900">{stats.scored}<span className="text-sm text-gray-400 font-normal">/{stats.total}</span></p>
            <div className="mt-2">
              <ProgressBar value={stats.scored} max={stats.total} color="#6366f1" />
              <p className="text-xs text-gray-400 mt-1">{classifiedPct}% da base</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp size={14} /> Por cargo</p></div>
          {stats.byRole.map(r => (
            <div key={r.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full w-28 text-center shrink-0"
                  style={{ color: r.color, backgroundColor: r.bgColor }}>{r.label}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">{r.avg ?? "—"}</span>
                    <span className="text-xs text-gray-400">{r.scored} aval.</span>
                  </div>
                  {r.scored > 0 && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${r.seguro/r.scored*100}%` }} />
                      <div className="h-full bg-amber-400" style={{ width: `${r.promissor/r.scored*100}%` }} />
                      <div className="h-full bg-red-400" style={{ width: `${r.incerto/r.scored*100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metas */}
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Target size={15} /> Metas da Rede</h2>

        {/* Meta: total de pessoas */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2"><Users size={14} /> Total de Pessoas</p>
            <span className="text-xs text-gray-400">{stats.total.toLocaleString("pt-BR")} atualmente</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input type="number" min="0" value={goals.total_pessoas ?? ""}
              onChange={e => setGoals(g => ({ ...g, total_pessoas: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Definir meta..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {goals.total_pessoas && (
            <>
              <ProgressBar value={stats.total} max={goals.total_pessoas} color="#6366f1" />
              <p className="text-xs text-gray-400 mt-1">
                {stats.total.toLocaleString("pt-BR")} / {goals.total_pessoas.toLocaleString("pt-BR")} ({Math.min(100, Math.round(stats.total / goals.total_pessoas * 100))}%)
              </p>
            </>
          )}
        </div>

        {/* Meta: Líderes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: liderRole?.color ?? "#b45309" }} />
              {liderRole?.label ?? "Líderes"}
            </p>
            <span className="text-xs text-gray-400">{liderCount.toLocaleString("pt-BR")} atualmente</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input type="number" min="0" value={goals.total_lideres ?? ""}
              onChange={e => setGoals(g => ({ ...g, total_lideres: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Definir meta..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {goals.total_lideres && (
            <>
              <ProgressBar value={liderCount} max={goals.total_lideres} color={liderRole?.color ?? "#b45309"} />
              <p className="text-xs text-gray-400 mt-1">
                {liderCount.toLocaleString("pt-BR")} / {goals.total_lideres.toLocaleString("pt-BR")} ({Math.min(100, Math.round(liderCount / goals.total_lideres * 100))}%)
              </p>
            </>
          )}
        </div>

        {/* Meta: Coordenadores */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: coordRole?.color ?? "#1d4ed8" }} />
              {coordRole?.label ?? "Coordenadores"}
            </p>
            <span className="text-xs text-gray-400">{coordCount.toLocaleString("pt-BR")} atualmente</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input type="number" min="0" value={goals.total_coordenadores ?? ""}
              onChange={e => setGoals(g => ({ ...g, total_coordenadores: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Definir meta..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {goals.total_coordenadores && (
            <>
              <ProgressBar value={coordCount} max={goals.total_coordenadores} color={coordRole?.color ?? "#1d4ed8"} />
              <p className="text-xs text-gray-400 mt-1">
                {coordCount.toLocaleString("pt-BR")} / {goals.total_coordenadores.toLocaleString("pt-BR")} ({Math.min(100, Math.round(coordCount / goals.total_coordenadores * 100))}%)
              </p>
            </>
          )}
        </div>

        <button onClick={saveGoals} disabled={saving}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
          <Save size={14} /> {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar metas"}
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ScorePage() {
  const [tab, setTab]       = useState<"avaliacao" | "dashboard">("avaliacao");
  const [roles, setRoles]   = useState<PersonRole[]>([]);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [statsDirty, setStatsDirty] = useState(false);

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles"); setRoles(await r.json());
  }, []);

  const loadStats = useCallback(async () => {
    const r = await fetch("/api/score"); setStats(await r.json());
    setStatsDirty(false);
  }, []);

  useEffect(() => { loadRoles(); loadStats(); }, []);

  // Recarrega stats quando muda para o Dashboard (se houve mudanças)
  useEffect(() => {
    if (tab === "dashboard" && statsDirty) loadStats();
  }, [tab]);

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Score</h1>
          <p className="text-sm text-gray-500">Avaliação NPS da rede de gestores</p>
        </div>
        <button onClick={loadStats} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Atualizar painel
        </button>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-6 bg-white border-b border-gray-200 shrink-0">
        {([
          { key: "avaliacao", label: "Avaliação" },
          { key: "dashboard", label: "Dashboard" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.key === "dashboard" && statsDirty && (
              <span className="ml-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === "avaliacao" && (
          <TabAvaliacao
            roles={roles}
            onScoreChange={() => setStatsDirty(true)}
          />
        )}
        {tab === "dashboard" && (
          <TabDashboard stats={stats} roles={roles} />
        )}
      </div>
    </div>
  );
}
