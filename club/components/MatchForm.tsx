"use client";

import { useActionState, useState } from "react";
import { createMatch } from "@/lib/actions";
import { STAKE_PRESETS } from "@/lib/constants";

type P = { id: string; label: string };

export function MatchForm({ players, meId, staff, now }: { players: P[]; meId: string; staff: boolean; now: string }) {
  const [state, action, pending] = useActionState(createMatch, null);
  const [kind, setKind] = useState<"DOUBLES" | "SINGLES">("DOUBLES");
  const [sel, setSel] = useState<Record<string, string>>({ t1a: staff ? "" : meId, t1b: "", t2a: "", t2b: "" });
  const [sets, setSets] = useState<[string, string][]>([["", ""]]);
  const [stake, setStake] = useState(false);

  const slots = kind === "DOUBLES" ? ["t1a", "t1b", "t2a", "t2b"] : ["t1a", "t2a"];
  const taken = (slot: string) => new Set(slots.filter((s) => s !== slot).map((s) => sel[s]).filter(Boolean));
  const picker = (slot: string, label: string) => (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        name={slot}
        required
        className="input"
        value={sel[slot]}
        onChange={(e) => setSel({ ...sel, [slot]: e.target.value })}
      >
        <option value="">{label}</option>
        {players.filter((p) => !taken(slot).has(p.id)).map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </label>
  );
  const setsJson = JSON.stringify(sets.filter(([a, b]) => a !== "" && b !== "").map(([a, b]) => [Number(a), Number(b)]));
  const setScore = (i: number, t: 0 | 1, v: string) =>
    setSets(sets.map((s, j) => (j === i ? ((t === 0 ? [v, s[1]] : [s[0], v]) as [string, string]) : s)));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="sets" value={setsJson} />

      <div className="tabs">
        {(["DOUBLES", "SINGLES"] as const).map((k) => (
          <button type="button" key={k} onClick={() => setKind(k)} className={`tab ${kind === k ? "tab-on" : ""}`}>
            {k === "DOUBLES" ? "Đánh đôi" : "Đánh đơn"}
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        <div>
          <div className="label">Đội 1</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {picker("t1a", "Chọn người chơi")}
            {kind === "DOUBLES" && picker("t1b", "Chọn đồng đội")}
          </div>
        </div>
        <div>
          <div className="label">Đội 2</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {picker("t2a", "Chọn đối thủ")}
            {kind === "DOUBLES" && picker("t2b", "Chọn đối thủ thứ hai")}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="label">Tỷ số từng set (Đội 1 – Đội 2)</div>
        <div className="space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-12 text-sm text-mute">Set {i + 1}</span>
              <input aria-label={`Set ${i + 1} đội 1`} inputMode="numeric" pattern="\d*" maxLength={2} className="input num text-center" value={s[0]} onChange={(e) => setScore(i, 0, e.target.value.replace(/\D/g, ""))} />
              <span className="text-mute">–</span>
              <input aria-label={`Set ${i + 1} đội 2`} inputMode="numeric" pattern="\d*" maxLength={2} className="input num text-center" value={s[1]} onChange={(e) => setScore(i, 1, e.target.value.replace(/\D/g, ""))} />
              {sets.length > 1 && (
                <button type="button" aria-label={`Xoá set ${i + 1}`} className="btn btn-sm" onClick={() => setSets(sets.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
        </div>
        {sets.length < 5 && (
          <button type="button" className="btn btn-sm mt-3" onClick={() => setSets([...sets, ["", ""]])}>+ Thêm set</button>
        )}
      </div>

      <div className="card space-y-3">
        <label className="block">
          <span className="label">Thời gian thi đấu</span>
          <input type="datetime-local" name="playedAt" defaultValue={now} max={now} className="input" />
        </label>
        <label className="block">
          <span className="label">Ghi chú (không bắt buộc)</span>
          <input name="note" maxLength={200} className="input" placeholder="VD: Giao hữu sáng thứ 7" />
        </label>
      </div>

      <div className="card space-y-3">
        <label className="flex items-center gap-3 font-semibold">
          <input type="checkbox" className="size-5 accent-[var(--color-gold)]" checked={stake} onChange={(e) => setStake(e.target.checked)} />
          🍺 Trận có độ
        </label>
        {stake && (
          <>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <label>
                <span className="label">Số lượng</span>
                <input name="stakeQty" inputMode="decimal" defaultValue="5" className="input num text-center" />
              </label>
              <label>
                <span className="label">Món độ</span>
                <input name="stakeItem" required list="stake-items" defaultValue="bia" maxLength={40} className="input" />
                <datalist id="stake-items">{STAKE_PRESETS.map((s) => <option key={s} value={s} />)}</datalist>
              </label>
            </div>
            <label className="block">
              <span className="label">Ghi chú độ (không bắt buộc)</span>
              <input name="stakeNote" maxLength={200} className="input" placeholder="VD: Trả tại quán sau buổi tập" />
            </label>
            <p className="text-xs text-mute">Đội thua trả cho đội thắng. Những người tham gia độ là 2 đội trong trận.</p>
          </>
        )}
      </div>

      {state?.error && <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Đang lưu…" : "Lưu trận đấu"}</button>
      <p className="text-center text-xs text-mute">
        {staff ? "Trận do quản trị/trưởng nhóm ghi được tính điểm ngay." : "Trận sẽ được tính điểm sau khi đội đối thủ xác nhận."}
      </p>
    </form>
  );
}
