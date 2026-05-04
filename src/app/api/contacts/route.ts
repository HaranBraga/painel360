import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const roleSelect = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };

function multi(s: string | null): string[] {
  if (!s) return [];
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search  = searchParams.get("search") ?? "";
  const roleId  = searchParams.get("roleId")  ?? undefined;
  const cidade  = searchParams.get("cidade")  ?? undefined;
  const zona    = searchParams.get("zona")    ?? undefined;
  const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit   = Math.min(2000, parseInt(searchParams.get("limit") ?? "50"));

  // Filtros multi (Excel-like)
  const roleKeys = multi(searchParams.get("roleKeys"));
  const cidades  = multi(searchParams.get("cidades"));
  const bairros  = multi(searchParams.get("bairros"));
  const labels   = multi(searchParams.get("labels"));
  const liderIds = multi(searchParams.get("liderIds"));

  const where: any = {
    AND: [
      search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {},
      roleId ? { roleId } : {},
      cidade ? { cidade: { contains: cidade, mode: "insensitive" } } : {},
      zona   ? { zona:   { contains: zona,   mode: "insensitive" } } : {},
      roleKeys.length ? { role: { key: { in: roleKeys } } } : {},
      cidades.length  ? { cidade: { in: cidades } } : {},
      bairros.length  ? { bairro: { in: bairros } } : {},
      labels.length   ? { labels: { hasSome: labels } } : {},
      liderIds.length ? { parentId: { in: liderIds } } : {},
    ],
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        role: roleSelect,
        parent: { select: { id: true, name: true, score: true, role: roleSelect } },
        _count: { select: { children: true } },
      },
      orderBy: [{ role: { level: "asc" } }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, roleId, parentId, notes, dataNascimento, genero, rua, bairro, cidade, zona, customFields } = body;

  if (!name || !phone) return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });

  const existing = await prisma.contact.findUnique({ where: { phone } });
  if (existing) return NextResponse.json({ error: "Telefone já cadastrado" }, { status: 409 });

  const resolvedRoleId = roleId ?? (await prisma.personRole.findFirst({ orderBy: { level: "desc" } }))?.id;
  if (!resolvedRoleId) return NextResponse.json({ error: "Nenhum cargo cadastrado" }, { status: 400 });

  const contact = await prisma.contact.create({
    data: {
      name, phone, email, roleId: resolvedRoleId, parentId: parentId ?? null,
      notes, source: "manual",
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      genero, rua, bairro, cidade, zona,
      customFields: customFields && typeof customFields === "object" ? customFields : undefined,
    },
    include: { role: roleSelect },
  });

  return NextResponse.json(contact, { status: 201 });
}
