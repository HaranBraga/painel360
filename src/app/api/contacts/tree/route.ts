import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Retorna apenas os campos necessários para montar o organograma no cliente.
// Mantém o payload pequeno mesmo com 40k+ pessoas.
export async function GET() {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      name: true,
      parentId: true,
      role: { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } },
    },
    orderBy: [{ role: { level: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(contacts);
}
