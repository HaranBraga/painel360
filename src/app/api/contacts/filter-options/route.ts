import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [roles, bairrosRaw, cidadesRaw, labelsRaw] = await Promise.all([
    prisma.personRole.findMany({
      select: { key: true, label: true, color: true, bgColor: true, _count: { select: { contacts: true } } },
      orderBy: { level: "desc" },
    }),
    prisma.contact.groupBy({ by: ["bairro"], _count: true, where: { bairro: { not: null } } }),
    prisma.contact.groupBy({ by: ["cidade"], _count: true, where: { cidade: { not: null } } }),
    prisma.label.findMany({ select: { name: true, color: true, bgColor: true } }).catch(() => [] as any[]),
  ]);

  const usageRaw = await prisma.$queryRaw<{ label: string; count: bigint }[]>`
    SELECT unnest(labels) AS label, COUNT(*)::bigint AS count
    FROM "Contact"
    GROUP BY label
    ORDER BY count DESC
  `;
  const labelsMap = new Map<string, { color: string; bgColor: string }>();
  (labelsRaw as any[]).forEach((l: any) => labelsMap.set(l.name, { color: l.color, bgColor: l.bgColor }));

  return NextResponse.json({
    roles: roles.map(r => ({ key: r.key, label: r.label, color: r.color, bgColor: r.bgColor, count: r._count.contacts })),
    bairros: bairrosRaw.filter(b => b.bairro).map(b => ({ value: b.bairro!, count: b._count })).sort((a, b) => b.count - a.count),
    cidades: cidadesRaw.filter(c => c.cidade).map(c => ({ value: c.cidade!, count: c._count })).sort((a, b) => b.count - a.count),
    labels: usageRaw.map(u => ({
      value: u.label,
      count: Number(u.count),
      color:   labelsMap.get(u.label)?.color   ?? "#6366f1",
      bgColor: labelsMap.get(u.label)?.bgColor ?? "#eef2ff",
    })),
  });
}
