import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KEY_RE = /^[a-z][a-z0-9_]{1,30}$/;

export async function GET() {
  const fields = await prisma.contactCustomField.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { key, label, type = "text", options = [], required = false } = body;

  if (!key || !label) return NextResponse.json({ error: "key e label são obrigatórios" }, { status: 400 });
  const k = String(key).toLowerCase().trim();
  if (!KEY_RE.test(k)) {
    return NextResponse.json({ error: "key deve ter 2-31 chars, começar com letra, conter letras/números/_" }, { status: 400 });
  }
  if (!["text", "number", "date", "boolean", "select"].includes(type)) {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }
  if (type === "select" && (!Array.isArray(options) || options.length === 0)) {
    return NextResponse.json({ error: "Tipo select exige opções" }, { status: 400 });
  }

  const exists = await prisma.contactCustomField.findUnique({ where: { key: k } });
  if (exists) return NextResponse.json({ error: "Já existe um campo com essa chave" }, { status: 409 });

  const last = await prisma.contactCustomField.findFirst({ orderBy: { position: "desc" } });
  const field = await prisma.contactCustomField.create({
    data: { key: k, label: String(label).trim(), type, options: type === "select" ? options : [], required: !!required, position: (last?.position ?? -1) + 1 },
  });
  return NextResponse.json(field, { status: 201 });
}
