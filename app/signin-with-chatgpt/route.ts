import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  LOCAL_DEV_COOKIE,
  DEFAULT_FRIEND_USER,
  encodeSessionUser,
  ChatGPTUser,
} from "../chatgpt-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/";
  const safeReturn =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  // If interactive prompt requested
  if (url.searchParams.get("view") === "choose") {
    return NextResponse.redirect(
      new URL(`/sync?return_to=${encodeURIComponent(safeReturn)}`, request.url),
    );
  }

  // Parse optional custom account from query params (e.g. ?account=krishna&name=Krishna)
  const accountParam = url.searchParams.get("account");
  const emailParam = url.searchParams.get("email");
  const nameParam = url.searchParams.get("name");

  const user: ChatGPTUser = accountParam
    ? {
        userId: accountParam,
        displayName: nameParam || emailParam || accountParam,
        email: emailParam || `${accountParam}@growth.space`,
        fullName: nameParam || null,
      }
    : DEFAULT_FRIEND_USER;

  const cookieVal = encodeSessionUser(user);
  const response = NextResponse.redirect(new URL(safeReturn, request.url));

  // 1-year cross-device session cookie
  response.cookies.set(SESSION_COOKIE_NAME, cookieVal, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 31536000, // 365 days
  });

  // Local development / loopback cookie
  response.cookies.set(LOCAL_DEV_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 31536000,
  });

  return response;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/";
  const safeReturn =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  let body: any = {};
  try {
    const text = await request.text();
    if (text) {
      if (text.startsWith("{")) {
        body = JSON.parse(text);
      } else {
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }
    }
  } catch {
    // fallback to default
  }

  const userId = body.userId || body.account || DEFAULT_FRIEND_USER.userId;
  const displayName =
    body.displayName || body.name || DEFAULT_FRIEND_USER.displayName;
  const email = body.email || DEFAULT_FRIEND_USER.email;

  const user: ChatGPTUser = {
    userId: String(userId),
    displayName: String(displayName),
    email: String(email),
    fullName: String(displayName),
  };

  const cookieVal = encodeSessionUser(user);
  const response = NextResponse.redirect(new URL(safeReturn, request.url), {
    status: 303,
  });

  response.cookies.set(SESSION_COOKIE_NAME, cookieVal, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 31536000,
  });

  response.cookies.set(LOCAL_DEV_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 31536000,
  });

  return response;
}
