import { NextResponse } from "next/server";
import { MongoUserRepository } from "@/repositories/MongoUserRepository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email, displayName, photoURL } = body;

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing uid or email" }, { status: 400 });
    }

    const repo = new MongoUserRepository();
    const profile = await repo.upsertUser({ uid, email, displayName, photoURL });

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid") || request.headers.get("x-user-id");
    const email = searchParams.get("email") || request.headers.get("x-user-email");

    const repo = new MongoUserRepository();

    if (uid) {
      const user = await repo.findByUid(uid);
      if (user) return NextResponse.json({ profile: user });
    }

    if (email) {
      const user = await repo.findByEmail(email);
      if (user) return NextResponse.json({ profile: user });
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

