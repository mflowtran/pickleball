import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { CLUB_NAME } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <>
      <header className="sticky top-0 z-20 bg-brand text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="min-w-0 truncate font-bold">🏓 {CLUB_NAME}</Link>
          <div className="flex shrink-0 items-center gap-3">
            {me.role === "ADMIN" && <Link href="/admin" className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold">Quản trị</Link>}
            <Link href="/ho-so" aria-label="Hồ sơ của tôi"><Avatar user={me} size={32} /></Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-4">{children}</main>
      <Nav />
    </>
  );
}
