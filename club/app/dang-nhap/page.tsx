import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { loginPhone, registerPhone } from "@/lib/actions";
import { getUser } from "@/lib/auth";
import { CLUB_NAME } from "@/lib/constants";

const ERRORS: Record<string, string> = {
  google: "Đăng nhập Google không thành công, vui lòng thử lại.",
  "google-chua-cau-hinh": "Đăng nhập Google chưa được cấu hình. Hãy dùng số điện thoại.",
  "bi-khoa": "Tài khoản đã bị khoá. Liên hệ quản trị CLB.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ loi?: string; dk?: string }> }) {
  if (await getUser()) redirect("/");
  const { loi, dk } = await searchParams;
  const register = dk === "1";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="text-5xl" aria-hidden>🏓</div>
        <h1 className="mt-3 text-2xl font-bold text-brand">{CLUB_NAME}</h1>
        <p className="mt-1 text-sm text-mute">Thành viên · Trình thi đấu · Bảng phong thần</p>
      </div>
      {loi && ERRORS[loi] && <p role="alert" className="mb-4 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{ERRORS[loi]}</p>}

      <a href="/api/auth/google" className="btn w-full">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.500-4.800 7.200l7.700 6c4.500-4.200 7-10.300 7-17.700z"/><path fill="#FBBC05" d="M10.600 28.600c-.5-1.400-.8-3-.8-4.600s.3-3.200.8-4.600l-8-6.200C.9 16.500 0 20.100 0 24s.9 7.500 2.600 10.800l8-6.200z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.700-6c-2.200 1.500-4.900 2.300-8.200 2.300-6.200 0-11.500-4.200-13.400-9.900l-8 6.200C6.500 42.600 14.600 48 24 48z"/></svg>
        Đăng nhập bằng Google
      </a>

      <div className="my-5 flex items-center gap-3 text-xs text-mute">
        <span className="h-px flex-1 bg-line" />
        hoặc bằng số điện thoại
        <span className="h-px flex-1 bg-line" />
      </div>

      {register ? (
        <ActionForm action={registerPhone} submit="Đăng ký">
          <input name="name" required placeholder="Họ và tên" autoComplete="name" className="input" />
          <input name="phone" required type="tel" inputMode="tel" placeholder="Số điện thoại" autoComplete="tel" className="input" />
          <select name="gender" required defaultValue="" className="input">
            <option value="" disabled>Giới tính</option>
            <option value="M">Nam</option>
            <option value="F">Nữ</option>
          </select>
          <input name="password" required type="password" minLength={6} placeholder="Mật khẩu (từ 6 ký tự)" autoComplete="new-password" className="input" />
        </ActionForm>
      ) : (
        <ActionForm action={loginPhone} submit="Đăng nhập">
          <input name="phone" required type="tel" inputMode="tel" placeholder="Số điện thoại" autoComplete="tel" className="input" />
          <input name="password" required type="password" placeholder="Mật khẩu" autoComplete="current-password" className="input" />
        </ActionForm>
      )}
      <p className="mt-4 text-center text-sm text-soft">
        {register ? (
          <>Đã có tài khoản? <a href="/dang-nhap" className="font-semibold text-brand underline">Đăng nhập</a></>
        ) : (
          <>Chưa có tài khoản? <a href="/dang-nhap?dk=1" className="font-semibold text-brand underline">Đăng ký bằng SĐT</a></>
        )}
      </p>
      <p className="mt-6 text-center text-xs text-mute">Tài khoản mới cần được quản trị CLB phê duyệt trước khi sử dụng.</p>
    </main>
  );
}
