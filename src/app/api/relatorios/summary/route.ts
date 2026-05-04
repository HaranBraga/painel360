import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const now = new Date();
  const start7  = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

  const [
    totalContatos, contatosNovos7, contatosNovos30, porPapel,
    conversasAbertas, porKanban,
    totalDemandas, demandasAbertas, demandasPorStatus,
    totalReunioes, reunioes30, reunioesPorLider,
    totalCampanhas, campanhasContacts,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { createdAt: { gte: start7 } } }),
    prisma.contact.count({ where: { createdAt: { gte: start30 } } }),
    prisma.contact.groupBy({ by: ["roleId"], _count: true }),
    prisma.conversation.count({ where: { closedAt: null } }),
    prisma.conversation.groupBy({ by: ["statusId"], where: { closedAt: null }, _count: true }),
    prisma.demanda.count({ where: { arquivadaEm: null } }),
    prisma.demanda.count({ where: { fechadaEm: null, arquivadaEm: null } }),
    prisma.demanda.groupBy({ by: ["status"], where: { arquivadaEm: null }, _count: true }),
    prisma.reuniao.count(),
    prisma.reuniao.count({ where: { dataHora: { gte: start30 } } }),
    prisma.reuniao.groupBy({
      by: ["liderId"],
      where: { liderId: { not: null }, status: "REALIZADA" },
      _count: true,
    }),
    prisma.campaign.count(),
    prisma.campaignContact.groupBy({ by: ["status"], _count: true }),
  ]);

  const roles = await prisma.personRole.findMany({ select: { id: true, key: true, label: true, color: true, bgColor: true } });
  const rolesById = Object.fromEntries(roles.map(r => [r.id, r]));

  const kanbans = await prisma.kanbanStatus.findMany({ select: { id: true, name: true, color: true } });
  const kanbansById = Object.fromEntries(kanbans.map(k => [k.id, k]));

  const lideres = await prisma.contact.findMany({
    where: { id: { in: reunioesPorLider.filter(r => r.liderId).map(r => r.liderId!) } },
    select: { id: true, name: true },
  });
  const lideresById = Object.fromEntries(lideres.map(l => [l.id, l]));

  return NextResponse.json({
    contatos: {
      total: totalContatos,
      novos7: contatosNovos7,
      novos30: contatosNovos30,
      porPapel: porPapel.map(p => ({
        roleId: p.roleId,
        label: rolesById[p.roleId]?.label ?? p.roleId,
        color: rolesById[p.roleId]?.color,
        bgColor: rolesById[p.roleId]?.bgColor,
        count: p._count,
      })).sort((a, b) => b.count - a.count),
    },
    conversas: {
      abertas: conversasAbertas,
      porKanban: porKanban.map(k => ({
        statusId: k.statusId,
        name: kanbansById[k.statusId]?.name ?? "—",
        color: kanbansById[k.statusId]?.color,
        count: k._count,
      })),
    },
    demandas: {
      total: totalDemandas,
      abertas: demandasAbertas,
      porStatus: demandasPorStatus.map(d => ({ status: d.status, count: d._count })),
    },
    reunioes: {
      total: totalReunioes,
      ultimos30: reunioes30,
      topLideres: reunioesPorLider
        .map(r => ({ liderId: r.liderId, name: r.liderId ? lideresById[r.liderId]?.name ?? "—" : "—", count: r._count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    },
    campanhas: {
      total: totalCampanhas,
      porStatus: campanhasContacts.map(c => ({ status: c.status, count: c._count })),
    },
  });
}
