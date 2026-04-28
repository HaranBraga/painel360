import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_KEYS = [
  "goal_total_pessoas",
  "goal_total_lideres",
  "goal_total_coordenadores",
];

export async function GET() {
  const rows = await prisma.appConfig.findMany({ where: { key: { in: DEFAULT_KEYS } } });
  const config: Record<string, string | null> = {};
  for (const key of DEFAULT_KEYS) {
    config[key] = rows.find(r => r.key === key)?.value ?? null;
  }
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
