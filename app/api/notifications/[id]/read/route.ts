import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { backendMarkOneRead, ApiError } from "@/lib/api";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "인증 필요" }, { status: 401 });
  try {
    const { id } = await params;
    const r = await backendMarkOneRead(token, id);
    return NextResponse.json(r, { status: 200 });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
