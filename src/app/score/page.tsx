"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, TrendingUp, Users, Star } from "lucide-react";
import { type PersonRole } from "@/components/ui/RoleBadge";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ScoredContact {
  id: string; name: string; phone: string;
  roleId: string; role: PersonRole;
  parentId?: string | null;
  parent?: { id: string; name: string; score: number | null } | null;
  score: number | null;
  scoreNote?: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classify(score: number | null): "seguro" | "promissor" | "incerto" | "none" {
  if (score === null) return "none";
  if (score >= 8) return "seguro";
  if (score >= 5) return "promissor";
  return "incerto";
}

const CLASS_CONFIG = {
  seguro:    { label: "Seguro",    color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" },
  promissor: { label: "Promissor", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
  incerto:   { label: "Incerto",   color: "#b91c1c", bg: "#fee2e2", border: "#fecaca" },
  none:      { label: "Sem nota",  color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
};

function ClassBadge({ score }: { score: number | null }) {
  const c = classify(score);
  const cfg = CLASS_CONFIG[c];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">—</span>;
  const c = classify(score);
  const cfg = CLASS_CONFIG[c];
  return (
    <span className="text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {score % 1 === 0 ? score : score.toFixed(1)}
    </span>
  );
}

// ─── Editor de score inline ───────────────────────────────────────────────────

function ScoreEditor({ contact, onChange }: {
  contact: ScoredContact; onChange: (id: string, score: number | null, note?: string) => void;
}) {
  const [val, setVal] = useState(contact.score !== null ? String(contact.score) : "");
  const [saving, setSaving] = useState(false);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => { setVal(contact.score !== null ? String(contact.score) : ""); }, [contact.score]);

  function commit(raw: string) {
    const n = raw === "" ? null : Math.min(10, Math.max(0, parseFloat(raw)));
    if (isNaN(n as any) && raw !== "") return;
    clearTimeout(timer.current);
    setSaving(true);
    timer.current = setTimeout(() => {
      onChange(contact.id, n);
      setSaving(false);
    }, 500);
  }

  const effectiveScore = contact.score ?? contact.parent?.score ?? null;
  const inherited = contact.score === null && contact.parent?.score !== null && contact.parent?.score !== undefined;

  return (
    <div className="flex items-center gap-2">
      {inherited && (
        <div className="flex items-center gap-1">
          <ScorePill score={effectiveScore} />
          <span className="text-xs text-gray-400 italic">herdado</span>
        </div>
      )}
      <div className={`flex items-center gap-1 border rounded-lg overflow-hidden ${saving ? "border-brand-300" : "border-gray-200"}`}>
        <button type="button"
          onClick={() => { const n = Math.max(0, (contact.score ?? 0) - 1); setVal(String(n)); commit(String(n)); }}
          className="px-2 py-1 text-gray-500 hover:bg-gray-100 text-sm font-bold">−</button>
        <input
          type="number" min="0" max="10" step="1"
          value={val}
          onChange={e => { setVal(e.target.value); commit(e.target.value); }}
          placeholder="—"
          className="w-10 text-center text-sm font-semibold focus:outline-none py-1 bg-transparent"
          style={{ color: contact.score !== null ? CLASS_CONFIG[classify(contact.score)].color : "#9ca3af" }}
        />
        <button type="button"
          onClick={() => { const n = Math.min(10, (contact.score ?? 0) + 1); setVal(String(n)); commit(String(n)); }}
          className="px-2 py-1 text-gray-500 hover:bg-gray-100 text-sm font-bold">+</button>
      </div>
      {contact.score !== null && <ClassBadge score={contact.score} />}
    </div>
  );
}

// ─── Painel de indicadores ────────────────────────────────────────────────────

function StatsPanel({ stats, roles }: { stats: Stats; roles: PersonRole[] }) {
  const pct = (n: number) => stats.scored > 0 ? Math.round(n / stats.scored * 100) : 0;
  const classifiedPct = stats.total > 0 ? Math.round(stats.scored / stats.total * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Cards de classificação */}
      <div className="grid grid-cols-3 gap-3">
        {(["seguro", "promissor", "incerto"] as const).map(cls => {
          const cfg = CLASS_CONFIG[cls];
          const count = stats.byClass[cls];
          return (
            <div key={cls} className="bg-white rounded-xl border p-4" style={{ borderColor: cfg.border }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                <p className="text-xs font-semibold text-gray-600">{cfg.label}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{pct(count)}% dos classificados</p>
            </div>
          );
        })}
      </div>

      {/* Resumo geral */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Star size={11} /> Nota média geral</p>
          <p className="text-2xl font-bold text-gray-900">{stats.avg ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Users size={11} /> Classificados</p>
          <p className="text-2xl font-bold text-gray-900">{stats.scored}<span className="text-sm text-gray-400 font-normal">/{stats.total}</span></p>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${classifiedPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{classifiedPct}% da base</p>
        </div>
      </div>

      {/* Por cargo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp size={14} /> Nota média por cargo</p>
        </div>
        {stats.byRole.map(r => (
          <div key={r.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full w-28 text-center"
                style={{ color: r.color, backgroundColor: r.bgColor }}>{r.label}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">{r.avg ?? "—"}</span>
                  <span className="text-xs text-gray-400">{r.scored} classificados</span>
                </div>
                {r.scored > 0 && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500" style={{ width: `${r.scored > 0 ? r.seguro / r.scored * 100 : 0}%` }} />
                    <div className="h-full bg-amber-400" style={{ width: `${r.scored > 0 ? r.promissor / r.scored * 100 : 0}%` }} />
                    <div className="h-full bg-red-400" style={{ width: `${r.scored > 0 ? r.incerto / r.scored * 100 : 0}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ScorePage() {
  const [contacts, setContacts]   = useState<ScoredContact[]>([]);
  const [roles, setRoles]         = useState<PersonRole[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const scoreTimers               = useRef<Record<string, NodeJS.Timeout>>({});
  const searchDebounce            = useRef<NodeJS.Timeout>();

  const roleSelectInclude = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };

  const loadStats = useCallback(async () => {
    const r = await fetch("/api/score");
    setStats(await r.json());
  }, []);

  const loadContacts = useCallback(async (p = 1, q = search, r = roleFilter) => {
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

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles"); setRoles(await r.json());
  }, []);

  useEffect(() => { loadRoles(); loadStats(); loadContacts(1); }, []);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => loadContacts(1, v, roleFilter), 400);
  }

  function updateScore(id: string, score: number | null) {
    // Atualiza local imediatamente
    setContacts(cs => cs.map(c => c.id === id ? { ...c, score } : c));

    clearTimeout(scoreTimers.current[id]);
    scoreTimers.current[id] = setTimeout(async () => {
      await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      loadStats();
    }, 600);
  }

  // Filtro de classificação (client-side)
  const displayed = classFilter
    ? contacts.filter(c => {
        const eff = c.score ?? c.parent?.score ?? null;
        return classify(eff) === classFilter;
      })
    : contacts;

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Score</h1>
          <p className="text-sm text-gray-500">Avaliação NPS da rede</p>
        </div>
        <button onClick={() => { loadStats(); loadContacts(page); }}
          className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Atualizar
        </button>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {/* Lista de pessoas para avaliar */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Buscar por nome..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); loadContacts(1, search, e.target.value); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Todos os cargos</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Todas as classificações</option>
              <option value="seguro">Seguro (8-10)</option>
              <option value="promissor">Promissor (5-7)</option>
              <option value="incerto">Incerto (0-4)</option>
              <option value="none">Sem nota</option>
            </select>
            <span className="text-xs text-gray-400">{total.toLocaleString("pt-BR")} pessoas</span>
          </div>

          {/* Legenda de classificação */}
          <div className="flex items-center gap-3">
            {(["seguro", "promissor", "incerto"] as const).map(cls => (
              <div key={cls} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLASS_CONFIG[cls].color }} />
                <span className="text-xs text-gray-500">{CLASS_CONFIG[cls].label}: <strong>{cls === "seguro" ? "8–10" : cls === "promissor" ? "5–7" : "0–4"}</strong></span>
              </div>
            ))}
          </div>

          {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

          {/* Lista */}
          {!loading && (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {displayed.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">Nenhuma pessoa encontrada</div>
              )}
              {displayed.map(c => {
                const effectiveScore = c.score ?? c.parent?.score ?? null;
                return (
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
                        {c.parent && (
                          <span className="text-xs text-gray-400">▸ {c.parent.name}</span>
                        )}
                      </div>
                      {c._count && c._count.children > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{c._count.children} na rede</p>
                      )}
                    </div>
                    <ScoreEditor contact={c} onChange={updateScore} />
                  </div>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => loadContacts(page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
              <span className="text-sm text-gray-500">Página {page} de {pages}</span>
              <button disabled={page >= pages} onClick={() => loadContacts(page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima →</button>
            </div>
          )}
        </div>

        {/* Painel de indicadores */}
        <div className="w-80 shrink-0 border-l border-gray-200 overflow-y-auto p-4 bg-gray-50">
          {stats ? (
            <StatsPanel stats={stats} roles={roles} />
          ) : (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
