import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { label, type, options, required, position } = body;
  const data: any = {};
  if (label    !== undefined) data.label = String(label).trim();
  if (type     !== undefined) data.type = type;
  if (options  !== undefined) data.options = Array.isArray(options) ? options : [];
  if (required !== undefined) data.required = !!required;
  if (position !== undefined) data.position = Number(position) || 0;
  const field = await prisma.contactCustomField.update({ where: { id: params.id }, data });
  return NextResponse.json(field);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contactCustomField.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
