import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Retorna as opções disponíveis para filtrar o relatório de líderes —
// valores únicos dos campos padrão (cidade/bairro/zona/genero) e dos
// campos personalizados cadastrados.
export async function GET() {
  const customFields = await prisma.contactCustomField.findMany({ orderBy: { position: "asc" } });

  // Campos padrão: groupBy retorna valores únicos rapidamente.
  const stdFieldKeys = ["cidade", "bairro", "zona", "genero"] as const;
  const standard: { key: string; label: string; values: string[] }[] = [];
  for (const f of stdFieldKeys) {
    const rows = await (prisma.contact as any).groupBy({ by: [f] });
    const values = rows
      .map((r: any) => r[f])
      .filter((v: any) => v !== null && v !== undefined && String(v).trim() !== "")
      .map((v: any) => String(v))
      .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));
    if (values.length > 0) {
      standard.push({
        key: f,
        label: f === "genero" ? "Gênero" : f[0].toUpperCase() + f.slice(1),
        values,
      });
    }
  }

  // Campos personalizados: carrega só o JSON dos contatos pra extrair valores.
  // Pra DBs grandes isso pode pesar — bom o suficiente até a base passar de
  // ~100k contatos. Depois dá pra trocar por uma query SQL com jsonb_each.
  const allCfs = await prisma.contact.findMany({
    where: { customFields: { not: undefined } },
    select: { customFields: true },
  });

  const cfBuckets: Record<string, Set<string>> = {};
  for (const cf of customFields) cfBuckets[cf.key] = new Set();
  for (const c of allCfs) {
    const data = c.customFields as Record<string, any> | null;
    if (!data || typeof data !== "object") continue;
    for (const cf of customFields) {
      const v = data[cf.key];
      if (v === null || v === undefined || v === "") continue;
      cfBuckets[cf.key].add(String(v));
    }
  }

  const custom = customFields.map(cf => {
    // Pra tipo select, usa as opções declaradas no cadastro (mais previsível).
    // Pra boolean, valores fixos. Pros outros, usa o que apareceu no banco.
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

  return NextResponse.json({ standard, custom });
}
