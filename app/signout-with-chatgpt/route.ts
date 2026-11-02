import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, LOCAL_DEV_COOKIE } from "../chatgpt-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/";
  const safeReturn =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  const response = NextResponse.redirect(new URL(safeReturn, request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(LOCAL_DEV_COOKIE);
  return response;
}

export async function POST(request: Request) {
  return GET(request);
}

