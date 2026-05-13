import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Relatório: cada líder (qualquer papel exceto APOIADOR) com a quantidade
// total de pessoas na sua rede (descendentes recursivos).
export async function GET() {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      name: true,
      parentId: true,
      role: { select: { key: true, label: true } },
    },
    orderBy: { name: "asc" },
  });

  // childrenMap: id pai → ids dos filhos diretos. Ignora auto-referência.
  const childrenMap = new Map<string, string[]>();
  for (const c of contacts) {
    if (c.parentId && c.parentId !== c.id) {
      if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
      childrenMap.get(c.parentId)!.push(c.id);
    }
  }

  // Conta recursiva com guard de ciclo (caso o banco tenha algum loop).
  const sizes = new Map<string, number>();
  const computing = new Set<string>();
  function getSize(id: string): number {
    if (sizes.has(id)) return sizes.get(id)!;
    if (computing.has(id)) return 0;
    computing.add(id);
    const ch = childrenMap.get(id) ?? [];
    let sz = 0;
    for (const cid of ch) sz += 1 + getSize(cid);
    computing.delete(id);
    sizes.set(id, sz);
    return sz;
  }
  for (const c of contacts) getSize(c.id);

  const lideres = contacts
    .filter(c => c.role.key !== "APOIADOR")
    .map(c => ({
      id: c.id,
      name: c.name,
      roleLabel: c.role.label,
      count: sizes.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  return NextResponse.json({ lideres, total: lideres.length });
}
