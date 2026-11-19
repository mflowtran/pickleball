import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { db } from "./db";

const COOKIE = "sid";
const MAX_AGE = 60 * 24 * 3600; // 60 ngày

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, salt, 64);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isSecure() {
  return (process.env.APP_URL ?? "").startsWith("https://");
}

export async function createSession(userId: string) {
  const id = randomBytes(32).toString("hex");
  await db.session.create({ data: { id, userId, expiresAt: new Date(Date.now() + MAX_AGE * 1000) } });
  (await cookies()).set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: isSecure(), path: "/", maxAge: MAX_AGE });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  jar.delete(COOKIE);
}

/** Người dùng đang đăng nhập (bất kể trạng thái), hoặc null. */
export const getUser = cache(async () => {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const s = await db.session.findUnique({ where: { id }, include: { user: { include: { level: true } } } });
  if (!s || s.expiresAt < new Date()) return null;
  return s.user;
});

/** Yêu cầu thành viên đã được duyệt; nếu không thì chuyển hướng. */
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/dang-nhap");
  if (u.status !== "ACTIVE") redirect("/cho-duyet");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/");
  return u;
}

export function isStaff(u: { role: string }) {
  return u.role === "ADMIN" || u.role === "LEADER";
}

function envList(name: string) {
  return (process.env[name] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Email/SĐT nằm trong ADMIN_EMAILS / ADMIN_PHONES thì tự thành admin. */
export function bootstrapRole(email?: string | null, phone?: string | null) {
  const isAdmin =
    (email && envList("ADMIN_EMAILS").includes(email.toLowerCase())) ||
    (phone && envList("ADMIN_PHONES").includes(phone));
  return isAdmin ? { role: "ADMIN", status: "ACTIVE" } : {};
}
