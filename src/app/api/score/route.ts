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
  const byRole: Record<string, { count: number; sum: number; seg: number; pro: number; inc: number }> = {};
  const distribution: Record<number, number> = {};
  for (let i = 0; i <= 10; i++) distribution[i] = 0;

  let sum = 0;

  for (const c of scored) {
    const s = c.score!;
    sum += s;
    const cls = classify(s);
    byClass[cls]++;

    const rounded = Math.min(10, Math.max(0, Math.round(s)));
    distribution[rounded]++;

    if (!byRole[c.roleId]) byRole[c.roleId] = { count: 0, sum: 0, seg: 0, pro: 0, inc: 0 };
    byRole[c.roleId].count++;
    byRole[c.roleId].sum += s;
    if (cls === "seguro")    byRole[c.roleId].seg++;
    if (cls === "promissor") byRole[c.roleId].pro++;
    if (cls === "incerto")   byRole[c.roleId].inc++;
  }

  const roles = await prisma.personRole.findMany({ orderBy: { level: "asc" } });

  return NextResponse.json({
    total,
    scored: scored.length,
    avg: scored.length > 0 ? +(sum / scored.length).toFixed(2) : null,
    byClass,
    distribution,
    byRole: roles.map(r => ({
      id: r.id, key: r.key, label: r.label, color: r.color, bgColor: r.bgColor, level: r.level,
      scored: byRole[r.id]?.count ?? 0,
      avg: byRole[r.id] ? +(byRole[r.id].sum / byRole[r.id].count).toFixed(2) : null,
      seguro:    byRole[r.id]?.seg ?? 0,
      promissor: byRole[r.id]?.pro ?? 0,
      incerto:   byRole[r.id]?.inc ?? 0,
    })),
  });
}
