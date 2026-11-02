import { NextResponse } from "next/server";
import { MongoPeopleRepository } from "@/repositories/MongoPeopleRepository";
import { seedInitialPeople } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await seedInitialPeople();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const seniority = (searchParams.get("seniority") as any) || undefined;
    const department = (searchParams.get("department") as any) || undefined;
    const status = searchParams.get("status") || undefined;
    const organizationDomain = searchParams.get("domain") || undefined;
    const hasWhatsapp = searchParams.get("hasWhatsapp") === "true";
    const hasEmail = searchParams.get("hasEmail") === "true";
    const hasLinkedin = searchParams.get("hasLinkedin") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : 0;

    const repo = new MongoPeopleRepository();
    const result = await repo.find({
      search,
      seniority,
      department,
      status,
      organizationDomain,
      hasWhatsapp: hasWhatsapp ? true : undefined,
      hasEmail: hasEmail ? true : undefined,
      hasLinkedin: hasLinkedin ? true : undefined,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo = new MongoPeopleRepository();
    const created = await repo.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

