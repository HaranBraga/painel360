import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const roleSelect = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      role: roleSelect,
      parent: { select: { id: true, name: true, score: true, role: roleSelect } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 });
  return NextResponse.json(contact);
}

function avgScores(s1: number | null, s2: number | null, s3: number | null): number | null {
  const vals = [s1, s2, s3].filter(v => v !== null) as number[];
  if (!vals.length) return null;
  return +((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, phone, email, roleId, parentId, notes, dataNascimento, genero, rua, bairro, cidade, zona, score1, score2, score3, scoreNote } = body;

  const isScoreUpdate = score1 !== undefined || score2 !== undefined || score3 !== undefined;

  // Lê valores atuais para computar média corretamente (sem sobrescrever os outros avaliadores)
  let computedScore: number | null | undefined;
  if (isScoreUpdate) {
    const cur = await prisma.contact.findUnique({
      where: { id: params.id },
      select: { score1: true, score2: true, score3: true },
    });
    const s1 = score1 !== undefined ? (score1 !== null ? parseFloat(String(score1)) : null) : (cur?.score1 ?? null);
    const s2 = score2 !== undefined ? (score2 !== null ? parseFloat(String(score2)) : null) : (cur?.score2 ?? null);
    const s3 = score3 !== undefined ? (score3 !== null ? parseFloat(String(score3)) : null) : (cur?.score3 ?? null);
    computedScore = avgScores(s1, s2, s3);
  }

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
      ...(score1 !== undefined && { score1: score1 !== null ? parseFloat(String(score1)) : null }),
      ...(score2 !== undefined && { score2: score2 !== null ? parseFloat(String(score2)) : null }),
      ...(score3 !== undefined && { score3: score3 !== null ? parseFloat(String(score3)) : null }),
      ...(computedScore !== undefined && { score: computedScore }),
      ...(scoreNote !== undefined && { scoreNote }),
    },
    include: { role: roleSelect },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
