import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const roleInclude = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, phone, email, roleId, parentId, notes } = body;

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(email !== undefined && { email }),
      ...(roleId && { roleId }),
      ...(parentId !== undefined && { parentId }),
      ...(notes !== undefined && { notes }),
    },
    include: { role: roleInclude },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
