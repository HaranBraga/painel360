import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upperOrNull } from "@/lib/contact-normalize";

export const dynamic = "force-dynamic";

const roleSelect = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      role: roleSelect,
      parent: { select: { id: true, name: true, score: true, role: roleSelect } },
      children: {
        select: { id: true, name: true, phone: true, score: true, cidade: true, bairro: true, role: roleSelect, _count: { select: { children: true } } },
        orderBy: [{ role: { level: "asc" } }, { name: "asc" }],
      },
      _count: { select: { children: true } },
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
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON inválido no corpo da requisição" }, { status: 400 });
    }
    const { name, phone, email, roleId, parentId, notes, dataNascimento, genero, rua, bairro, cidade, zona, score1, score2, score3, scoreNote, labels, customFields } = body as any;

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

    // Normalizações defensivas:
    //  - parentId="" não é FK válida → vira null
    //  - parentId === id (auto-referência) → vira null pra não criar ciclo
    //  - phone limpo: só dígitos, mantém prefixo 55
    let normalizedParentId: string | null | undefined = undefined;
    if (parentId !== undefined) {
      const p = (parentId === null || parentId === "") ? null : String(parentId);
      normalizedParentId = p === params.id ? null : p;
    }

    let normalizedPhone: string | undefined;
    if (phone !== undefined && phone !== null && String(phone).trim() !== "") {
      const digits = String(phone).replace(/\D/g, "");
      if (digits.length >= 10) {
        normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
      }
    }

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...(name  && { name: String(name).trim().toUpperCase() }),
        ...(normalizedPhone && { phone: normalizedPhone }),
        ...(email     !== undefined && { email: email || null }),
        ...(roleId    && { roleId }),
        ...(normalizedParentId !== undefined && { parentId: normalizedParentId }),
        ...(notes     !== undefined && { notes }),
        ...(genero    !== undefined && { genero: upperOrNull(genero) }),
        ...(rua       !== undefined && { rua: upperOrNull(rua) }),
        ...(bairro    !== undefined && { bairro: upperOrNull(bairro) }),
        ...(cidade    !== undefined && { cidade: upperOrNull(cidade) }),
        ...(zona      !== undefined && { zona: upperOrNull(zona) }),
        ...(dataNascimento !== undefined && {
          dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        }),
        ...(score1 !== undefined && { score1: score1 !== null ? parseFloat(String(score1)) : null }),
        ...(score2 !== undefined && { score2: score2 !== null ? parseFloat(String(score2)) : null }),
        ...(score3 !== undefined && { score3: score3 !== null ? parseFloat(String(score3)) : null }),
        ...(computedScore !== undefined && { score: computedScore }),
        ...(scoreNote !== undefined && { scoreNote }),
        ...(labels    !== undefined && { labels: Array.isArray(labels) ? labels : [] }),
        ...(customFields !== undefined && { customFields: customFields && typeof customFields === "object" ? customFields : null }),
      },
      include: { role: roleSelect },
    });
    return NextResponse.json(contact);
  } catch (e: any) {
    console.error("[contacts PUT]", params.id, e);
    // Erro comum: P2002 (unique constraint, ex: phone) e P2003 (FK).
    const code = e?.code;
    const msg = code === "P2002" ? `Já existe um contato com esse ${e?.meta?.target?.[0] ?? "campo"}`
              : code === "P2003" ? `Referência inválida (${e?.meta?.field_name ?? "FK"})`
              : code === "P2025" ? "Contato não encontrado"
              : e?.message ?? "Erro ao atualizar contato";
    return NextResponse.json({ error: msg }, { status: code === "P2025" ? 404 : 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.contact.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[contacts DELETE]", params.id, e);
    return NextResponse.json({ error: e?.message ?? "Erro ao excluir contato" }, { status: 500 });
  }
}
