import { NextResponse } from "next/server";
import { getInvitationByToken } from "@/lib/invitation-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        staffName: invitation.staffName,
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error("GET /api/invitations/[token] failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
