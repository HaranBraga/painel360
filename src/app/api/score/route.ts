import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function classify(s: number) {
  if (s >= 8) return "seguro";
  if (s >= 5) return "promissor";
  return "incerto";
}

export async function GET() {
  const [total, scored] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.findMany({
      where: { score: { not: null } },
      select: { score: true, roleId: true },
    }),
  ]);

  const byClass = { seguro: 0, promissor: 0, incerto: 0 };
  const byRole: Record<string, { count: number; sum: number }> = {};
  let sum = 0;

  for (const c of scored) {
    const s = c.score!;
    sum += s;
    byClass[classify(s)]++;
    if (!byRole[c.roleId]) byRole[c.roleId] = { count: 0, sum: 0 };
    byRole[c.roleId].count++;
    byRole[c.roleId].sum += s;
  }

  const roles = await prisma.personRole.findMany({ orderBy: { level: "asc" } });

  return NextResponse.json({
    total,
    scored: scored.length,
    avg: scored.length > 0 ? +(sum / scored.length).toFixed(1) : null,
    byClass,
    byRole: roles.map(r => ({
      id: r.id, key: r.key, label: r.label, color: r.color, bgColor: r.bgColor, level: r.level,
      scored: byRole[r.id]?.count ?? 0,
      avg: byRole[r.id] ? +(byRole[r.id].sum / byRole[r.id].count).toFixed(1) : null,
      seguro:    scored.filter(c => c.roleId === r.id && classify(c.score!) === "seguro").length,
      promissor: scored.filter(c => c.roleId === r.id && classify(c.score!) === "promissor").length,
      incerto:   scored.filter(c => c.roleId === r.id && classify(c.score!) === "incerto").length,
    })),
  });
}
