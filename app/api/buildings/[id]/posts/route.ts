import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { backendCreatePost, ApiError } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "인증 필요" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const created = await backendCreatePost(token, id, body);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
