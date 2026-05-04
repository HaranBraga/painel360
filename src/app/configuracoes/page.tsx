"use client";
import { useState, useEffect, useCallback } from "react";
import { Edit2, Briefcase, KeyRound, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { type PersonRole } from "@/components/ui/RoleBadge";
import toast from "react-hot-toast";

const INP = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const presets = ["#6366f1", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#6b7280", "#14b8a6", "#f97316"];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: value }} />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-gray-800 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

function RoleForm({ initial, onSave, onClose }: { initial: PersonRole; onSave: () => void; onClose: () => void }) {
  const [label, setLabel] = useState(initial.label);
  const [color, setColor] = useState(initial.color);
  const [bgColor, setBgColor] = useState(initial.bgColor);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch(`/api/roles/${initial.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, color, bgColor }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success("Cargo atualizado!"); onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do cargo *</label>
        <input required value={label} onChange={(e) => setLabel(e.target.value)} className={INP} />
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor do texto</label><ColorPicker value={color} onChange={setColor} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Cor de fundo</label><ColorPicker value={bgColor} onChange={setBgColor} /></div>
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-500">Prévia:</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, backgroundColor: bgColor }}>{label || "Cargo"}</span>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

// ─── Campos personalizados ───────────────────────────────────────────────────

const FIELD_TYPES = [
  { key: "text",    label: "Texto" },
  { key: "number",  label: "Número" },
  { key: "date",    label: "Data" },
  { key: "boolean", label: "Sim / Não" },
  { key: "select",  label: "Lista (escolha)" },
];

function CamposSection() {
  const [fields, setFields] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/custom-fields");
    setFields(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Campos personalizados</h2>
          <p className="text-sm text-gray-500 mt-0.5">Adicione campos customizados ao cadastro de pessoas. Aparecem na ficha 360.</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
          <Plus size={14} /> Novo campo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {fields.length === 0 && !adding && <p className="py-10 text-center text-gray-400 text-sm">Nenhum campo personalizado</p>}

        {adding && <CampoForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}

        {fields.map(f => (
          edit === f.id ? (
            <CampoForm key={f.id} initial={f} onCancel={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
          ) : (
            <div key={f.id} className="flex items-center gap-4 px-4 py-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">{f.label}</p>
                  <code className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f.key}</code>
                  <span className="text-[10px] text-gray-400">{FIELD_TYPES.find(t => t.key === f.type)?.label ?? f.type}</span>
                  {f.required && <span className="text-[10px] text-red-500">obrigatório</span>}
                </div>
                {f.type === "select" && (f.options?.length ?? 0) > 0 && (
                  <p className="text-[11px] text-gray-400 mt-0.5">Opções: {f.options.join(", ")}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => setEdit(f.id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                <button onClick={async () => {
                  if (!confirm(`Excluir campo "${f.label}"? Os valores existentes nas pessoas ficam preservados, mas não aparecem mais.`)) return;
                  await fetch(`/api/custom-fields/${f.id}`, { method: "DELETE" });
                  load();
                }} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        ))}
      </div>
    </section>
  );
}

function CampoForm({ initial, onCancel, onSaved }: any) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [key,   setKey]   = useState(initial?.key ?? "");
  const [type,  setType]  = useState(initial?.type ?? "text");
  const [options, setOptions] = useState<string[]>(initial?.options ?? []);
  const [newOpt, setNewOpt] = useState("");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial?.id) return;
    const k = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9_\s]/g, "").trim().replace(/\s+/g, "_").slice(0, 30);
    setKey(k);
  }, [label, initial?.id]);

  async function save() {
    if (!label.trim() || !key.trim()) { toast.error("Label e key obrigatórios"); return; }
    if (type === "select" && options.length === 0) { toast.error("Adicione pelo menos uma opção"); return; }
    setSaving(true);
    try {
      const url = initial?.id ? `/api/custom-fields/${initial.id}` : "/api/custom-fields";
      const method = initial?.id ? "PUT" : "POST";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, label, type, options, required }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success(initial?.id ? "Atualizado" : "Criado");
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="px-4 py-4 bg-gray-50 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Rótulo</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Segmento" className={INP} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Chave (id interno)</label>
          <input value={key} onChange={e => setKey(e.target.value)} disabled={!!initial?.id}
            className={INP + " font-mono disabled:bg-gray-100 disabled:text-gray-400"} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Tipo</label>
        <div className="flex gap-1.5 flex-wrap">
          {FIELD_TYPES.map(t => (
            <button key={t.key} type="button" onClick={() => setType(t.key)}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${type === t.key ? "bg-brand-600 text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {type === "select" && (
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Opções</label>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                  <span className="text-xs">{o}</span>
                  <button onClick={() => setOptions(p => p.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={newOpt} onChange={e => setNewOpt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newOpt.trim()) { e.preventDefault(); setOptions(p => [...p, newOpt.trim()]); setNewOpt(""); } }}
              placeholder="Nova opção..." className={INP + " flex-1"} />
            <button type="button" onClick={() => { if (newOpt.trim()) { setOptions(p => [...p, newOpt.trim()]); setNewOpt(""); } }}
              className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm">+</button>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
        <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)}
          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
        Campo obrigatório
      </label>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 text-gray-600 border border-gray-200 rounded-lg hover:bg-white">Cancelar</button>
        <button onClick={save} disabled={saving} className="text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium">
          {saving ? "Salvando..." : (initial?.id ? "Atualizar" : "Criar campo")}
        </button>
      </div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "cargos", label: "Cargos",                icon: Briefcase },
  { key: "campos", label: "Campos personalizados", icon: KeyRound  },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<TabKey>("cargos");
  const [roles, setRoles] = useState<PersonRole[]>([]);
  const [editing, setEditing] = useState<PersonRole | null>(null);

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles");
    setRoles(await r.json());
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Gerencie os cargos e campos do painel</p>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 p-3 shrink-0">
          <nav className="flex flex-col gap-1">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {tab === "cargos" && (
              <section>
                <div className="mb-4">
                  <h2 className="font-semibold text-gray-900">Cargos e Hierarquia</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Edite os nomes e cores. A ordem reflete a hierarquia (1 = topo).</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-4 px-4 py-3 group">
                      <span className="text-xs text-gray-400 w-5 text-center font-mono">{role.level + 1}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: role.color, backgroundColor: role.bgColor }}>{role.label}</span>
                      <span className="flex-1 text-xs text-gray-400 font-mono">{role.key}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(role)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "campos" && <CamposSection />}
          </div>
        </div>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar Cargo" size="sm">
        {editing && (
          <RoleForm initial={editing} onSave={() => { setEditing(null); loadRoles(); }} onClose={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
