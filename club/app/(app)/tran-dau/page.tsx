import Link from "next/link";
import { MatchCard } from "@/components/MatchCard";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { matchInclude } from "@/lib/queries";

const PAGE = 20;

export default async function Matches({ searchParams }: { searchParams: Promise<{ loai?: string; loc?: string; trang?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const cat = CATEGORIES.includes(sp.loai as never) ? sp.loai! : "";
  const filter = ["toi", "do"].includes(sp.loc ?? "") ? sp.loc! : "";
  const page = Math.max(1, Number(sp.trang) || 1);
  const where = {
    // Trận chưa xác nhận / bị từ chối chỉ hiện với "Của tôi".
    status: filter === "toi" ? undefined : "CONFIRMED",
    ...(cat === "DOUBLES" ? { kind: "DOUBLES" } : cat ? { category: cat } : {}),
    ...(filter === "toi" ? { players: { some: { userId: me.id } } } : {}),
    ...(filter === "do" ? { stakeItem: { not: null } } : {}),
  };
  const [matches, total] = await Promise.all([
    db.match.findMany({ where, include: matchInclude, orderBy: { playedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.match.count({ where }),
  ]);
  const href = (o: Record<string, string>) => {
    const q = new URLSearchParams({ loai: cat, loc: filter, ...o });
    for (const k of [...q.keys()]) if (!q.get(k)) q.delete(k);
    return `/tran-dau?${q}`;
  };
  const pages = Math.ceil(total / PAGE);
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🏓 Nhật ký trận đấu</h1>
        <Link href="/tran-dau/moi" className="btn btn-primary btn-sm">+ Ghi trận</Link>
      </div>
      <div className="tabs">
        {[["", "Tất cả"], ["toi", "Của tôi"], ["do", "Có độ"]].map(([k, l]) => (
          <Link key={k} href={href({ loc: k })} className={`tab ${filter === k ? "tab-on" : ""}`}>{l}</Link>
        ))}
      </div>
      <div className="tabs">
        <Link href={href({ loai: "" })} className={`tab ${!cat ? "tab-on" : ""}`}>Mọi thể loại</Link>
        {CATEGORIES.map((c) => <Link key={c} href={href({ loai: c })} className={`tab ${c === cat ? "tab-on" : ""}`}>{CATEGORY_LABEL[c]}</Link>)}
      </div>
      <div className="space-y-2">
        {matches.map((m) => <MatchCard key={m.id} m={m} />)}
        {matches.length === 0 && <p className="card text-center text-sm text-mute">Không có trận đấu nào.</p>}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link className="btn btn-sm" href={href({ trang: String(page - 1) })}>‹ Mới hơn</Link> : <span />}
          <span className="text-mute">Trang {page}/{pages}</span>
          {page < pages ? <Link className="btn btn-sm" href={href({ trang: String(page + 1) })}>Cũ hơn ›</Link> : <span />}
        </div>
      )}
    </>
  );
}
