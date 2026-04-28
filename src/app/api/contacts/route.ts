import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const roleInclude = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };
const parentInclude = { select: { id: true, name: true, role: roleInclude } };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const roleId = searchParams.get("roleId") ?? undefined;

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {},
        roleId ? { roleId } : {},
      ],
    },
    include: { role: roleInclude, parent: parentInclude, _count: { select: { children: true } } },
    orderBy: [{ role: { level: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, roleId, parentId, notes } = body;

  if (!name || !phone) return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });

  const existing = await prisma.contact.findUnique({ where: { phone } });
  if (existing) return NextResponse.json({ error: "Telefone já cadastrado" }, { status: 409 });

  const resolvedRoleId = roleId ?? (await prisma.personRole.findFirst({ orderBy: { level: "desc" } }))?.id;
  if (!resolvedRoleId) return NextResponse.json({ error: "Nenhum cargo cadastrado" }, { status: 400 });

  const contact = await prisma.contact.create({
    data: { name, phone, email, roleId: resolvedRoleId, parentId: parentId ?? null, notes, source: "manual" },
    include: { role: roleInclude },
  });

  return NextResponse.json(contact, { status: 201 });
}
