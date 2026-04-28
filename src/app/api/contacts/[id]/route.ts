import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const roleSelect = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      role: roleSelect,
      parent: { select: { id: true, name: true, role: roleSelect } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, phone, email, roleId, parentId, notes, dataNascimento, genero, rua, bairro, cidade, zona } = body;

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(name  && { name }),
      ...(phone && { phone }),
      ...(email     !== undefined && { email }),
      ...(roleId    && { roleId }),
      ...(parentId  !== undefined && { parentId }),
      ...(notes     !== undefined && { notes }),
      ...(genero    !== undefined && { genero }),
      ...(rua       !== undefined && { rua }),
      ...(bairro    !== undefined && { bairro }),
      ...(cidade    !== undefined && { cidade }),
      ...(zona      !== undefined && { zona }),
      ...(dataNascimento !== undefined && {
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      }),
    },
    include: { role: roleSelect },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
