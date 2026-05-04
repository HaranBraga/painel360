"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Phone, MapPin, User as UserIcon, Calendar, Save, Edit2, Plus,
  ClipboardList, Megaphone, MessageSquare, Tag, Activity, FileText, Star, Trash2, Users,
  Home as HomeIcon, History,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RoleBadge } from "@/components/ui/RoleBadge";
import toast from "react-hot-toast";

type Tab = "geral" | "timeline" | "notas" | "rede";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "geral",    label: "Visão geral", icon: UserIcon },
  { key: "timeline", label: "Timeline",    icon: History  },
  { key: "notas",    label: "Anotações",   icon: FileText },
  { key: "rede",     label: "Rede",        icon: Users    },
];

const TIMELINE_ICONS: Record<string, any> = {
  note: FileText, demanda: ClipboardList, agenda: Calendar,
  reuniao_presente: Users, reuniao_anfitriao: HomeIcon, reuniao_lider: Star,
  campaign_added: Megaphone, campaign_sent: MessageSquare, campaign_responded: Tag,
  conversation_started: MessageSquare, kanban_status: Activity,
};

const TIMELINE_COLORS: Record<string, string> = {
  note: "#6366f1", demanda: "#f59e0b", agenda: "#10b981",
  reuniao_presente: "#3b82f6", reuniao_anfitriao: "#d97706", reuniao_lider: "#dc2626",
  campaign_added: "#8b5cf6", campaign_sent: "#2563eb", campaign_responded: "#059669",
  conversation_started: "#0ea5e9", kanban_status: "#6b7280",
};

