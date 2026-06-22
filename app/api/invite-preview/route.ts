import { NextRequest, NextResponse } from "next/server";
import { backendPreviewInvite } from "@/lib/api";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  try {
    return NextResponse.json(await backendPreviewInvite(code));
  } catch {
    return NextResponse.json({ valid: false });
  }
}
