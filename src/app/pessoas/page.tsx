"use client";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  Plus, Search, ChevronRight, Trash2, Edit2, List, Network,
  Users, ChevronDown, ZoomIn, ZoomOut, Maximize2, RefreshCw, X, UserPlus,
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
  id: string; name: string; parentId: string | null; role: PersonRole;
}

function withBR(p: string) { const d = p.replace(/\D/g, ""); return d.startsWith("55") ? d : `55${d}`; }
function stripBR(p: string) { const d = p.replace(/\D/g, ""); return d.startsWith("55") ? d.slice(2) : d; }

// ─── Busca de responsável (autocomplete) ──────────────────────────────────────

function ParentSearch({ parentId, parentName, onChange, maxLevel, excludeId }: {
  parentId: string; parentName: string;
  onChange: (id: string, name: string) => void;
  maxLevel: number; excludeId?: string;
}) {
  const [query, setQuery]     = useState(parentName);
  const [results, setResults] = useState<Contact[]>([]);
  const [open, setOpen]       = useState(false);
  const debounce              = useRef<NodeJS.Timeout>();

  // Sincroniza quando parent muda externamente (ao abrir o form com pai pré-definido)
  useEffect(() => { setQuery(parentName); }, [parentName]);

  function search(q: string) {
    setQuery(q);
    if (!q) { onChange("", ""); setResults([]); setOpen(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const r = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=20`);
      const d = await r.json();
      setResults((d.contacts ?? []).filter((c: Contact) => c.role.level < maxLevel && c.id !== excludeId));
      setOpen(true);
    }, 300);
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => search(e.target.value)}
        onFocus={() => { if (query && !parentId) search(query); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar responsável pelo nome..."
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8"
      />
      {parentId && (
        <button type="button" onClick={() => { onChange("", ""); setQuery(""); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={13} />
        </button>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {results.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => { onChange(c.id, c.name); setQuery(c.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>{c.name[0]}</div>
              <div>
                <p className="font-medium text-gray-900">{c.name}</p>
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ color: c.role.color, backgroundColor: c.role.bgColor }}>{c.role.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length > 1 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-3 text-sm text-gray-400">
          Nenhum responsável encontrado
        </div>
      )}
    </div>
  );
}

// ─── Formulário ───────────────────────────────────────────────────────────────

interface FormPreset {
  id?: string;                  // undefined = novo cadastro
  name?: string; phone?: string; email?: string;
  roleId?: string;
  parentId?: string; parentName?: string;
  notes?: string; dataNascimento?: string; genero?: string;
  rua?: string; bairro?: string; cidade?: string; zona?: string;
}

function emptyFields() {
  return { name: "", phone: "", email: "", notes: "", dataNascimento: "", genero: "", rua: "", bairro: "", cidade: "", zona: "" };
}

function PersonForm({ preset, roles, onSave, onSaveAndMore, onClose }: {
  preset: FormPreset; roles: PersonRole[];
  onSave: () => void;
  onSaveAndMore: (keepPreset: FormPreset) => void;
  onClose: () => void;
}) {
  const defaultRoleId = roles[roles.length - 1]?.id ?? "";

  const [form, setForm] = useState({
    ...emptyFields(),
    roleId: preset.roleId ?? defaultRoleId,
    parentId: preset.parentId ?? "",
    parentName: preset.parentName ?? "",
    // se for edição, preenche tudo
    ...(preset.id ? {
      name: preset.name ?? "", phone: preset.phone ? stripBR(preset.phone) : "",
      email: preset.email ?? "", notes: preset.notes ?? "",
      dataNascimento: preset.dataNascimento?.slice(0, 10) ?? "",
      genero: preset.genero ?? "", rua: preset.rua ?? "", bairro: preset.bairro ?? "",
      cidade: preset.cidade ?? "", zona: preset.zona ?? "",
    } : {}),
  });
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const currentRole = roles.find(r => r.id === form.roleId);

  async function doSave() {
    setSaving(true);
    try {
      const method = preset.id ? "PUT" : "POST";
      const url = preset.id ? `/api/contacts/${preset.id}` : "/api/contacts";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, phone: withBR(form.phone),
          parentId: form.parentId || null,
          dataNascimento: form.dataNascimento || null,
        }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error); return false; }
      return true;
    } finally { setSaving(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await doSave()) { toast.success(preset.id ? "Pessoa atualizada!" : "Pessoa cadastrada!"); onSave(); }
  }

  async function submitAndMore(e: React.MouseEvent) {
    e.preventDefault();
    if (await doSave()) {
      toast.success("Cadastrado! Formulário pronto para o próximo.");
      // mantém cargo e responsável, limpa dados pessoais
      onSaveAndMore({ roleId: form.roleId, parentId: form.parentId, parentName: form.parentName });
    }
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Banner de contexto (quando adicionando dentro de uma rede) */}
      {form.parentId && form.parentName && !preset.id && (
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2.5">
          <UserPlus size={14} className="text-brand-600 shrink-0" />
          <span className="text-sm text-brand-700">
            Adicionando na rede de <strong>{form.parentName}</strong>
          </span>
        </div>
      )}

      {/* Identificação */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identificação</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input required autoFocus value={form.name} onChange={f("name")} className={inp} />
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
            <input type="email" value={form.email} onChange={f("email")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <select value={form.roleId} onChange={f("roleId")} className={inp}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável (superior)</label>
            <ParentSearch
              parentId={form.parentId}
              parentName={form.parentName}
              maxLevel={currentRole?.level ?? 99}
              excludeId={preset.id}
              onChange={(id, name) => setForm(p => ({ ...p, parentId: id, parentName: name }))}
            />
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados Pessoais</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
            <input type="date" value={form.dataNascimento} onChange={f("dataNascimento")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <select value={form.genero} onChange={f("genero")} className={inp}>
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
            <input value={form.rua} onChange={f("rua")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
            <input value={form.bairro} onChange={f("bairro")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input value={form.cidade} onChange={f("cidade")} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
            <select value={form.zona} onChange={f("zona")} className={inp}>
              <option value="">— Selecionar —</option>
              <option value="Urbano">Urbano</option>
              <option value="Rural">Rural</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea rows={2} value={form.notes} onChange={f("notes")} className={`${inp} resize-none`} />
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <div className="flex items-center gap-2">
          {/* Botão de adição em lote — só aparece em novo cadastro com responsável definido */}
          {!preset.id && form.parentId && (
            <button type="button" onClick={submitAndMore} disabled={saving}
              className="px-4 py-2 text-sm text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 disabled:opacity-50 rounded-lg font-medium">
              {saving ? "Salvando..." : "Salvar e adicionar outro"}
            </button>
          )}
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Vista em lista ───────────────────────────────────────────────────────────

function buildDescendants(rootId: string, childrenMap: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    result.add(id);
    for (const child of childrenMap.get(id) ?? []) stack.push(child);
  }
  return result;
}

function ListView({ roles, onEdit, onAddUnder, onShowNetwork }: {
  roles: PersonRole[];
  onEdit: (c: Contact) => void;
  onAddUnder: (parent: Contact) => void;
  onShowNetwork: (c: Contact) => void;
}) {
  const [contacts, setContacts]     = useState<Contact[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading]       = useState(false);

  const [netSearch, setNetSearch]         = useState("");
  const [netResults, setNetResults]       = useState<Contact[]>([]);
  const [netOpen, setNetOpen]             = useState(false);
  const [networkRoot, setNetworkRoot]     = useState<Contact | null>(null);
  const [descendantIds, setDescendantIds] = useState<Set<string> | null>(null);
  const netDebounce    = useRef<NodeJS.Timeout>();
  const searchDebounce = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!networkRoot) { setDescendantIds(null); return; }
    fetch("/api/contacts/tree").then(r => r.json()).then((data: TreeContact[]) => {
      const cm = new Map<string, string[]>();
      for (const c of data) { if (c.parentId) { if (!cm.has(c.parentId)) cm.set(c.parentId, []); cm.get(c.parentId)!.push(c.id); } }
      setDescendantIds(buildDescendants(networkRoot.id, cm));
    });
  }, [networkRoot]);

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

  function onSearchInput(v: string) {
    setSearch(v);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => load(1, v, roleFilter), 400);
  }

  function searchNetwork(q: string) {
    setNetSearch(q);
    if (!q) { setNetResults([]); setNetOpen(false); return; }
    clearTimeout(netDebounce.current);
    netDebounce.current = setTimeout(async () => {
      const r = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=10`);
      const d = await r.json();
      setNetResults(d.contacts ?? []);
      setNetOpen(true);
    }, 300);
  }

  async function del(id: string, name: string) {
    if (!confirm(`Deletar "${name}"?`)) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    toast.success("Pessoa removida"); load(1);
  }

  const displayed = descendantIds
    ? contacts.filter(c => descendantIds.has(c.id) && c.id !== networkRoot?.id)
    : contacts;

  const grouped = roles.reduce<Record<string, Contact[]>>((acc, role) => {
    acc[role.id] = displayed.filter(c => c.roleId === role.id);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => onSearchInput(e.target.value)} placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); load(1, search, e.target.value); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Todos os cargos</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">{total.toLocaleString("pt-BR")} pessoas</span>
      </div>

      {/* Filtro de rede */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        {networkRoot ? (
          <div className="flex items-center gap-3">
            <Network size={14} className="text-brand-600 shrink-0" />
            <span className="text-sm text-gray-600">Rede de:</span>
            <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: networkRoot.role.bgColor, color: networkRoot.role.color }}>{networkRoot.name[0]}</div>
              <span className="text-sm font-semibold text-brand-700">{networkRoot.name}</span>
              <span className="text-xs text-gray-500">({networkRoot.role.label})</span>
            </div>
            {descendantIds && <span className="text-xs text-gray-400">{(descendantIds.size - 1)} pessoas</span>}
            <button onClick={() => { setNetworkRoot(null); setNetSearch(""); setDescendantIds(null); }}
              className="ml-auto flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50">
              <X size={12} /> Ver todos
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2">
              <Network size={14} className="text-gray-400 shrink-0" />
              <input value={netSearch} onChange={e => searchNetwork(e.target.value)}
                onBlur={() => setTimeout(() => setNetOpen(false), 150)}
                placeholder="Filtrar pela rede de um coordenador ou líder..."
                className="flex-1 text-sm focus:outline-none text-gray-700 placeholder:text-gray-400" />
            </div>
            {netOpen && netResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {netResults.map(c => (
                  <button key={c.id} type="button"
                    onMouseDown={() => { setNetworkRoot(c); setNetSearch(c.name); setNetOpen(false); load(1); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>{c.name[0]}</div>
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ color: c.role.color, backgroundColor: c.role.bgColor }}>{c.role.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users size={40} className="mb-3 opacity-30" />
          <p className="font-medium">Nenhuma pessoa encontrada</p>
        </div>
      )}

      {!loading && roles.map(role => {
        const group = grouped[role.id] ?? [];
        if (group.length === 0) return null;
        return (
          <div key={role.id}>
            <div className="flex items-center gap-2 mb-2">
              <RoleBadge role={role} />
              <span className="text-xs text-gray-400">{group.length}</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {group.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 group">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
                    style={{ backgroundColor: c.role.bgColor, color: c.role.color }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="font-medium text-gray-900 text-sm cursor-pointer hover:text-brand-600 hover:underline"
                        title="Duplo clique para ver a rede"
                        onDoubleClick={() => onShowNetwork(c)}
                      >{c.name}</p>
                      {c.parent && <span className="text-xs text-gray-400 flex items-center gap-0.5"><ChevronRight size={10} />{c.parent.name}</span>}
                      {c.cidade && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.cidade}</span>}
                      {c.zona   && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.zona}</span>}
                    </div>
                    {c._count && c._count.children > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{c._count.children} na rede</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onAddUnder(c)} title={`Adicionar pessoa na rede de ${c.name}`}
                      className="p-1.5 hover:bg-brand-50 rounded text-brand-400 flex items-center gap-1">
                      <UserPlus size={13} />
                    </button>
                    <button onClick={() => onEdit(c)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={14} /></button>
                    <button onClick={() => del(c.id, c.name)} className="p-1.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!networkRoot && pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
          <span className="text-sm text-gray-500">Página {page} de {pages}</span>
          <button disabled={page >= pages} onClick={() => load(page + 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima →</button>
        </div>
      )}
    </div>
  );
}

// ─── Organograma ──────────────────────────────────────────────────────────────

function buildNetworkSizes(contacts: TreeContact[]) {
  const childrenMap = new Map<string, string[]>();
  for (const c of contacts) {
    if (c.parentId) { if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []); childrenMap.get(c.parentId)!.push(c.id); }
  }
  const sizes = new Map<string, number>();
  function getSize(id: string): number {
    if (sizes.has(id)) return sizes.get(id)!;
    const ch = childrenMap.get(id) ?? [];
    const sz = ch.reduce((s, cid) => s + 1 + getSize(cid), 0);
    sizes.set(id, sz); return sz;
  }
  for (const c of contacts) getSize(c.id);
  return { childrenMap, sizes };
}

const OrgCard = memo(function OrgCard({ contact, networkSize, onEdit, onDelete, onAdd }: {
  contact: TreeContact; networkSize: number;
  onEdit: (id: string) => void; onDelete: (id: string) => void; onAdd: (c: TreeContact) => void;
}) {
  return (
    <div className="relative group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-200 transition-all w-36"
      style={{ borderLeftWidth: 3, borderLeftColor: contact.role.color }}>
      <div className="p-2.5 flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: contact.role.bgColor, color: contact.role.color }}>
          {contact.name[0].toUpperCase()}
        </div>
        <p className="font-semibold text-gray-900 text-xs text-center leading-tight w-full truncate px-1" title={contact.name}>{contact.name}</p>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
          style={{ color: contact.role.color, backgroundColor: contact.role.bgColor }}>{contact.role.label}</span>
        {networkSize > 0 && <span className="text-xs text-gray-400">{networkSize.toLocaleString("pt-BR")} na rede</span>}
      </div>
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onAdd(contact)} title="Adicionar na rede" className="p-1 hover:bg-brand-50 rounded text-brand-400"><UserPlus size={10} /></button>
        <button onClick={() => onEdit(contact.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400"><Edit2 size={10} /></button>
        <button onClick={() => onDelete(contact.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={10} /></button>
      </div>
    </div>
  );
});

const OrgNode = memo(function OrgNode({ id, childrenMap, contactMap, sizes, defaultExpanded, onEdit, onDelete, onAdd }: {
  id: string; childrenMap: Map<string, string[]>; contactMap: Map<string, TreeContact>;
  sizes: Map<string, number>; defaultExpanded: boolean;
  onEdit: (id: string) => void; onDelete: (id: string) => void; onAdd: (c: TreeContact) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contact = contactMap.get(id);
  if (!contact) return null;
  const children = childrenMap.get(id) ?? [];
  const networkSize = sizes.get(id) ?? 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <OrgCard contact={contact} networkSize={networkSize} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
        {children.length > 0 && (
          <button onClick={() => setExpanded(v => !v)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-brand-600 z-10">
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
                <OrgNode id={childId} childrenMap={childrenMap} contactMap={contactMap} sizes={sizes}
                  defaultExpanded={contact.role.level < 1} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function OrgView({ onEditById, onAddUnder, focusedId }: {
  onEditById: (id: string) => void; onAddUnder: (c: TreeContact) => void;
  focusedId?: string | null;
}) {
  const [contacts, setContacts] = useState<TreeContact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [vp, setVp] = useState({ zoom: 0.9, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/contacts/tree"); setContacts(await r.json()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Sempre previne o default dentro do canvas para não acionar zoom do browser
      if (e.ctrlKey || e.metaKey) e.preventDefault();
      if (!e.ctrlKey && !e.metaKey) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const delta = (e.deltaMode === 1 ? 0.05 : 0.001) * e.deltaY;
      setVp(prev => {
        const next = Math.min(Math.max(prev.zoom * (1 - delta), 0.1), 4);
        return { zoom: next, x: mx - (mx - prev.x) * (next / prev.zoom), y: my - (my - prev.y) * (next / prev.zoom) };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    setIsDragging(true); lastMouse.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.current.x, dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setVp(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
  }

  const { childrenMap, sizes } = buildNetworkSizes(contacts);
  const contactMap = new Map(contacts.map(c => [c.id, c]));
  // Se focusedId definido, mostra só aquela pessoa como raiz da rede
  const roots = focusedId
    ? contacts.filter(c => c.id === focusedId)
    : contacts.filter(c => !c.parentId);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm">Carregando rede...</p></div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative h-full overflow-hidden select-none"
      style={{ cursor: isDragging ? "grabbing" : "grab", background: "#1e293b" }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, #475569 1px, transparent 1px)",
        backgroundSize: `${28 * vp.zoom}px ${28 * vp.zoom}px`,
        backgroundPosition: `${vp.x % (28 * vp.zoom)}px ${vp.y % (28 * vp.zoom)}px`, opacity: 0.5,
      }} />
      <div style={{
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        transformOrigin: "0 0", position: "absolute", top: 0, left: 0,
        width: "max-content", minWidth: "100%", willChange: "transform",
      }}>
        <div className="flex gap-20 justify-center pt-10 px-16 pb-20">
          {roots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Network size={40} className="mb-3 opacity-30" /><p>Nenhuma pessoa cadastrada</p>
            </div>
          ) : roots.map(root => (
            <OrgNode key={root.id} id={root.id} childrenMap={childrenMap} contactMap={contactMap}
              sizes={sizes} defaultExpanded={true} onEdit={onEditById}
              onDelete={async id => { if (!confirm("Remover?")) return; await fetch(`/api/contacts/${id}`, { method: "DELETE" }); toast.success("Removido"); load(); }}
              onAdd={onAddUnder} />
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-md p-1.5 pointer-events-auto">
        <button onClick={() => setVp(v => ({ ...v, zoom: Math.min(v.zoom + 0.15, 4) }))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"><ZoomIn size={14} /></button>
        <span className="text-xs text-gray-500 w-10 text-center font-mono">{Math.round(vp.zoom * 100)}%</span>
        <button onClick={() => setVp(v => ({ ...v, zoom: Math.max(v.zoom - 0.15, 0.1) }))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"><ZoomOut size={14} /></button>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <button onClick={() => setVp({ zoom: 0.9, x: 0, y: 0 })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"><Maximize2 size={13} /></button>
        <button onClick={load} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"><RefreshCw size={13} /></button>
      </div>
      <div className="absolute bottom-4 left-4 text-xs text-slate-300 bg-slate-700/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 pointer-events-none">
        Ctrl + Scroll = zoom · Arrastar = mover · {contacts.length.toLocaleString("pt-BR")} pessoas
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PessoasPage() {
  const [roles, setRoles]         = useState<PersonRole[]>([]);
  const [view, setView]           = useState<"list" | "org">("list");
  const [modal, setModal]         = useState(false);
  const [preset, setPreset]       = useState<FormPreset>({});
  const [totalCount, setTotalCount] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    const r = await fetch("/api/roles"); setRoles(await r.json());
  }, []);

  const loadCount = useCallback(async () => {
    const r = await fetch("/api/contacts?limit=1");
    const d = await r.json(); setTotalCount(d.total ?? 0);
  }, []);

  useEffect(() => { loadRoles(); loadCount(); }, [loadRoles, loadCount]);

  // Bloqueia zoom do navegador (Ctrl+Scroll) quando a aba Rede está ativa
  useEffect(() => {
    if (view !== "org") return;
    const block = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    document.addEventListener("wheel", block, { passive: false });
    return () => document.removeEventListener("wheel", block);
  }, [view]);

  function openNew() { setPreset({}); setModal(true); }

  function showNetwork(c: Contact) {
    setFocusedId(c.id);
    setView("org");
  }

  // Abre form com pai pré-selecionado e cargo automático (nível abaixo do pai)
  function openAddUnder(parent: Contact | TreeContact) {
    const parentLevel = parent.role.level;
    const childRole = roles.find(r => r.level === parentLevel + 1) ?? roles[roles.length - 1];
    setPreset({ parentId: parent.id, parentName: parent.name, roleId: childRole?.id });
    setModal(true);
  }

  async function openEdit(id: string) {
    const r = await fetch(`/api/contacts/${id}`);
    const c = await r.json();
    setPreset({ ...c, phone: c.phone, parentId: c.parentId ?? "", parentName: c.parent?.name ?? "" });
    setModal(true);
  }

  // "Salvar e adicionar outro" — reabre o form mantendo cargo e responsável
  function handleSaveAndMore(keepPreset: FormPreset) {
    setPreset(keepPreset);
    setModal(false);
    loadCount();
    // Reabre imediatamente
    setTimeout(() => setModal(true), 50);
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
          <button onClick={openNew} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nova Pessoa
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-4" style={{ display: view === "list" ? "block" : "none" }}>
        <ListView roles={roles} onEdit={c => openEdit(c.id)} onAddUnder={openAddUnder} onShowNetwork={showNetwork} />
      </div>

      <div className="flex-1 overflow-hidden" style={{ display: view === "org" ? "flex" : "none", flexDirection: "column" }}>
        <OrgView onEditById={openEdit} onAddUnder={openAddUnder} focusedId={focusedId} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={preset.id ? "Editar Pessoa" : preset.parentId ? `Nova Pessoa` : "Nova Pessoa"}
        size="xl">
        <PersonForm
          key={`${preset.parentId}-${preset.roleId}-${modal}`}
          preset={preset}
          roles={roles}
          onSave={() => { setModal(false); loadCount(); }}
          onSaveAndMore={handleSaveAndMore}
          onClose={() => setModal(false)}
        />
      </Modal>
    </div>
  );
}
