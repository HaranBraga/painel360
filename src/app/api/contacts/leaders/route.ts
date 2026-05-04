import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lista contatos com pelo menos 1 filho — pra filtrar pessoas por líder. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const limit  = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const where: any = { children: { some: {} } };
  if (search.trim()) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const leaders = await prisma.contact.findMany({
    where,
    select: {
      id: true, name: true, phone: true,
      role: { select: { key: true, label: true, color: true, bgColor: true } },
      _count: { select: { children: true } },
    },
    orderBy: [{ children: { _count: "desc" } }, { name: "asc" }],
    take: limit,
  });

  return NextResponse.json(leaders.map(l => ({
    id: l.id, name: l.name, phone: l.phone, role: l.role, childCount: l._count.children,
  })));
}
