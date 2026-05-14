import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON inválido no corpo da requisição" }, { status: 400 });
    }
    const { label, type, options, required, position } = body as any;
    const data: any = {};
    if (label    !== undefined) data.label = String(label).trim();
    if (type     !== undefined) data.type = type;
    if (options  !== undefined) data.options = Array.isArray(options) ? options : [];
    if (required !== undefined) data.required = !!required;
    if (position !== undefined) data.position = Number(position) || 0;
    const field = await prisma.contactCustomField.update({ where: { id: params.id }, data });
    return NextResponse.json(field);
  } catch (e: any) {
    console.error("[custom-fields PUT]", e);
    return NextResponse.json({ error: e?.message ?? "Erro ao atualizar campo" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.contactCustomField.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[custom-fields DELETE]", e);
    return NextResponse.json({ error: e?.message ?? "Erro ao excluir campo" }, { status: 500 });
  }
}
