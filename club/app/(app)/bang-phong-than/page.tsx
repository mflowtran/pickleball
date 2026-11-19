import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { CATEGORIES, CATEGORY_LABEL, fmtRating, PERIODS } from "@/lib/constants";
import { db } from "@/lib/db";
import { leaderboard } from "@/lib/queries";

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function Board({ searchParams }: { searchParams: Promise<{ loai?: string; ky?: string; nhom?: string }> }) {
  const sp = await searchParams;
  const cat = CATEGORIES.includes(sp.loai as never) ? sp.loai! : "DOUBLES";
  const period = PERIODS.some((p) => p.key === sp.ky) ? sp.ky! : "all";
  const levelId = Number(sp.nhom) || undefined;
  const [rows, levels] = await Promise.all([leaderboard(cat, period, levelId), db.level.findMany({ orderBy: { sortOrder: "asc" } })]);
  const href = (o: { loai?: string; ky?: string; nhom?: string }) => {
    const q = new URLSearchParams({ loai: cat, ky: period, ...(levelId ? { nhom: String(levelId) } : {}), ...o });
    if (!q.get("nhom")) q.delete("nhom");
    return `/bang-phong-than?${q}`;
  };
  return (
    <>
      <h1 className="text-xl font-bold">🏆 Bảng phong thần</h1>
      <div className="tabs">
        {CATEGORIES.map((c) => <Link key={c} href={href({ loai: c })} className={`tab ${c === cat ? "tab-on" : ""}`}>{CATEGORY_LABEL[c]}</Link>)}
      </div>
      <div className="tabs">
        {PERIODS.map((p) => <Link key={p.key} href={href({ ky: p.key })} className={`tab ${p.key === period ? "tab-on" : ""}`}>{p.label}</Link>)}
      </div>
      <div className="tabs">
        <Link href={href({ nhom: "" })} className={`tab ${!levelId ? "tab-on" : ""}`}>Mọi nhóm trình</Link>
        {levels.map((l) => <Link key={l.id} href={href({ nhom: String(l.id) })} className={`tab ${l.id === levelId ? "tab-on" : ""}`}>{l.name}</Link>)}
      </div>

      <p className="text-xs text-mute">
        {period === "all" ? "Xếp theo điểm trình hiện tại." : "Xếp theo điểm trình tăng được trong kỳ (chỉ tính người có thi đấu trong kỳ)."}
      </p>

      <div className="card divide-y divide-line p-0">
        {rows.map((r, i) => (
          <Link key={r.user.id} href={`/thanh-vien/${r.user.id}`} className="flex items-center gap-3 px-3 py-3">
            <span className="num w-7 text-center text-lg font-bold text-soft">{MEDAL[i] ?? i + 1}</span>
            <Avatar user={r.user} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{r.user.nickname || r.user.name}</span>
              <span className="block truncate text-xs text-mute">
                {r.user.level?.name ?? "Chưa xếp nhóm"} · {r.wins}T–{r.matches - r.wins}B ({Math.round((r.wins / r.matches) * 100)}%)
              </span>
            </span>
            <span className="text-right">
              <span className="num block text-lg font-bold">{fmtRating(r.rating)}</span>
              {r.delta != null && (
                <span className={`num block text-xs font-semibold ${r.delta >= 0 ? "text-brand" : "text-accent"}`}>
                  {r.delta >= 0 ? "▲ +" : "▼ "}{r.delta.toFixed(3)}
                </span>
              )}
            </span>
          </Link>
        ))}
        {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-mute">Chưa có dữ liệu cho bảng này.</p>}
      </div>
    </>
  );
}
