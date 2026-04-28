"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Phone, ChevronRight, Trash2, Edit2, List, GitBranch, Users, ChevronDown } from "lucide-react";
import { RoleBadge, type PersonRole } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

interface Contact {
  id: string; name: string; phone: string; email?: string;
  roleId: string; role: PersonRole; parentId?: string | null;
  parent?: { id: string; name: string; role: PersonRole } | null;
  notes?: string;
  _count?: { children: number };
  children?: Contact[];
}

// ─── Formulário de pessoa ─────────────────────────────────────────────────────

function PersonForm({ initial, onSave, onClose, contacts, roles }: {
  initial?: Partial<Contact>; onSave: () => void; onClose: () => void;
  contacts: Contact[]; roles: PersonRole[];
}) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", notes: "",
    ...initial,
    roleId: initial?.roleId ?? roles[roles.length - 1]?.id ?? "",
    parentId: initial?.parentId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url = initial?.id ? `/api/contacts/${initial.id}` : "/api/contacts";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success(initial?.id ? "Pessoa atualizada!" : "Pessoa cadastrada!");
      onSave();
    } finally { setSaving(false); }
  }

  const currentRole = roles.find(r => r.id === form.roleId);
  const eligibleParents = contacts.filter((c) => {
    const parentRole = roles.find(r => r.id === c.roleId);
    return c.id !== initial?.id && parentRole && currentRole && parentRole.level < currentRole.level;
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input required value={form.name} onChange={f("name")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone * <span className="text-gray-400">(somente números)</span></label>
          <input required value={form.phone} onChange={f("phone")} placeholder="5511999999999" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input type="email" value={form.email} onChange={f("email")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
          <select value={form.roleId} onChange={f("roleId")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsável (superior)</label>
          <select value={form.parentId} onChange={f("parentId")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— Nenhum —</option>
            {eligibleParents.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role.label})</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea rows={3} value={form.notes} onChange={f("notes")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

// ─── Vista em lista ───────────────────────────────────────────────────────────

function ListView({ contacts, roles, onEdit, onDelete }: {
  contacts: Contact[]; roles: PersonRole[];
  onEdit: (c: Contact) => void; onDelete: (c: Contact) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filtered = contacts.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchRole = !roleFilter || c.roleId === roleFilter;
    return matchSearch && matchRole;
  });

  const grouped = roles.reduce<Record<string, Contact[]>>((acc, role) => {
    acc[role.id] = filtered.filter((c) => c.roleId === role.id);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou telefone..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos os cargos</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users size={40} className="mb-3 opacity-30" />
          <p className="font-medium">Nenhuma pessoa encontrada</p>
        </div>
      )}

      {roles.map((role) => {
        const group = grouped[role.id] ?? [];
        if (group.length === 0) return null;
        return (
          <div key={role.id}>
            <div className="flex items-center gap-2 mb-2">
              <RoleBadge role={role} />
              <span className="text-xs text-gray-400">{group.length}</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {group.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 group">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                      {c.parent && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <ChevronRight size={10} />{c.parent.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>
                      {c._count && c._count.children > 0 && (
                        <span className="text-gray-400">{c._count.children} subordinado{c._count.children > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(c)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(c)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Nó da árvore hierárquica ─────────────────────────────────────────────────

function TreeNode({ contact, allContacts, roles, depth, onEdit, onDelete }: {
  contact: Contact; allContacts: Contact[]; roles: PersonRole[];
  depth: number; onEdit: (c: Contact) => void; onDelete: (c: Contact) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allContacts.filter((c) => c.parentId === contact.id);

  const indentStyle = depth === 0 ? {} : { paddingLeft: `${depth * 24}px` };

  return (
    <div>
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group cursor-pointer"
        style={indentStyle}
        onClick={() => children.length > 0 && setExpanded((v) => !v)}
      >
        {/* Expand toggle */}
        <div className="w-5 shrink-0 flex items-center justify-center">
          {children.length > 0 ? (
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${expanded ? "" : "-rotate-90"}`}
            />
          ) : (
            <span className="w-3.5 h-px bg-gray-200 block ml-1" />
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
          {contact.name[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{contact.name}</span>
            <RoleBadge role={contact.role} />
            {children.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                {children.length} subordinado{children.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Phone size={10} />{contact.phone}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onEdit(contact)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={13} /></button>
          <button onClick={() => onDelete(contact)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={13} /></button>
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div className="border-l border-gray-100 ml-9">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              contact={child}
              allContacts={allContacts}
              roles={roles}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeView({ contacts, roles, onEdit, onDelete }: {
  contacts: Contact[]; roles: PersonRole[];
  onEdit: (c: Contact) => void; onDelete: (c: Contact) => void;
}) {
  const roots = contacts.filter((c) => !c.parentId);

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <GitBranch size={40} className="mb-3 opacity-30" />
        <p className="font-medium">Nenhuma pessoa cadastrada</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {roots.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-400">Nenhuma pessoa sem responsável definido.</p>
      ) : (
        roots.map((root) => (
          <TreeNode
            key={root.id}
            contact={root}
            allContacts={contacts}
            roles={roles}
            depth={0}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PessoasPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [roles, setRoles] = useState<PersonRole[]>([]);
  const [view, setView] = useState<"list" | "tree">("list");
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles");
    setRoles(await r.json());
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/contacts");
    setContacts(await r.json());
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);
  useEffect(() => { load(); }, [load]);

  async function del(contact: Contact) {
    if (!confirm(`Remover "${contact.name}"?`)) return;
    const r = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
    toast.success("Pessoa removida");
    load();
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setModal("edit");
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pessoas</h1>
          <p className="text-sm text-gray-500">{contacts.length} pessoas cadastradas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle de visualização */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <List size={15} /> Lista
            </button>
            <button
              onClick={() => setView("tree")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "tree" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <GitBranch size={15} /> Rede
            </button>
          </div>
          <button
            onClick={() => { setEditing(null); setModal("new"); }}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> Nova Pessoa
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {view === "list" ? (
          <ListView contacts={contacts} roles={roles} onEdit={openEdit} onDelete={del} />
        ) : (
          <TreeView contacts={contacts} roles={roles} onEdit={openEdit} onDelete={del} />
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "edit" ? "Editar Pessoa" : "Nova Pessoa"}
      >
        <PersonForm
          initial={editing ?? undefined}
          contacts={contacts}
          roles={roles}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
