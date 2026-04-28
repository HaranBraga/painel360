"use client";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  Plus, Search, ChevronRight, Trash2, Edit2, List, Network,
  Users, ChevronDown, ZoomIn, ZoomOut, Maximize2, RefreshCw,
} from "lucide-react";
import { RoleBadge, type PersonRole } from "@/components/ui/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string; name: string; phone: string; email?: string;
  roleId: string; role: PersonRole; parentId?: string | null;
  parent?: { id: string; name: string; role: PersonRole } | null;
  notes?: string; dataNascimento?: string; genero?: string;
  rua?: string; bairro?: string; cidade?: string; zona?: string;
  _count?: { children: number };
}

interface TreeContact {
  id: string; name: string; parentId: string | null;
  role: PersonRole;
}

function withBR(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}
function stripBR(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("55") ? d.slice(2) : d;
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function PersonForm({ initial, onSave, onClose, contacts, roles }: {
  initial?: Partial<Contact>; onSave: () => void; onClose: () => void;
  contacts: Contact[]; roles: PersonRole[];
}) {
  const [form, setForm] = useState({
    name: "", email: "", notes: "", genero: "", rua: "", bairro: "", cidade: "", zona: "",
    ...initial,
    phone: initial?.phone ? stripBR(initial.phone) : "",
    roleId: initial?.roleId ?? roles[roles.length - 1]?.id ?? "",
    parentId: initial?.parentId ?? "",
    dataNascimento: initial?.dataNascimento ? initial.dataNascimento.slice(0, 10) : "",
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
        body: JSON.stringify({ ...form, phone: withBR(form.phone), parentId: form.parentId || null }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
      toast.success(initial?.id ? "Pessoa atualizada!" : "Pessoa cadastrada!");
      onSave();
    } finally { setSaving(false); }
  }

  const currentRole = roles.find(r => r.id === form.roleId);
  const eligibleParents = contacts.filter((c) => {
    const pr = roles.find(r => r.id === c.roleId);
    return c.id !== initial?.id && pr && currentRole && pr.level < currentRole.level;
  });

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Identificação */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identificação</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input required value={form.name} onChange={f("name")} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone * <span className="text-xs text-gray-400">DDD + número</span></label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 select-none">+55</span>
              <input required value={form.phone} onChange={f("phone")} placeholder="11999999999" className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={form.email} onChange={f("email")} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <select value={form.roleId} onChange={f("roleId")} className={input}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável (superior)</label>
            <select value={form.parentId} onChange={f("parentId")} className={input}>
              <option value="">— Nenhum —</option>
              {eligibleParents.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.role.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados Pessoais</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
            <input type="date" value={form.dataNascimento} onChange={f("dataNascimento")} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <select value={form.genero} onChange={f("genero")} className={input}>
              <option value="">— Selecionar —</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Endereço</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
            <input value={form.rua} onChange={f("rua")} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input value={form.bairro} onChange={f("bairro")} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input value={form.cidade} onChange={f("cidade")} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
            <select value={form.zona} onChange={f("zona")} className={input}>
              <option value="">— Selecionar —</option>
              <option value="Urbano">Urbano</option>
              <option value="Rural">Rural</option>
            </select>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea rows={2} value={form.notes} onChange={f("notes")} className={`${input} resize-none`} />
      </div>

      <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
        <button disabled={saving} className="px-5 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">{saving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

// ─── Vista em lista (paginada) ────────────────────────────────────────────────

function ListView({ roles, onEdit, onDelete }: {
  roles: PersonRole[]; onEdit: (c: Contact) => void; onDelete: (c: Contact) => void;
}) {
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading]     = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const load = useCallback(async (p = 1, q = search, r = roleFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (q) params.set("search", q);
      if (r) params.set("roleId", r);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(1); }, []);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, v, roleFilter), 400);
  }
  function onRoleFilter(v: string) {
    setRoleFilter(v);
    load(1, search, v);
  }

  const grouped = roles.reduce<Record<string, Contact[]>>((acc, role) => {
    acc[role.id] = contacts.filter((c) => c.roleId === role.id);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por nome..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={roleFilter} onChange={(e) => onRoleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos os cargos</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{total.toLocaleString("pt-BR")} pessoas</span>
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && contacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users size={40} className="mb-3 opacity-30" />
          <p className="font-medium">Nenhuma pessoa encontrada</p>
        </div>
      )}

      {!loading && roles.map((role) => {
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
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0" style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                      {c.parent && <span className="text-xs text-gray-400 flex items-center gap-0.5"><ChevronRight size={10} />{c.parent.name}</span>}
                      {c.cidade && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.cidade}</span>}
                      {c.zona   && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.zona}</span>}
                    </div>
                    {c._count && c._count.children > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{c._count.children} na rede</p>
                    )}
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

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
          <span className="text-sm text-gray-500">Página {page} de {pages}</span>
          <button disabled={page >= pages} onClick={() => load(page + 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima →</button>
        </div>
      )}
    </div>
  );
}

// ─── Organograma escalável com zoom ──────────────────────────────────────────

function buildNetworkSizes(contacts: TreeContact[]) {
  const childrenMap = new Map<string, string[]>();
  for (const c of contacts) {
    if (c.parentId) {
      if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
      childrenMap.get(c.parentId)!.push(c.id);
    }
  }
  const sizes = new Map<string, number>();
  function getSize(id: string): number {
    if (sizes.has(id)) return sizes.get(id)!;
    const ch = childrenMap.get(id) ?? [];
    const sz = ch.reduce((s, cid) => s + 1 + getSize(cid), 0);
    sizes.set(id, sz);
    return sz;
  }
  for (const c of contacts) getSize(c.id);
  return { childrenMap, sizes };
}

const OrgCard = memo(function OrgCard({ contact, networkSize, onEdit, onDelete }: {
  contact: TreeContact; networkSize: number;
  onEdit: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div
      className="relative group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-200 transition-all w-36"
      style={{ borderLeftWidth: 3, borderLeftColor: contact.role.color }}
    >
      <div className="p-2.5 flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: contact.role.bgColor, color: contact.role.color }}>
          {contact.name[0].toUpperCase()}
        </div>
        <p className="font-semibold text-gray-900 text-xs text-center leading-tight w-full truncate px-1" title={contact.name}>{contact.name}</p>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ color: contact.role.color, backgroundColor: contact.role.bgColor }}>{contact.role.label}</span>
        {networkSize > 0 && (
          <span className="text-xs text-gray-400">{networkSize.toLocaleString("pt-BR")} na rede</span>
        )}
      </div>
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(contact.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400"><Edit2 size={10} /></button>
        <button onClick={() => onDelete(contact.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={10} /></button>
      </div>
    </div>
  );
});

const OrgNode = memo(function OrgNode({ id, childrenMap, contactMap, sizes, defaultExpanded, onEdit, onDelete }: {
  id: string; childrenMap: Map<string, string[]>; contactMap: Map<string, TreeContact>;
  sizes: Map<string, number>; defaultExpanded: boolean;
  onEdit: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contact = contactMap.get(id);
  if (!contact) return null;

  const children = childrenMap.get(id) ?? [];
  const networkSize = sizes.get(id) ?? 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <OrgCard contact={contact} networkSize={networkSize} onEdit={onEdit} onDelete={onDelete} />
        {children.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-300 transition-colors z-10"
          >
            <ChevronDown size={11} className={`transition-transform duration-200 ${expanded ? "" : "-rotate-180"}`} />
          </button>
        )}
      </div>

      {expanded && children.length > 0 && (
        <div className="flex flex-col items-center mt-1">
          <div className="w-px bg-gray-200" style={{ height: 28 }} />
          <div className="flex">
            {children.map((childId, i) => (
              <div key={childId} className="flex flex-col items-center relative" style={{ paddingLeft: 16, paddingRight: 16 }}>
                {i > 0 && <div className="absolute top-0 left-0 w-1/2 bg-gray-200" style={{ height: 1 }} />}
                {i < children.length - 1 && <div className="absolute top-0 right-0 w-1/2 bg-gray-200" style={{ height: 1 }} />}
                <div className="w-px bg-gray-200" style={{ height: 28 }} />
                <OrgNode
                  id={childId}
                  childrenMap={childrenMap}
                  contactMap={contactMap}
                  sizes={sizes}
                  defaultExpanded={contact.role.level < 1}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function OrgView({ onEditById, onDeleteById }: {
  onEditById: (id: string) => void; onDeleteById: (id: string) => void;
}) {
  const [contacts, setContacts] = useState<TreeContact[]>([]);
  const [loading, setLoading]   = useState(true);
  // viewport unificado — zoom + pan num único state para evitar closures desatualizadas
  const [vp, setVp] = useState({ zoom: 0.9, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/contacts/tree");
      setContacts(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll = zoom ao cursor (estado unificado resolve closure stale)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaMode === 1 ? 0.05 : 0.001;
      const delta = e.deltaY * factor;
      setVp(prev => {
        const next = Math.min(Math.max(prev.zoom * (1 - delta), 0.1), 4);
        return {
          zoom: next,
          x: mx - (mx - prev.x) * (next / prev.zoom),
          y: my - (my - prev.y) * (next / prev.zoom),
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag = pan (ignora clicks em botões)
  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setVp(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
  }
  function onMouseUp() { setIsDragging(false); }

  const { childrenMap, sizes } = buildNetworkSizes(contacts);
  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const roots = contacts.filter(c => !c.parentId);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando rede...</p>
      </div>
    </div>
  );

  if (contacts.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <Network size={40} className="mb-3 opacity-30" />
      <p className="font-medium">Nenhuma pessoa cadastrada</p>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-hidden select-none"
      style={{ cursor: isDragging ? "grabbing" : "grab", background: "#f8fafc" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Grid pontilhado estilo Figma */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
          backgroundSize: `${28 * vp.zoom}px ${28 * vp.zoom}px`,
          backgroundPosition: `${vp.x % (28 * vp.zoom)}px ${vp.y % (28 * vp.zoom)}px`,
          opacity: 0.5,
        }}
      />

      {/* Canvas — max-content evita que width:100% quebre o flex horizontal */}
      <div
        style={{
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0, left: 0,
          width: "max-content",
          minWidth: "100%",
          willChange: "transform",
        }}
      >
        <div className="flex gap-20 justify-center pt-10 px-16 pb-20">
          {roots.map(root => (
            <OrgNode
              key={root.id}
              id={root.id}
              childrenMap={childrenMap}
              contactMap={contactMap}
              sizes={sizes}
              defaultExpanded={true}
              onEdit={onEditById}
              onDelete={onDeleteById}
            />
          ))}
        </div>
      </div>

      {/* Controles de zoom */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-md p-1.5 pointer-events-auto">
        <button onClick={() => setVp(v => ({ ...v, zoom: Math.min(v.zoom + 0.15, 4) }))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"><ZoomIn size={14} /></button>
        <span className="text-xs text-gray-500 w-10 text-center font-mono">{Math.round(vp.zoom * 100)}%</span>
        <button onClick={() => setVp(v => ({ ...v, zoom: Math.max(v.zoom - 0.15, 0.1) }))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"><ZoomOut size={14} /></button>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <button onClick={() => setVp({ zoom: 0.9, x: 0, y: 0 })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600" title="Resetar"><Maximize2 size={13} /></button>
        <button onClick={load} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600" title="Recarregar"><RefreshCw size={13} /></button>
      </div>

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-gray-100 pointer-events-none">
        Scroll = zoom · Arrastar = mover · {contacts.length.toLocaleString("pt-BR")} pessoas
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PessoasPage() {
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [roles, setRoles]             = useState<PersonRole[]>([]);
  const [view, setView]               = useState<"list" | "org">("list");
  const [modal, setModal]             = useState<"new" | "edit" | null>(null);
  const [editing, setEditing]         = useState<Contact | null>(null);
  const [totalCount, setTotalCount]   = useState(0);

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles");
    setRoles(await r.json());
  }, []);

  const loadCount = useCallback(async () => {
    const r = await fetch("/api/contacts?limit=1");
    const d = await r.json();
    setTotalCount(d.total ?? 0);
    if (d.contacts) setAllContacts(d.contacts);
  }, []);

  useEffect(() => { loadRoles(); loadCount(); }, [loadRoles, loadCount]);

  async function del(contact: Contact) {
    if (!confirm(`Remover "${contact.name}"?`)) return;
    const r = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); toast.error(d.error); return; }
    toast.success("Pessoa removida");
    loadCount();
  }

  async function editById(id: string) {
    const r = await fetch(`/api/contacts/${id}`);
    const c = await r.json();
    setEditing(c);
    setModal("edit");
  }

  async function deleteById(id: string) {
    const contact = { id, name: "esta pessoa" } as Contact;
    del(contact);
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pessoas</h1>
          <p className="text-sm text-gray-500">{totalCount.toLocaleString("pt-BR")} pessoas cadastradas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              <List size={15} /> Lista
            </button>
            <button onClick={() => setView("org")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "org" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              <Network size={15} /> Rede
            </button>
          </div>
          <button onClick={() => { setEditing(null); setModal("new"); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nova Pessoa
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-4" style={{ display: view === "list" ? "block" : "none" }}>
        <ListView roles={roles} onEdit={(c) => { setEditing(c); setModal("edit"); }} onDelete={del} />
      </div>

      <div className="flex-1 overflow-hidden" style={{ display: view === "org" ? "flex" : "none", flexDirection: "column" }}>
        <OrgView onEditById={editById} onDeleteById={deleteById} />
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar Pessoa" : "Nova Pessoa"} size="xl">
        <PersonForm
          initial={editing ?? undefined}
          contacts={allContacts}
          roles={roles}
          onSave={() => { setModal(null); loadCount(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
