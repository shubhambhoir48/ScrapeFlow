import { NextResponse } from "next/server";
import { testMongoConnection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await testMongoConnection();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error.message }, { status: 500 });
  }
}

