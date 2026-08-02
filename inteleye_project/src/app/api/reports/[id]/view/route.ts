import { NextResponse } from "next/server";

import { createOwnedReportSignedUrl } from "@/lib/reports/pdf";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const result = await createOwnedReportSignedUrl(params.id, false);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
  return NextResponse.redirect(result.signedUrl);
}
