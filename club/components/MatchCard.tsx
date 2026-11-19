import Link from "next/link";
import { CATEGORY_LABEL, fmtDateTime, fmtQty, MATCH_STATUS_LABEL } from "@/lib/constants";
import type { MatchWithPlayers } from "@/lib/queries";
import { parseSets } from "@/lib/rating";

export function StakeLine({ m }: { m: { stakeItem: string | null; stakeQty: number | null; stakePaid: boolean; status: string } }) {
  if (!m.stakeItem) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-gold-soft/60 px-3 py-2 text-sm">
      <span>
        🍺 <b>Độ:</b> {fmtQty(m.stakeQty)} {m.stakeItem}
      </span>
      {m.status === "CONFIRMED" && (
        <span className={`chip ${m.stakePaid ? "" : "chip-red"}`}>{m.stakePaid ? "Đã trả" : "Chưa trả"}</span>
      )}
    </div>
  );
}

export function MatchCard({ m, link = true }: { m: MatchWithPlayers; link?: boolean }) {
  const sets = parseSets(m.sets);
  const team = (t: number) => m.players.filter((p) => p.team === t);
  const row = (t: 1 | 2) => {
    const win = m.winnerTeam === t;
    return (
      <div className={`flex items-center justify-between gap-3 ${win ? "font-bold" : "text-soft"}`}>
        <span className="min-w-0 truncate">
          {win && <span aria-label="Thắng">🏆 </span>}
          {team(t).map((p) => p.user.nickname || p.user.name).join(" – ")}
        </span>
        <span className="num flex shrink-0 gap-3 text-lg">
          {sets.map((s, i) => (
            <span key={i} className={s[t - 1] > s[2 - t] ? "text-ink" : "text-mute"}>{s[t - 1]}</span>
          ))}
        </span>
      </div>
    );
  };
  const body = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-mute">
        <span className="flex items-center gap-2">
          <span className="chip">{CATEGORY_LABEL[m.category]}</span>
          {fmtDateTime(m.playedAt)}
        </span>
        {m.status !== "CONFIRMED" && (
          <span className={`chip ${m.status === "PENDING" ? "chip-gold" : "chip-red"}`}>{MATCH_STATUS_LABEL[m.status]}</span>
        )}
      </div>
      <div className="space-y-1">
        {row(1)}
        {row(2)}
      </div>
      <StakeLine m={m} />
    </>
  );
  return link ? (
    <Link href={`/tran-dau/${m.id}`} className="card block active:bg-bg">{body}</Link>
  ) : (
    <div className="card">{body}</div>
  );
}
