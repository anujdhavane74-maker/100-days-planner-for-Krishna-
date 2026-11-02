import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

export const SIGN_IN_PATH = "/signin-with-chatgpt";
export const SIGN_OUT_PATH = "/signout-with-chatgpt";
export const SESSION_COOKIE_NAME = "growth_auth_session";
export const LOCAL_DEV_COOKIE = "__sites_local_auth";

export const DEFAULT_FRIEND_USER: ChatGPTUser = {
  userId: "krishna_growth_space",
  displayName: "Krishna",
  email: "krishna@growth.space",
  fullName: "Krishna",
};

export function encodeSessionUser(user: ChatGPTUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function decodeSessionUser(cookieVal: string): ChatGPTUser | null {
  try {
    const raw = Buffer.from(cookieVal, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.userId === "string") {
      return {
        userId: parsed.userId,
        displayName: parsed.displayName || parsed.email || "Krishna",
        email: parsed.email || "krishna@growth.space",
        fullName: parsed.fullName || null,
      };
    }
  } catch {
    // Malformed session cookie
  }
  return null;
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  // 1. OpenAI ChatGPT Platform Dispatch (when hosted inside ChatGPT Canvas/Sites)
  try {
    const requestHeaders = await headers();
    const userId = requestHeaders.get(USER_ID_HEADER);
    const email = requestHeaders.get(USER_EMAIL_HEADER);
    if (userId && email) {
      const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
      const fullName =
        encodedFullName &&
        requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
          ? safeDecodeURIComponent(encodedFullName)
          : null;

      return {
        userId,
        displayName: fullName ?? email,
        email,
        fullName,
      };
    }
  } catch {
    // headers() unavailable
  }

  // 2. Cross-Device Web / Mobile / Desktop session on Vercel
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      const user = decodeSessionUser(sessionCookie);
      if (user) return user;
    }

    // 3. Vite development / loopback cookie (__sites_local_auth)
    const devCookie = cookieStore.get(LOCAL_DEV_COOKIE)?.value;
    if (devCookie === "1") {
      return DEFAULT_FRIEND_USER;
    }
  } catch {
    // cookies() unavailable in non-request contexts
  }

  // Unauthenticated visitors: prompt to sign in
  return null;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === "/callback"
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
