import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { logout, updateProfile } from "@/lib/actions";
import { requireUser } from "@/lib/auth";

export default async function Profile() {
  const u = await requireUser();
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Hồ sơ của tôi</h1>
        <Link href={`/thanh-vien/${u.id}`} className="text-sm font-semibold text-brand">Xem trang cá nhân ›</Link>
      </div>
      <div className="card">
        <ActionForm action={updateProfile} submit="Lưu hồ sơ">
          <label className="block"><span className="label">Họ và tên</span><input name="name" required defaultValue={u.name} className="input" /></label>
          <label className="block"><span className="label">Biệt danh</span><input name="nickname" defaultValue={u.nickname ?? ""} maxLength={30} className="input" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Giới tính</span>
              <select name="gender" defaultValue={u.gender ?? ""} required className="input">
                <option value="" disabled>Chọn</option><option value="M">Nam</option><option value="F">Nữ</option>
              </select>
            </label>
            <label className="block"><span className="label">Tay thuận</span>
              <select name="hand" defaultValue={u.hand ?? ""} className="input">
                <option value="">—</option><option value="R">Phải</option><option value="L">Trái</option>
              </select>
            </label>
          </div>
          <label className="block"><span className="label">SĐT / Zalo</span>
            <input name="phone" type="tel" defaultValue={u.phone ?? ""} readOnly={!!u.passwordHash} className="input read-only:bg-bg" />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="hidePhone" defaultChecked={u.hidePhone} className="size-5 accent-[var(--color-brand)]" />
            Ẩn số điện thoại với thành viên khác
          </label>
          <label className="block"><span className="label">Giới thiệu</span><textarea name="bio" defaultValue={u.bio ?? ""} maxLength={300} rows={3} className="input" /></label>
        </ActionForm>
      </div>
      <p className="text-center text-xs text-mute">Giới tính dùng để xếp trận vào bảng đôi nam / đôi nữ / đôi nam nữ. Nhóm trình do quản trị CLB sắp xếp.</p>
      <form action={logout}><button className="btn btn-danger w-full">Đăng xuất</button></form>
    </>
  );
}
