import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const roles = await prisma.personRole.findMany({ orderBy: { level: "asc" } });
  return NextResponse.json(roles);
}
