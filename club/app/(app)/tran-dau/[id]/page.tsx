import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/MatchCard";
import { SubmitButton } from "@/components/SubmitButton";
import { confirmMatch, deleteMatch, rejectMatch, setStakePaid } from "@/lib/actions";
import { isStaff, requireUser } from "@/lib/auth";
import { CATEGORY_LABEL, fmtDateTime, fmtQty, fmtRating } from "@/lib/constants";
import { db } from "@/lib/db";
import { matchInclude } from "@/lib/queries";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const m = await db.match.findUnique({
    where: { id },
    include: { ...matchInclude, createdBy: { select: { name: true } }, ratingChanges: { orderBy: { category: "asc" } } },
  });
  if (!m) notFound();
  const mine = m.players.find((p) => p.userId === me.id);
  const creator = m.players.find((p) => p.userId === m.createdById);
  const staff = isStaff(me);
  if (m.status !== "CONFIRMED" && !mine && !staff && m.createdById !== me.id) notFound();
  const canConfirm = m.status === "PENDING" && (staff || (!!mine && !!creator && mine.team !== creator.team));
  const canDelete = me.role === "ADMIN" || (m.createdById === me.id && m.status !== "CONFIRMED");
  const canPay = m.status === "CONFIRMED" && !!m.stakeItem && (staff || mine?.team === m.winnerTeam);
  const names = (t: number) => m.players.filter((p) => p.team === t).map((p) => p.user.nickname || p.user.name).join(", ");
  const loser = m.winnerTeam === 1 ? 2 : 1;
  const confirmer = m.confirmedById ? await db.user.findUnique({ where: { id: m.confirmedById }, select: { name: true } }) : null;

  return (
    <>
      <Link href="/tran-dau" className="text-sm font-semibold text-brand">‹ Nhật ký trận đấu</Link>
      <MatchCard m={m} link={false} />

      {m.status === "PENDING" && (
        <div className="card border-gold bg-gold-soft/40">
          {canConfirm ? (
            <>
              <p className="mb-3 text-sm">Tỷ số này có đúng không? Sau khi xác nhận, trận sẽ được tính điểm trình.</p>
              <div className="flex gap-2">
                <form action={confirmMatch} className="flex-1"><input type="hidden" name="id" value={m.id} /><SubmitButton className="btn btn-primary w-full">✓ Xác nhận</SubmitButton></form>
                <form action={rejectMatch} className="flex-1"><input type="hidden" name="id" value={m.id} /><SubmitButton className="btn btn-danger w-full" confirm="Từ chối tỷ số này?">✕ Sai tỷ số</SubmitButton></form>
              </div>
            </>
          ) : (
            <p className="text-sm">⏳ Đang chờ đội đối thủ (hoặc quản trị/trưởng nhóm) xác nhận.</p>
          )}
        </div>
      )}
      {m.status === "REJECTED" && <p className="card border-accent-soft text-sm text-accent">Trận này bị từ chối vì tỷ số chưa đúng. Người ghi có thể xoá và ghi lại.</p>}

      {m.stakeItem && (
        <div className="card">
          <h2 className="mb-2 font-bold">🍺 Độ: {fmtQty(m.stakeQty)} {m.stakeItem}</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2"><dt className="w-20 shrink-0 text-mute">Bên thua trả</dt><dd className="font-semibold">{names(loser)}</dd></div>
            <div className="flex gap-2"><dt className="w-20 shrink-0 text-mute">Bên nhận</dt><dd className="font-semibold">{names(m.winnerTeam)}</dd></div>
            {m.stakeNote && <div className="flex gap-2"><dt className="w-20 shrink-0 text-mute">Ghi chú</dt><dd>{m.stakeNote}</dd></div>}
            {m.stakePaid && m.stakePaidAt && <div className="flex gap-2"><dt className="w-20 shrink-0 text-mute">Đã trả</dt><dd>{fmtDateTime(m.stakePaidAt)}</dd></div>}
          </dl>
          {canPay && (
            <form action={setStakePaid} className="mt-3">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="paid" value={m.stakePaid ? "0" : "1"} />
              <SubmitButton className={`btn w-full ${m.stakePaid ? "" : "btn-gold"}`}>{m.stakePaid ? "Đánh dấu chưa trả" : "✓ Đánh dấu đã trả"}</SubmitButton>
            </form>
          )}
        </div>
      )}

      {m.ratingChanges.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-bold">Thay đổi điểm trình</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {m.ratingChanges.map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5 pr-2">{m.players.find((p) => p.userId === c.userId)?.user.name}</td>
                  <td className="py-1.5 pr-2 text-xs text-mute">{CATEGORY_LABEL[c.category]}</td>
                  <td className="num py-1.5 text-right">{fmtRating(c.after)}</td>
                  <td className={`num w-16 py-1.5 text-right font-semibold ${c.delta >= 0 ? "text-brand" : "text-accent"}`}>{c.delta >= 0 ? "+" : ""}{c.delta.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card space-y-1 text-sm text-soft">
        {m.note && <p>📝 {m.note}</p>}
        <p>Người ghi: {m.createdBy.name} · {fmtDateTime(m.createdAt)}</p>
        {confirmer && m.status !== "PENDING" && <p>{m.status === "CONFIRMED" ? "Xác nhận" : "Từ chối"} bởi: {confirmer.name}</p>}
      </div>

      {canDelete && (
        <form action={deleteMatch}>
          <input type="hidden" name="id" value={m.id} />
          <SubmitButton className="btn btn-danger w-full" confirm="Xoá trận đấu này? Điểm trình sẽ được tính lại.">Xoá trận đấu</SubmitButton>
        </form>
      )}
    </>
  );
}
