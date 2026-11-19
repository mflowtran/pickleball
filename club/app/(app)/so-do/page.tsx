import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { fmtQty } from "@/lib/constants";
import { db } from "@/lib/db";
import { matchInclude } from "@/lib/queries";

type Tally = { user: { id: string; name: string; nickname: string | null; avatarUrl: string | null }; owe: Map<string, number>; get: Map<string, number> };

const sumText = (m: Map<string, number>) => [...m].map(([item, q]) => `${fmtQty(q)} ${item}`).join(", ");

export default async function Stakes({ searchParams }: { searchParams: Promise<{ xem?: string }> }) {
  const paidView = (await searchParams).xem === "da-tra";
  const [unpaid, paid] = await Promise.all([
    db.match.findMany({ where: { status: "CONFIRMED", stakeItem: { not: null }, stakePaid: false }, include: matchInclude, orderBy: { playedAt: "desc" } }),
    paidView
      ? db.match.findMany({ where: { status: "CONFIRMED", stakeItem: { not: null }, stakePaid: true }, include: matchInclude, orderBy: { playedAt: "desc" }, take: 50 })
      : [],
  ]);

  // Tổng hợp nợ theo người (tính theo đội: cả đội thua cùng nợ, cả đội thắng cùng nhận).
  const tally = new Map<string, Tally>();
  for (const m of unpaid) {
    const item = m.stakeItem!.toLowerCase();
    for (const p of m.players) {
      const t = tally.get(p.userId) ?? { user: p.user, owe: new Map(), get: new Map() };
      const side = p.team === m.winnerTeam ? t.get : t.owe;
      side.set(item, (side.get(item) ?? 0) + (m.stakeQty ?? 0));
      tally.set(p.userId, t);
    }
  }
  const rows = [...tally.values()].sort((a, b) => b.owe.size - a.owe.size || a.user.name.localeCompare(b.user.name, "vi"));

  return (
    <>
      <h1 className="text-xl font-bold">🍺 Sổ độ</h1>
      <div className="tabs">
        <Link href="/so-do" className={`tab ${!paidView ? "tab-on" : ""}`}>Chưa trả ({unpaid.length})</Link>
        <Link href="/so-do?xem=da-tra" className={`tab ${paidView ? "tab-on" : ""}`}>Đã trả</Link>
      </div>

      {!paidView && rows.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Ai nợ, ai nhận</h2>
          <div className="card divide-y divide-line p-0">
            {rows.map((t) => (
              <Link key={t.user.id} href={`/thanh-vien/${t.user.id}`} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar user={t.user} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.user.nickname || t.user.name}</span>
                  {t.owe.size > 0 && <span className="block text-sm text-accent">Nợ: {sumText(t.owe)}</span>}
                  {t.get.size > 0 && <span className="block text-sm text-brand">Nhận: {sumText(t.get)}</span>}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-1 text-xs text-mute">Tính theo đội: số lượng ghi là phần của cả đội, không chia đầu người.</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold">{paidView ? "Kèo đã thanh toán" : "Các kèo chưa thanh toán"}</h2>
        <div className="space-y-2">
          {(paidView ? paid : unpaid).map((m) => <MatchCard key={m.id} m={m} />)}
          {(paidView ? paid : unpaid).length === 0 && (
            <p className="card text-center text-sm text-mute">{paidView ? "Chưa có kèo nào được thanh toán." : "Không ai nợ ai. Sòng phẳng! 🎉"}</p>
          )}
        </div>
      </section>
    </>
  );
}
