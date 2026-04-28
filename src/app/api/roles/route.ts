import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const roles = await prisma.personRole.findMany({ orderBy: { level: "asc" } });
  return NextResponse.json(roles);
}
