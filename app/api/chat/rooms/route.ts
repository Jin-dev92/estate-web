import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { backendEnsureRoom, ApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "인증 필요" }, { status: 401 });
  try {
    const body = await req.json();
    const room = await backendEnsureRoom(token, body);
    return NextResponse.json(room, { status: 201 });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
