"use client";
import { useState, useEffect } from "react";
import {
  Users, MessageSquare, ClipboardList, UsersRound, Megaphone, TrendingUp,
} from "lucide-react";
import { RelatoriosTabs } from "@/components/layout/RelatoriosTabs";

type Summary = {
  contatos: { total: number; novos7: number; novos30: number; porPapel: any[] };
  conversas: { abertas: number; porKanban: any[] };
  demandas: { total: number; abertas: number; porStatus: any[] };
  reunioes: { total: number; ultimos30: number; topLideres: any[] };
  campanhas: { total: number; porStatus: any[] };
};

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendentes",
  ENVIADO:  "Enviados",
  RESPONDEU: "Responderam",
  IGNOROU: "Ignorados",
  FALHOU: "Falharam",
};

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "#6b7280",
  ENVIADO:  "#3b82f6",
  RESPONDEU: "#10b981",
  IGNOROU: "#f59e0b",
  FALHOU:  "#ef4444",
};

export default function RelatoriosPage() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/relatorios/summary").then(r => r.json()).then(setData);
  }, []);

  if (!data) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Visão geral em números</p>
        </div>
        <RelatoriosTabs />
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigCard icon={Users}        label="Pessoas"           value={data.contatos.total} hint={`+${data.contatos.novos30} em 30 dias`} color="#6366f1" />
            <BigCard icon={MessageSquare} label="Conversas abertas" value={data.conversas.abertas} color="#3b82f6" />
            <BigCard icon={ClipboardList} label="Demandas abertas"  value={data.demandas.abertas} hint={`${data.demandas.total} no total`} color="#f59e0b" />
            <BigCard icon={UsersRound}    label="Reuniões"          value={data.reunioes.total} hint={`${data.reunioes.ultimos30} nos últimos 30 dias`} color="#10b981" />
          </div>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-600" /> Crescimento de pessoas
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Últimos 7 dias"  value={data.contatos.novos7}  total={data.contatos.total} />
              <Stat label="Últimos 30 dias" value={data.contatos.novos30} total={data.contatos.total} />
              <Stat label="Total"           value={data.contatos.total} />
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Pessoas por papel</h2>
            <div className="space-y-2">
              {data.contatos.porPapel.length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
              {data.contatos.porPapel.map((p: any) => (
                <Bar key={p.roleId} label={p.label} value={p.count} max={data.contatos.total} color={p.color} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Conversas por etapa do Kanban</h2>
              <div className="space-y-2">
                {data.conversas.porKanban.length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
                {data.conversas.porKanban.map((k: any) => (
                  <Bar key={k.statusId} label={k.name} value={k.count} max={data.conversas.abertas} color={k.color} />
                ))}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Demandas por status</h2>
              <div className="space-y-2">
                {data.demandas.porStatus.length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
                {data.demandas.porStatus.map((d: any) => (
                  <Bar key={d.status} label={d.status} value={d.count} max={data.demandas.total} color="#f59e0b" />
                ))}
              </div>
            </section>
          </div>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <UsersRound size={14} /> Top líderes (reuniões realizadas)
            </h2>
            {data.reunioes.topLideres.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma reunião realizada ainda</p>
            ) : (
              <div className="space-y-2">
                {data.reunioes.topLideres.map((l: any, i: number) => (
                  <div key={l.liderId ?? i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-gray-800 truncate">{l.name}</span>
                    <span className="text-sm font-semibold text-gray-700">{l.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Megaphone size={14} className="text-purple-600" /> Campanhas — status dos envios
            </h2>
            <p className="text-xs text-gray-400 mb-3">{data.campanhas.total} campanha(s) cadastrada(s)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.keys(STATUS_LABELS).map(k => {
                const cnt = data.campanhas.porStatus.find((s: any) => s.status === k)?.count ?? 0;
                return (
                  <div key={k} className="text-center px-3 py-3 rounded-lg" style={{ backgroundColor: STATUS_COLORS[k] + "11" }}>
                    <p className="text-2xl font-bold" style={{ color: STATUS_COLORS[k] }}>{cnt}</p>
                    <p className="text-[10px] uppercase mt-0.5" style={{ color: STATUS_COLORS[k] }}>{STATUS_LABELS[k]}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BigCard({ icon: Icon, label, value, hint, color }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <Icon size={20} style={{ color }} />
        <span className="text-3xl font-bold text-gray-900">{value.toLocaleString("pt-BR")}</span>
      </div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, total }: any) {
  const pct = total ? Math.round((value / total) * 100) : null;
  return (
    <div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString("pt-BR")}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}{pct !== null && ` · ${pct}%`}</p>
    </div>
  );
}

function Bar({ label, value, max, color }: any) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-32 text-gray-600 truncate shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color ?? "#6366f1", opacity: 0.85 }} />
      </div>
      <span className="w-10 text-right font-semibold text-gray-700">{value}</span>
    </div>
  );
}
