import "server-only";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "apl_admin";

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === "1";
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export function checkAdminPassword(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "autonex-admin";
  return pw === expected;
}
