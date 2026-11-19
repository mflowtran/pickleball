import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { logout, updateProfile } from "@/lib/actions";
import { getUser } from "@/lib/auth";
import { CLUB_NAME } from "@/lib/constants";

export default async function PendingPage() {
  const u = await getUser();
  if (!u) redirect("/dang-nhap");
  if (u.status === "ACTIVE") redirect("/");
  const pending = u.status === "PENDING";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="text-center">
        <div className="text-5xl" aria-hidden>{pending ? "⏳" : "🚫"}</div>
        <h1 className="mt-3 text-xl font-bold text-brand">
          {pending ? "Đang chờ phê duyệt" : u.status === "DISABLED" ? "Tài khoản đã bị khoá" : "Yêu cầu chưa được chấp nhận"}
        </h1>
        <p className="mt-2 text-sm text-soft">
          {pending
            ? `Chào ${u.name}! Quản trị ${CLUB_NAME} sẽ duyệt tài khoản của bạn. Hãy nhắn vào nhóm Zalo để được duyệt nhanh hơn.`
            : "Vui lòng liên hệ quản trị CLB qua nhóm Zalo."}
        </p>
      </div>
      {pending && (
        <div className="card mt-6">
          <p className="mb-3 text-sm font-semibold">Hoàn thiện hồ sơ trong lúc chờ</p>
          <ActionForm action={updateProfile} submit="Lưu hồ sơ">
            <input name="name" required defaultValue={u.name} placeholder="Họ và tên" className="input" />
            <input name="nickname" defaultValue={u.nickname ?? ""} placeholder="Biệt danh (không bắt buộc)" className="input" />
            <select name="gender" required defaultValue={u.gender ?? ""} className="input">
              <option value="" disabled>Giới tính</option>
              <option value="M">Nam</option>
              <option value="F">Nữ</option>
            </select>
            {!u.passwordHash && <input name="phone" type="tel" defaultValue={u.phone ?? ""} placeholder="Số điện thoại / Zalo" className="input" />}
          </ActionForm>
        </div>
      )}
      <form action={logout} className="mt-4 text-center">
        <button className="text-sm text-mute underline">Đăng xuất</button>
      </form>
    </main>
  );
}
