import { NextResponse } from "next/server";
import { MongoCompanyRepository } from "@/repositories/MongoCompanyRepository";
import { seedInitialData } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await seedInitialData();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : 0;

    const repo = new MongoCompanyRepository();
    const result = await repo.find({ search, status, minRating, limit, skip });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo = new MongoCompanyRepository();
    const created = await repo.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