export default function PessoaDetailPage() {
  const params = useParams();
  const id = (params?.id ?? "") as string;

  const [tab, setTab] = useState<Tab>("geral");
  const [contact, setContact] = useState<any | null>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContact = useCallback(async () => {
    const r = await fetch(`/api/contacts/${id}`);
    if (r.ok) setContact(await r.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadContact();
    fetch("/api/custom-fields").then(r => r.json()).then(setCustomFields).catch(() => {});
    fetch("/api/roles").then(r => r.json()).then(setRoles).catch(() => {});
  }, [loadContact]);

  if (loading || !contact) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 px-6 py-4">
          <Link href="/pessoas" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold shrink-0">
            {contact.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{contact.name}</h1>
              {contact.role && <RoleBadge role={contact.role} />}
              {contact.parent && <span className="text-xs text-gray-400">Líder: {contact.parent.name}</span>}
              {typeof contact.score === "number" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                  <Star size={11} /> {contact.score.toFixed(1)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Phone size={11} />{contact.phone}</span>
              {contact.cidade && <span className="flex items-center gap-1"><MapPin size={11} />{contact.cidade}{contact.bairro ? ` · ${contact.bairro}` : ""}</span>}
              {contact.lastContactAt && (
                <span className="text-gray-400">Últ. contato {formatDistanceToNow(new Date(contact.lastContactAt), { addSuffix: true, locale: ptBR })}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 px-6 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${active ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {tab === "geral"    && <TabGeral contact={contact} customFields={customFields} roles={roles} onSaved={loadContact} />}
        {tab === "timeline" && <TabTimeline contactId={id} />}
        {tab === "notas"    && <TabNotas contactId={id} />}
        {tab === "rede"     && <TabRede contact={contact} />}
      </div>
    </div>
  );
}

function TabGeral({ contact, customFields, roles, onSaved }: any) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>(() => ({
    name: contact.name,
    phone: contact.phone,
    email: contact.email ?? "",
    roleId: contact.roleId,
    parentId: contact.parentId ?? "",
    cidade: contact.cidade ?? "",
    bairro: contact.bairro ?? "",
    zona: contact.zona ?? "",
    rua: contact.rua ?? "",
    genero: contact.genero ?? "",
    dataNascimento: contact.dataNascimento ? contact.dataNascimento.slice(0, 10) : "",
    customFields: contact.customFields ?? {},
  }));
  const [saving, setSaving] = useState(false);

  function setF(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }
  function setCF(k: string, v: any) { setForm((p: any) => ({ ...p, customFields: { ...p.customFields, [k]: v } })); }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dataNascimento: form.dataNascimento || null }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Erro"); return; }
      toast.success("Contato atualizado");
      setEdit(false);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Dados pessoais</h3>
          {edit ? (
            <div className="flex gap-2">
              <button onClick={() => setEdit(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium">
                <Save size={12} /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          ) : (
            <button onClick={() => setEdit(true)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600">
              <Edit2 size={12} /> Editar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Nome" edit={edit} value={form.name} onChange={(v: string) => setF("name", v)} display={contact.name} />
          <Field label="Telefone" edit={edit} value={form.phone} onChange={(v: string) => setF("phone", v)} display={contact.phone} />
          <Field label="E-mail" edit={edit} value={form.email} onChange={(v: string) => setF("email", v)} display={contact.email || "—"} type="email" />
          {edit ? (
            <div>
              <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Cargo</p>
              <select value={form.roleId} onChange={e => setF("roleId", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {roles.map((r: any) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Cargo</p>
              <p className="text-gray-800">{contact.role?.label}</p>
            </div>
          )}
          <Field label="Cidade" edit={edit} value={form.cidade} onChange={(v: string) => setF("cidade", v)} display={contact.cidade || "—"} />
          <Field label="Bairro" edit={edit} value={form.bairro} onChange={(v: string) => setF("bairro", v)} display={contact.bairro || "—"} />
          <Field label="Zona" edit={edit} value={form.zona} onChange={(v: string) => setF("zona", v)} display={contact.zona || "—"} />
          <Field label="Rua" edit={edit} value={form.rua} onChange={(v: string) => setF("rua", v)} display={contact.rua || "—"} />
          <Field label="Gênero" edit={edit} value={form.genero} onChange={(v: string) => setF("genero", v)} display={contact.genero || "—"} />
          <Field label="Nascimento" edit={edit} value={form.dataNascimento} onChange={(v: string) => setF("dataNascimento", v)} type="date"
            display={contact.dataNascimento ? format(new Date(contact.dataNascimento), "dd/MM/yyyy") : "—"} />
        </div>
      </section>

      {/* Score detalhado */}
      {(contact.score1 !== null || contact.score2 !== null || contact.score3 !== null) && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Star size={14} className="text-amber-500" /> Avaliações
          </h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <ScoreBox label="Avaliador 1" v={contact.score1} />
            <ScoreBox label="Avaliador 2" v={contact.score2} />
            <ScoreBox label="Avaliador 3" v={contact.score3} />
            <ScoreBox label="Média" v={contact.score} highlight />
          </div>
          {contact.scoreNote && <p className="text-xs text-gray-500 mt-3 italic">"{contact.scoreNote}"</p>}
        </section>
      )}

      {customFields.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Campos personalizados</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {customFields.map((f: any) => (
              <CustomFieldField key={f.id} field={f} edit={edit}
                value={form.customFields[f.key]}
                onChange={(v: any) => setCF(f.key, v)}
                display={contact.customFields?.[f.key]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, edit, value, onChange, display, type = "text" }: any) {
  return (
    <div>
      <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">{label}</p>
      {edit ? (
        <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      ) : (
        <p className="text-gray-800">{display ?? "—"}</p>
      )}
    </div>
  );
}

function ScoreBox({ label, v, highlight }: { label: string; v: number | null; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
      <p className={`text-2xl font-bold ${highlight ? "text-amber-700" : "text-gray-700"}`}>
        {v !== null && v !== undefined ? Number(v).toFixed(1) : "—"}
      </p>
      <p className="text-[10px] text-gray-500 uppercase mt-0.5">{label}</p>
    </div>
  );
}

function CustomFieldField({ field, edit, value, onChange, display }: any) {
  return (
    <div>
      <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">
        {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {edit ? (
        field.type === "select" ? (
          <select value={value ?? ""} onChange={e => onChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">—</option>
            {(field.options ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : field.type === "boolean" ? (
          <label className="inline-flex items-center gap-2 mt-1">
            <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-gray-600">{value ? "Sim" : "Não"}</span>
          </label>
        ) : (
          <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            value={value ?? ""}
            onChange={e => onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        )
      ) : (
        <p className="text-gray-800">
          {display === undefined || display === null || display === "" ? "—"
            : field.type === "boolean" ? (display ? "Sim" : "Não")
            : field.type === "date" && display ? format(new Date(display), "dd/MM/yyyy")
            : String(display)}
        </p>
      )}
    </div>
  );
}

function TabTimeline({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    fetch(`/api/contacts/${contactId}/timeline`).then(r => r.json()).then(setItems);
  }, [contactId]);

  if (!items) return <p className="text-center text-gray-400 py-10">Carregando...</p>;
  if (items.length === 0) return <p className="text-center text-gray-400 py-10">Sem histórico</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl">
      <div className="divide-y divide-gray-100">
        {items.map((item: any, i: number) => {
          const Icon = TIMELINE_ICONS[item.type] ?? Activity;
          const color = TIMELINE_COLORS[item.type] ?? "#6b7280";
          return (
            <div key={i} className="flex gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: color + "22" }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <span className="text-xs text-gray-400 shrink-0">
                    {format(new Date(item.date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {item.subtitle && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap line-clamp-3">{item.subtitle}</p>}
                {item.meta?.author && <p className="text-[10px] text-gray-400 mt-1">por {item.meta.author}</p>}
                {item.meta?.tag && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block"
                    style={{ backgroundColor: (item.meta.color ?? "#888") + "22", color: item.meta.color ?? "#666" }}>
                    {item.meta.tag}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabNotas({ contactId }: { contactId: string }) {
  const [notes, setNotes] = useState<any[] | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/contacts/${contactId}/notes`);
    setNotes(await r.json());
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!r.ok) { toast.error("Erro"); return; }
      setBody("");
      load();
    } finally { setSaving(false); }
  }

  async function del(noteId: string) {
    if (!confirm("Apagar esta anotação?")) return;
    await fetch(`/api/contacts/${contactId}/notes/${noteId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
          placeholder="Escreva uma anotação sobre esta pessoa..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        <div className="flex justify-end mt-2">
          <button onClick={add} disabled={saving || !body.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium">
            <Plus size={12} /> {saving ? "Salvando..." : "Adicionar nota"}
          </button>
        </div>
      </section>

      {notes === null ? (
        <p className="text-center text-gray-400 py-6">Carregando...</p>
      ) : notes.length === 0 ? (
        <p className="text-center text-gray-400 py-6">Nenhuma anotação ainda.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {notes.map((n: any) => (
            <div key={n.id} className="px-4 py-3 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs text-gray-400">
                  {format(new Date(n.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  {n.author?.name && <span> · por {n.author.name}</span>}
                </p>
                <button onClick={() => del(n.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabRede({ contact }: { contact: any }) {
  const children: any[] = contact.children ?? [];
  const childCount = contact._count?.children ?? children.length;
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      {contact.parent && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-[11px] uppercase font-semibold text-gray-400 mb-2">Líder direto</p>
          <Link href={`/pessoas/${contact.parent.id}`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100">
            <UserIcon size={14} /> {contact.parent.name}
            {contact.parent.role && <RoleBadge role={contact.parent.role} />}
          </Link>
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Rede direta abaixo</h3>
          <span className="text-xs text-gray-400">{childCount} pessoa(s)</span>
        </div>

        {childCount === 0 ? (
          <p className="text-xs text-gray-400 italic">Nenhum contato diretamente abaixo</p>
        ) : (
          <>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {children.map(c => (
                <Link key={c.id} href={`/pessoas/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
                    style={{ backgroundColor: c.role?.bgColor ?? "#eef2ff", color: c.role?.color ?? "#6366f1" }}>
                    {c.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      {c.role && <RoleBadge role={c.role} />}
                      {typeof c.score === "number" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                          <Star size={9} /> {c.score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      {c.phone && <span>{c.phone}</span>}
                      {c.cidade && <span>· {c.cidade}{c.bairro ? ` / ${c.bairro}` : ""}</span>}
                      {c._count?.children > 0 && <span>· {c._count.children} na rede</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href={`/pessoas?liderIds=${contact.id}`}
              className="block w-full text-center px-4 py-2 mt-3 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 rounded-lg">
              Abrir lista completa filtrada →
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
