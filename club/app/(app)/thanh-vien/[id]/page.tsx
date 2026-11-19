import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, CATEGORY_LABEL, fmtDate, fmtRating, ROLE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { matchInclude } from "@/lib/queries";

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const u = await db.user.findUnique({
    where: { id },
    include: { level: true, ratings: true, levelChanges: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!u || (u.status !== "ACTIVE" && me.role !== "ADMIN")) notFound();
  const [matches, levels] = await Promise.all([
    db.match.findMany({ where: { status: "CONFIRMED", players: { some: { userId: id } } }, include: matchInclude, orderBy: { playedAt: "desc" }, take: 20 }),
    db.level.findMany(),
  ]);
  const levelName = (lid: number | null) => levels.find((l) => l.id === lid)?.name ?? "Chưa xếp nhóm";
  const showPhone = u.phone && (!u.hidePhone || me.id === u.id || me.role === "ADMIN");
  const base = u.level?.baseRating ?? 3;

  return (
    <>
      <section className="card">
        <div className="flex items-center gap-4">
          <Avatar user={u} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{u.name}</h1>
            {u.nickname && <p className="truncate text-sm text-soft">“{u.nickname}”</p>}
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="chip">{u.level?.name ?? "Chưa xếp nhóm"}</span>
              {u.role !== "MEMBER" && <span className="chip chip-gold">{ROLE_LABEL[u.role]}</span>}
            </div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-xs text-mute">Giới tính</dt><dd>{u.gender === "M" ? "Nam" : u.gender === "F" ? "Nữ" : "—"}</dd></div>
          <div><dt className="text-xs text-mute">Tay thuận</dt><dd>{u.hand === "R" ? "Phải" : u.hand === "L" ? "Trái" : "—"}</dd></div>
          <div><dt className="text-xs text-mute">Gia nhập</dt><dd>{fmtDate(u.joinedAt)}</dd></div>
          <div><dt className="text-xs text-mute">SĐT / Zalo</dt><dd>{showPhone ? <a className="text-brand underline" href={`tel:${u.phone}`}>{u.phone}</a> : "—"}</dd></div>
        </dl>
        {u.bio && <p className="mt-3 text-sm text-soft">{u.bio}</p>}
        <div className="mt-4 flex gap-2">
          {me.id === u.id && <Link href="/ho-so" className="btn btn-sm">Sửa hồ sơ</Link>}
          {me.role === "ADMIN" && <Link href={`/admin/thanh-vien/${u.id}`} className="btn btn-sm">Quản trị thành viên</Link>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Trình thi đấu</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const r = u.ratings.find((x) => x.category === c);
            return (
              <div key={c} className="card p-3">
                <div className="text-xs text-mute">{CATEGORY_LABEL[c]}</div>
                <div className={`num text-xl font-bold ${r ? "" : "text-mute"}`}>{fmtRating(r?.value ?? base)}</div>
                <div className="text-xs text-mute">{r ? `${r.wins}T–${r.matches - r.wins}B` : "Chưa có trận"}</div>
              </div>
            );
          })}
        </div>
      </section>

      {u.levelChanges.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Lịch sử nhóm trình</h2>
          <ul className="card space-y-2 text-sm">
            {u.levelChanges.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span>{c.fromLevelId ? `${levelName(c.fromLevelId)} → ` : ""}<b>{levelName(c.toLevelId)}</b>{c.note ? ` · ${c.note}` : ""}</span>
                <span className="shrink-0 text-mute">{fmtDate(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold">Trận gần đây</h2>
        <div className="space-y-2">
          {matches.map((m) => <MatchCard key={m.id} m={m} />)}
          {matches.length === 0 && <p className="card text-center text-sm text-mute">Chưa có trận đấu nào.</p>}
        </div>
      </section>
    </>
  );
}
