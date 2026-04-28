"use client";
import { useState, useEffect, useCallback } from "react";
import { Edit2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { type PersonRole } from "@/components/ui/RoleBadge";
import toast from "react-hot-toast";

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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        <input required value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cor do texto</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cor de fundo</label>
        <ColorPicker value={bgColor} onChange={setBgColor} />
      </div>
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

export default function ConfiguracoesPage() {
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
        <p className="text-sm text-gray-500">Gerencie os cargos e etiquetas da rede</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <section>
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Cargos e Hierarquia</h2>
            <p className="text-sm text-gray-500 mt-0.5">Edite os nomes e cores. A ordem reflete a hierarquia (1 = topo).</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-4 px-4 py-3 group">
                <span className="text-xs text-gray-400 w-5 text-center font-mono">{role.level + 1}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: role.color, backgroundColor: role.bgColor }}>
                  {role.label}
                </span>
                <span className="flex-1 text-xs text-gray-400 font-mono">{role.key}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(role)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar Cargo" size="sm">
        {editing && (
          <RoleForm
            initial={editing}
            onSave={() => { setEditing(null); loadRoles(); }}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
