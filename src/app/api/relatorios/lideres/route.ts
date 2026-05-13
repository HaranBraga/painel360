import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Relatório: cada não-apoiador (Coordenador de Grupo, Coordenador, Líder) com
// a quantidade de APOIADORES DIRETOS (filhos imediatos com papel APOIADOR).
// Agrupado por papel pra evitar dupla contagem na soma geral.
export async function GET() {
  const contacts = await prisma.contact.findMany({
    where: { role: { key: { not: "APOIADOR" } } },
    select: {
      id: true,
      name: true,
      role: { select: { key: true, label: true, level: true } },
      _count: {
        select: {
          children: { where: { role: { key: "APOIADOR" } } },
        },
      },
    },
    orderBy: [{ role: { level: "asc" } }, { name: "asc" }],
  });

  const all = contacts.map(c => ({
    id: c.id,
    name: c.name,
    roleKey: c.role.key,
    roleLabel: c.role.label,
    count: c._count.children,
  }));

  const sectionsOrder: { key: string; label: string }[] = [
    { key: "COORDENADOR_GRUPO", label: "Coordenadores de Grupo" },
    { key: "COORDENADOR",       label: "Coordenadores" },
    { key: "LIDER",             label: "Líderes" },
  ];

  const sections = sectionsOrder.map(s => {
    const items = all
      .filter(c => c.roleKey === s.key)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
    return { ...s, items };
  });

  const totalApoiadores = all.reduce((sum, c) => sum + c.count, 0);

  return NextResponse.json({ sections, totalApoiadores });
}
