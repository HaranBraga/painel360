import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STD_FIELD_KEYS = ["cidade", "bairro", "zona", "genero"] as const;
const STD_LABELS: Record<string, string> = {
  cidade: "Cidade",
  bairro: "Bairro",
  zona:   "Zona",
  genero: "Gênero",
};

/**
 * Opções pros filtros do relatório de líderes — valores únicos dos campos
 * padrão (cidade/bairro/zona/genero) e dos campos personalizados.
 *
 * Performance:
 *  - Os 4 groupBys rodam em paralelo via Promise.all.
 *  - Pros campos personalizados, em vez de carregar `customFields` de todos
 *    os contatos, usamos uma única query SQL com `jsonb_each_text` que já
 *    retorna distintos (chave, valor) direto do Postgres.
 *  - Resposta tem Cache-Control 30s — valores únicos não mudam toda hora.
 */
export async function GET() {
  const customFields = await prisma.contactCustomField.findMany({ orderBy: { position: "asc" } });

  const [cidadeRows, bairroRows, zonaRows, generoRows, cfRows] = await Promise.all([
    (prisma.contact as any).groupBy({ by: ["cidade"] }),
    (prisma.contact as any).groupBy({ by: ["bairro"] }),
    (prisma.contact as any).groupBy({ by: ["zona"] }),
    (prisma.contact as any).groupBy({ by: ["genero"] }),
    // 1 query SQL pra todos os campos personalizados de uma vez.
    prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT DISTINCT k.key, k.value
      FROM "Contact" c, LATERAL jsonb_each_text(c."customFields") k
      WHERE c."customFields" IS NOT NULL AND k.value <> ''
    `,
  ]);

  const stdMap: Record<string, any[]> = {
    cidade: cidadeRows, bairro: bairroRows, zona: zonaRows, genero: generoRows,
  };

  const standard: { key: string; label: string; values: string[] }[] = [];
  for (const f of STD_FIELD_KEYS) {
    const rows = stdMap[f];
    const values = rows
      .map((r: any) => r[f])
      .filter((v: any) => v !== null && v !== undefined && String(v).trim() !== "")
      .map((v: any) => String(v))
      .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));
    if (values.length > 0) standard.push({ key: f, label: STD_LABELS[f], values });
  }

  // Indexa valores únicos por chave (vindos do SQL).
  const cfBuckets: Record<string, Set<string>> = {};
  for (const cf of customFields) cfBuckets[cf.key] = new Set();
  for (const row of cfRows) {
    if (!row?.key) continue;
    if (cfBuckets[row.key]) cfBuckets[row.key].add(row.value);
  }

  const custom = customFields.map(cf => {
    let values: string[];
    if (cf.type === "boolean") {
      values = ["true", "false"];
    } else if (cf.type === "select" && cf.options.length > 0) {
      values = cf.options;
    } else {
      values = Array.from(cfBuckets[cf.key] ?? []).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
    return { key: cf.key, label: cf.label, type: cf.type, values };
  }).filter(cf => cf.values.length > 0);

  return NextResponse.json(
    { standard, custom },
    {
      headers: {
        // Cache curto: os valores únicos não mudam a cada segundo, dá pra
        // segurar 30s sem prejuízo de frescor.
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
