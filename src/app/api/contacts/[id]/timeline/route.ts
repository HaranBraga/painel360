import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TimelineItem = {
  type: "note" | "demanda" | "agenda" | "reuniao_presente" | "reuniao_anfitriao" | "reuniao_lider" |
        "campaign_added" | "campaign_sent" | "campaign_responded" | "conversation_started" |
        "kanban_status";
  date: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, any>;
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;

  const [notes, demandas, agendaSol, agendaAnf, presentes, anfReu, lideradas, campContacts, conversation] = await Promise.all([
    prisma.contactNote.findMany({
      where: { contactId: id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.demanda.findMany({ where: { solicitanteId: id }, orderBy: { createdAt: "desc" } }),
    prisma.agendaEvento.findMany({ where: { solicitanteId: id }, orderBy: { inicio: "desc" } }),
    prisma.agendaAnfitriao.findMany({
      where: { contactId: id },
      include: { evento: true },
      orderBy: { id: "desc" },
    }),
    prisma.reuniaoPresente.findMany({
      where: { contactId: id },
      include: { reuniao: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reuniaoAnfitriao.findMany({
      where: { contactId: id },
      include: { reuniao: true },
    }),
    prisma.reuniao.findMany({ where: { liderId: id }, orderBy: { dataHora: "desc" } }),
    prisma.campaignContact.findMany({
      where: { contactId: id },
      include: { campaign: { select: { id: true, name: true, reuniaoOriginId: true } }, responseTag: true },
      orderBy: { addedAt: "desc" },
    }),
    prisma.conversation.findUnique({
      where: { contactId: id },
      include: { status: true },
    }),
  ]);

  const items: TimelineItem[] = [];

  for (const n of notes) {
    items.push({
      type: "note",
      date: n.createdAt.toISOString(),
      title: "Nota interna",
      subtitle: n.body,
      meta: { author: n.author?.name },
    });
  }

  for (const d of demandas) {
    items.push({
      type: "demanda",
      date: d.createdAt.toISOString(),
      title: `Demanda: ${d.titulo}`,
      subtitle: d.descricao ?? undefined,
      meta: { status: d.status, prioridade: d.prioridade, segmento: d.segmento },
    });
    if (d.fechadaEm) {
      items.push({
        type: "demanda",
        date: d.fechadaEm.toISOString(),
        title: `Demanda fechada: ${d.titulo}`,
        meta: { status: d.status },
      });
    }
  }

  for (const ev of agendaSol) {
    items.push({
      type: "agenda",
      date: ev.inicio.toISOString(),
      title: `Agenda: ${ev.titulo}`,
      subtitle: ev.local ?? undefined,
      meta: { tipo: ev.tipo, status: ev.status, role: "solicitante" },
    });
  }
  for (const a of agendaAnf) {
    if (!a.evento) continue;
    items.push({
      type: "agenda",
      date: a.evento.inicio.toISOString(),
      title: `Agenda (anfitrião): ${a.evento.titulo}`,
      subtitle: a.evento.local ?? undefined,
      meta: { tipo: a.evento.tipo, status: a.evento.status, role: "anfitriao" },
    });
  }

  for (const r of presentes) {
    items.push({
      type: "reuniao_presente",
      date: r.reuniao.dataHora.toISOString(),
      title: `Reunião (presente): ${r.reuniao.titulo}`,
      subtitle: r.reuniao.local ?? undefined,
      meta: { reuniaoId: r.reuniaoId },
    });
  }
  for (const a of anfReu) {
    items.push({
      type: "reuniao_anfitriao",
      date: a.reuniao.dataHora.toISOString(),
      title: `Reunião (anfitrião): ${a.reuniao.titulo}`,
      subtitle: a.reuniao.local ?? undefined,
      meta: { reuniaoId: a.reuniaoId },
    });
  }
  for (const r of lideradas) {
    items.push({
      type: "reuniao_lider",
      date: r.dataHora.toISOString(),
      title: `Liderou reunião: ${r.titulo}`,
      subtitle: r.local ?? undefined,
      meta: { reuniaoId: r.id },
    });
  }

  for (const cc of campContacts) {
    items.push({
      type: "campaign_added",
      date: cc.addedAt.toISOString(),
      title: `Adicionado à campanha: ${cc.campaign.name}`,
      meta: { campaignId: cc.campaign.id },
    });
    if (cc.sentAt) {
      items.push({
        type: "campaign_sent",
        date: cc.sentAt.toISOString(),
        title: `Mensagem enviada (${cc.campaign.name})`,
        subtitle: cc.sentMessage ?? undefined,
      });
    }
    if (cc.respondedAt && cc.responseTag) {
      items.push({
        type: "campaign_responded",
        date: cc.respondedAt.toISOString(),
        title: `Resposta etiquetada: ${cc.responseTag.label}`,
        subtitle: `Em "${cc.campaign.name}"`,
        meta: { tag: cc.responseTag.label, color: cc.responseTag.color },
      });
    }
  }

  if (conversation) {
    items.push({
      type: "conversation_started",
      date: conversation.createdAt.toISOString(),
      title: "Conversa iniciada no WhatsApp",
    });
    items.push({
      type: "kanban_status",
      date: (conversation.lastMessageAt ?? conversation.updatedAt).toISOString(),
      title: `Status atual: ${conversation.status?.name ?? "Sem status"}`,
      meta: { color: conversation.status?.color },
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(items);
}
