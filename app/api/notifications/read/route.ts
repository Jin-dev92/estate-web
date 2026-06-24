import { NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { backendMarkAllRead, ApiError } from "@/lib/api";

export async function PATCH() {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "인증 필요" }, { status: 401 });
  try {
    const r = await backendMarkAllRead(token);
    return NextResponse.json(r, { status: 200 });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
