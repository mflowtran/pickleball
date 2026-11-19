import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { saveMember } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";

export default async function EditMember({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [u, levels] = await Promise.all([db.user.findUnique({ where: { id } }), db.level.findMany({ orderBy: { sortOrder: "asc" } })]);
  if (!u) notFound();
  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-brand">‹ Quản trị</Link>
      <h1 className="text-xl font-bold">{u.name}</h1>
      <p className="text-xs text-mute">
        Đăng nhập: {[u.googleSub ? "Google" : null, u.passwordHash ? "SĐT + mật khẩu" : null].filter(Boolean).join(", ") || "chưa có (hồ sơ tạo hộ)"}
      </p>
      <div className="card">
        <ActionForm action={saveMember} submit="Lưu thay đổi">
          <input type="hidden" name="id" value={u.id} />
          <label className="block"><span className="label">Họ và tên</span><input name="name" required defaultValue={u.name} className="input" /></label>
          <label className="block"><span className="label">Biệt danh</span><input name="nickname" defaultValue={u.nickname ?? ""} className="input" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Giới tính</span>
              <select name="gender" required defaultValue={u.gender ?? ""} className="input">
                <option value="" disabled>Chọn</option><option value="M">Nam</option><option value="F">Nữ</option>
              </select>
            </label>
            <label className="block"><span className="label">Nhóm trình</span>
              <select name="levelId" defaultValue={u.levelId ?? ""} className="input">
                <option value="">Chưa xếp nhóm</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block"><span className="label">Lý do đổi nhóm trình (nếu đổi)</span><input name="levelNote" maxLength={100} placeholder="VD: Lên trình sau giải tháng 11" className="input" /></label>
          <label className="block"><span className="label">SĐT</span><input name="phone" type="tel" defaultValue={u.phone ?? ""} className="input" /></label>
          <label className="block"><span className="label">Gmail</span><input name="email" type="email" defaultValue={u.email ?? ""} className="input" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Vai trò</span>
              <select name="role" defaultValue={u.role} className="input">
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Trạng thái</span>
              <select name="status" defaultValue={u.status} className="input">
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <label className="block"><span className="label">Đặt lại mật khẩu (bỏ trống nếu không đổi)</span>
            <input name="password" type="text" autoComplete="off" minLength={6} placeholder="Mật khẩu mới cho đăng nhập bằng SĐT" className="input" />
          </label>
        </ActionForm>
      </div>
      <p className="text-xs text-mute">Trưởng nhóm được ghi trận hộ, xác nhận trận và đánh dấu độ đã trả. Quản trị có thêm quyền duyệt thành viên, xếp nhóm trình và xoá trận.</p>
    </>
  );
}
