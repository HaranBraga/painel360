import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  const note = await prisma.contactNote.update({
    where: { id: params.noteId },
    data: { body: String(body).trim() },
    include: { author: { select: { id: true, name: true, username: true } } },
  });
  return NextResponse.json(note);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  await prisma.contactNote.delete({ where: { id: params.noteId } });
  return NextResponse.json({ ok: true });
}
