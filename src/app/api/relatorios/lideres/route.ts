import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STD_FIELDS = ["cidade", "bairro", "zona", "genero"] as const;

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
 * Performance: usa `groupBy` único nos apoiadores em vez de subquery por
 * líder. Em bases com 1000+ líderes, isso transforma N+1 numa única query
 * agregada.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const customFields = await prisma.contactCustomField.findMany();

  const buildClauses = (): any[] => {
    const and: any[] = [];

    for (const f of STD_FIELDS) {
      const vals = params.getAll(`std_${f}`).filter(v => v.trim() !== "");
      if (vals.length > 0) and.push({ [f]: { in: vals } });
    }

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

  // 1 query pra listar líderes + 1 query pra contar apoiadores por parentId
  // (em vez de N subqueries — uma por líder).
  const [leaders, apoiadorGroups] = await Promise.all([
    prisma.contact.findMany({
      where: leaderWhere,
      select: {
        id: true,
        name: true,
        role: { select: { key: true, label: true, level: true } },
      },
      orderBy: [{ role: { level: "asc" } }, { name: "asc" }],
    }),
    prisma.contact.groupBy({
      by: ["parentId"],
      where: { ...apoiadorWhere, parentId: { not: null } },
      _count: true,
    }),
  ]);

  const countByParent = new Map<string, number>();
  for (const g of apoiadorGroups) {
    if (g.parentId) countByParent.set(g.parentId, g._count);
  }

  const all = leaders.map(c => ({
    id: c.id,
    name: c.name,
    roleKey: c.role.key,
    roleLabel: c.role.label,
    count: countByParent.get(c.id) ?? 0,
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
