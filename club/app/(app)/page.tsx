import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { isStaff, requireUser } from "@/lib/auth";
import { fmtQty, fmtRating } from "@/lib/constants";
import { db } from "@/lib/db";
import { leaderboard, matchInclude } from "@/lib/queries";

export default async function Home() {
  const me = await requireUser();
  const [pendingAll, recent, top, myRatings, owed, pendingUsers] = await Promise.all([
    db.match.findMany({
      where: { status: "PENDING", ...(isStaff(me) ? {} : { players: { some: { userId: me.id } } }) },
      include: matchInclude, orderBy: { playedAt: "desc" },
    }),
    db.match.findMany({ where: { status: "CONFIRMED" }, include: matchInclude, orderBy: { playedAt: "desc" }, take: 5 }),
    leaderboard("DOUBLES", "all"),
    db.rating.findMany({ where: { userId: me.id } }),
    db.match.findMany({
      where: { status: "CONFIRMED", stakeItem: { not: null }, stakePaid: false, players: { some: { userId: me.id } } },
      include: matchInclude,
    }),
    me.role === "ADMIN" ? db.user.count({ where: { status: "PENDING" } }) : 0,
  ]);
  // Trận cần tôi xác nhận: tôi ở đội đối diện người ghi (admin/trưởng nhóm thấy tất cả).
  const needMe = pendingAll.filter((m) => {
    if (isStaff(me)) return true;
    const mine = m.players.find((p) => p.userId === me.id);
    const creator = m.players.find((p) => p.userId === m.createdById);
    return mine && creator && mine.team !== creator.team;
  });
  const waiting = pendingAll.filter((m) => !needMe.includes(m));
  const d = myRatings.find((r) => r.category === "DOUBLES");
  const s = myRatings.find((r) => r.category === "SINGLES");
  const base = me.level?.baseRating ?? 3;
  const iOwe = owed.filter((m) => m.players.find((p) => p.userId === me.id)!.team !== m.winnerTeam);
  const owedToMe = owed.filter((m) => !iOwe.includes(m));

  return (
    <>
      <section className="card bg-brand text-white" style={{ background: "var(--color-brand)" }}>
        <div className="flex items-center gap-3">
          <Avatar user={me} size={48} />
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">Chào {me.nickname || me.name}!</div>
            <div className="text-sm text-white/70">{me.level?.name ?? "Chưa xếp nhóm trình"}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[{ label: "Trình đôi", r: d }, { label: "Trình đơn", r: s }].map(({ label, r }) => (
            <div key={label} className="rounded-xl bg-white/10 p-3">
              <div className="text-xs text-white/70">{label}</div>
              <div className="num text-2xl font-bold">{fmtRating(r?.value ?? base)}</div>
              <div className="text-xs text-white/70">{r ? `${r.wins} thắng / ${r.matches} trận` : "Chưa có trận"}</div>
            </div>
          ))}
        </div>
        <Link href="/tran-dau/moi" className="btn btn-gold mt-4 w-full">+ Ghi trận đấu</Link>
      </section>

      {pendingUsers > 0 && (
        <Link href="/admin" className="card flex items-center justify-between border-gold bg-gold-soft/50 font-semibold">
          <span>👤 {pendingUsers} thành viên chờ duyệt</span><span aria-hidden>›</span>
        </Link>
      )}

      {needMe.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Cần xác nhận ({needMe.length})</h2>
          <div className="space-y-2">{needMe.map((m) => <MatchCard key={m.id} m={m} />)}</div>
        </section>
      )}
      {waiting.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Đang chờ đối thủ xác nhận</h2>
          <div className="space-y-2">{waiting.map((m) => <MatchCard key={m.id} m={m} />)}</div>
        </section>
      )}

      {(iOwe.length > 0 || owedToMe.length > 0) && (
        <Link href="/so-do" className="card block">
          <h2 className="mb-1 font-bold">🍺 Độ chưa thanh toán</h2>
          {iOwe.length > 0 && <p className="text-sm text-accent">Bạn đang nợ: {iOwe.map((m) => `${fmtQty(m.stakeQty)} ${m.stakeItem}`).join(", ")}</p>}
          {owedToMe.length > 0 && <p className="text-sm text-brand">Bạn được nhận: {owedToMe.map((m) => `${fmtQty(m.stakeQty)} ${m.stakeItem}`).join(", ")}</p>}
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold">🏆 Top 5 đánh đôi</h2>
          <Link href="/bang-phong-than" className="text-sm font-semibold text-brand">Xem tất cả ›</Link>
        </div>
        <div className="card divide-y divide-line p-0">
          {top.slice(0, 5).map((r, i) => (
            <Link key={r.user.id} href={`/thanh-vien/${r.user.id}`} className="flex items-center gap-3 px-4 py-2.5">
              <span className="num w-5 text-center font-bold text-gold">{i + 1}</span>
              <Avatar user={r.user} size={32} />
              <span className="min-w-0 flex-1 truncate font-semibold">{r.user.nickname || r.user.name}</span>
              <span className="num font-bold">{fmtRating(r.rating)}</span>
            </Link>
          ))}
          {top.length === 0 && <p className="px-4 py-6 text-center text-sm text-mute">Chưa có trận đấu nào được ghi nhận.</p>}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold">Trận gần đây</h2>
          <Link href="/tran-dau" className="text-sm font-semibold text-brand">Xem tất cả ›</Link>
        </div>
        <div className="space-y-2">
          {recent.map((m) => <MatchCard key={m.id} m={m} />)}
          {recent.length === 0 && <p className="card text-center text-sm text-mute">Hãy là người đầu tiên ghi trận!</p>}
        </div>
      </section>
    </>
  );
}
