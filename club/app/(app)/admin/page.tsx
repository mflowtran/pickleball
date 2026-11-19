import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { approveUser, recomputeRatings, saveLevel, saveMember } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, ROLE_LABEL, STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";

export default async function Admin() {
  await requireAdmin();
  const [levels, users] = await Promise.all([
    db.level.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }], include: { level: true } }),
  ]);
  const pending = users.filter((u) => u.status === "PENDING");
  const others = users.filter((u) => u.status !== "PENDING");
  const levelOptions = (
    <>
      <option value="">Chưa xếp nhóm</option>
      {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </>
  );
  return (
    <>
      <h1 className="text-xl font-bold">⚙️ Quản trị</h1>

      <section>
        <h2 className="mb-2 font-bold">Chờ phê duyệt ({pending.length})</h2>
        <div className="space-y-2">
          {pending.map((u) => (
            <form key={u.id} action={approveUser} className="card space-y-3">
              <input type="hidden" name="id" value={u.id} />
              <div className="flex items-center gap-3">
                <Avatar user={u} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{u.name}</div>
                  <div className="truncate text-xs text-mute">{[u.email, u.phone, `đăng ký ${fmtDate(u.createdAt)}`].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
              <select name="levelId" aria-label="Nhóm trình" defaultValue={u.levelId ?? ""} className="input">{levelOptions}</select>
              <div className="flex gap-2">
                <button name="decision" value="approve" className="btn btn-primary flex-1">✓ Duyệt</button>
                <button name="decision" value="reject" className="btn btn-danger flex-1">✕ Từ chối</button>
              </div>
            </form>
          ))}
          {pending.length === 0 && <p className="card text-center text-sm text-mute">Không có yêu cầu nào.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Tất cả tài khoản ({others.length})</h2>
        <div className="card divide-y divide-line p-0">
          {others.map((u) => (
            <Link key={u.id} href={`/admin/thanh-vien/${u.id}`} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar user={u} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{u.name}</span>
                <span className="block truncate text-xs text-mute">
                  {[u.level?.name ?? "Chưa xếp nhóm", u.email ?? u.phone, !u.googleSub && !u.passwordHash ? "chưa có đăng nhập" : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {u.role !== "MEMBER" && <span className="chip chip-gold">{ROLE_LABEL[u.role]}</span>}
              {u.status !== "ACTIVE" && <span className="chip chip-red">{STATUS_LABEL[u.status]}</span>}
              <span aria-hidden className="text-mute">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Tạo hồ sơ hộ thành viên</h2>
        <div className="card">
          <p className="mb-3 text-xs text-mute">
            Dùng cho người chưa tự đăng ký. Nếu nhập Gmail hoặc SĐT, sau này họ đăng nhập bằng đúng Gmail/SĐT đó sẽ nhận lại hồ sơ này.
          </p>
          <ActionForm action={saveMember} submit="Tạo hồ sơ">
            <input name="name" required placeholder="Họ và tên" className="input" />
            <input name="nickname" placeholder="Biệt danh (không bắt buộc)" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <select name="gender" required defaultValue="" className="input" aria-label="Giới tính">
                <option value="" disabled>Giới tính</option><option value="M">Nam</option><option value="F">Nữ</option>
              </select>
              <select name="levelId" defaultValue="" className="input" aria-label="Nhóm trình">{levelOptions}</select>
            </div>
            <input name="phone" type="tel" placeholder="SĐT (không bắt buộc)" className="input" />
            <input name="email" type="email" placeholder="Gmail (không bắt buộc)" className="input" />
          </ActionForm>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Nhóm trình độ</h2>
        <div className="card space-y-3">
          <div className="grid grid-cols-[1fr_84px_auto] gap-2 text-xs font-semibold text-mute"><span>Tên nhóm</span><span>Điểm khởi đầu</span><span className="w-12" /></div>
          {levels.map((l) => (
            <form key={l.id} action={saveLevel} className="grid grid-cols-[1fr_84px_auto] gap-2">
              <input type="hidden" name="id" value={l.id} />
              <input name="name" aria-label="Tên nhóm" defaultValue={l.name} required className="input" />
              <input name="baseRating" aria-label="Điểm khởi đầu" defaultValue={l.baseRating} inputMode="decimal" required className="input num text-center" />
              <SubmitButton className="btn w-12 px-0">Lưu</SubmitButton>
            </form>
          ))}
          <p className="text-xs text-mute">Điểm khởi đầu (2.0–8.0) là điểm trình của thành viên trong nhóm khi chưa có trận nào.</p>
        </div>
      </section>

      <section className="card">
        <h2 className="font-bold">Tính lại điểm trình</h2>
        <p className="mb-3 mt-1 text-sm text-soft">Chạy lại toàn bộ các trận đã xác nhận theo thứ tự thời gian. Dùng sau khi đổi điểm khởi đầu của nhóm.</p>
        <form action={recomputeRatings}><SubmitButton className="btn w-full" confirm="Tính lại toàn bộ điểm trình?">Tính lại toàn bộ</SubmitButton></form>
      </section>
    </>
  );
}
