import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { bootstrapRole, createSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const fail = (code: string) => NextResponse.redirect(`${appUrl}/dang-nhap?loi=${code}`);
  const jar = await cookies();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = jar.get("g_state")?.value;
  jar.delete("g_state");
  if (!code || !state || state !== saved) return fail("google");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("google");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return fail("google");
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!info.sub || !info.email || !info.email_verified) return fail("google");
  const email = info.email.toLowerCase();

  // Tìm theo tài khoản Google, hoặc hồ sơ admin đã tạo sẵn với email này.
  let user =
    (await db.user.findUnique({ where: { googleSub: info.sub } })) ??
    (await db.user.findUnique({ where: { email } }));
  if (user) {
    user = await db.user.update({
      where: { id: user.id },
      data: { googleSub: info.sub, email, avatarUrl: info.picture ?? user.avatarUrl },
    });
  } else {
    user = await db.user.create({
      data: { name: info.name ?? email, email, googleSub: info.sub, avatarUrl: info.picture, ...bootstrapRole(email, null) },
    });
  }
  if (user.status === "DISABLED") return fail("bi-khoa");
  await createSession(user.id);
  return NextResponse.redirect(`${appUrl}/`);
}
