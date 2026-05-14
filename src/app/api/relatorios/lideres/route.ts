import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STD_FIELDS = ["cidade", "bairro", "zona", "genero"] as const;
type StdField = (typeof STD_FIELDS)[number];

/**
 * Relatório: cada não-apoiador com a quantidade de APOIADORES DIRETOS,
 * agrupado por papel (Coord. de Grupo, Coord., Líder).
 *
 * Aceita filtros nas query params (combinados com AND entre campos diferentes,
 * OR dentro do mesmo campo). O mesmo filtro é aplicado AO LÍDER (para decidir
 * quais aparecem) E AO APOIADOR (para decidir quais contam).
 *
 *   - std_<campo>=<valor>     ex: std_cidade=São Paulo
 *   - cf_<chave>=<valor>      ex: cf_religiao=Católico
 *
 * Os parâmetros podem repetir (ex: std_cidade=SP&std_cidade=RJ → in [SP, RJ]).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const customFields = await prisma.contactCustomField.findMany();

  // Constrói as cláusulas Prisma reutilizáveis para líder e apoiador.
  const buildClauses = (): any[] => {
    const and: any[] = [];

    // Campos padrão: scalar `in`.
    for (const f of STD_FIELDS) {
      const vals = params.getAll(`std_${f}`).filter(v => v.trim() !== "");
      if (vals.length > 0) and.push({ [f]: { in: vals } });
    }

    // Campos personalizados: filtro em JSON via `path` + `equals`.
    // Múltiplos valores no mesmo campo → OR de equals (Prisma não tem `in` pra JSON).
    for (const cf of customFields) {
      const raw = params.getAll(`cf_${cf.key}`).filter(v => v.trim() !== "");
      if (raw.length === 0) continue;
      const equalsValues = raw.map(v => {
        if (cf.type === "boolean") return v === "true";
        if (cf.type === "number") {
          const n = Number(v);
          return Number.isFinite(n) ? n : v;
        }
        return v;
      });
      and.push({
        OR: equalsValues.map(v => ({
          customFields: { path: [cf.key], equals: v as any },
        })),
      });
    }

    return and;
  };

  const filterClauses = buildClauses();

  const leaderWhere: any = { role: { key: { not: "APOIADOR" } } };
  const apoiadorWhere: any = { role: { key: "APOIADOR" } };
  if (filterClauses.length > 0) {
    leaderWhere.AND = filterClauses;
    apoiadorWhere.AND = filterClauses;
  }

  const contacts = await prisma.contact.findMany({
    where: leaderWhere,
    select: {
      id: true,
      name: true,
      role: { select: { key: true, label: true, level: true } },
      _count: {
        select: {
          children: { where: apoiadorWhere },
        },
      },
    },
    orderBy: [{ role: { level: "asc" } }, { name: "asc" }],
  });

  const all = contacts.map(c => ({
    id: c.id,
    name: c.name,
    roleKey: c.role.key,
    roleLabel: c.role.label,
    count: c._count.children,
  }));

  const sectionsOrder: { key: string; label: string }[] = [
    { key: "COORDENADOR_GRUPO", label: "Coordenadores de Grupo" },
    { key: "COORDENADOR",       label: "Coordenadores" },
    { key: "LIDER",             label: "Líderes" },
  ];

  const sections = sectionsOrder.map(s => {
    const items = all
      .filter(c => c.roleKey === s.key)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
    return { ...s, items };
  });

  const totalApoiadores = all.reduce((sum, c) => sum + c.count, 0);

  return NextResponse.json({ sections, totalApoiadores });
}
