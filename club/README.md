# CLB Pickleball BT Splendora — Webapp

Webapp quản lý CLB: thành viên, nhóm trình, điểm trình kiểu DUPR, bảng phong thần,
nhật ký trận đấu và sổ độ (bia, dừa, lẩu…).

Công nghệ: Next.js + SQLite (Prisma). Chạy trên 1 VPS bằng Docker, dữ liệu nằm trong 1 file `data/club.db`.

## Tính năng (Giai đoạn 1)

- **Đăng nhập** bằng Google hoặc SĐT + mật khẩu. Tài khoản mới ở trạng thái *chờ duyệt* tới khi admin phê chuẩn.
- **Vai trò**: Quản trị · Trưởng nhóm (ghi trận hộ, xác nhận trận, đánh dấu độ đã trả) · Thành viên.
- **Hồ sơ**: ảnh Google, biệt danh, giới tính, tay thuận, ngày gia nhập, SĐT (ẩn được).
- **Nhóm trình**: 4 nhóm (đổi tên và điểm khởi đầu trong trang Quản trị), có lịch sử lên/xuống nhóm.
- **Nhật ký trận**: thành viên ghi trận mình tham gia → người ở đội đối thủ xác nhận → mới tính điểm.
- **Bảng phong thần**: Đôi tổng hợp, Đơn, Đôi nam, Đôi nữ, Đôi nam nữ; lọc theo tháng/quý/năm và nhóm trình.
- **Sổ độ**: gắn kèo vào trận, đội thua nợ đội thắng; bảng tổng hợp ai nợ/ai nhận; đánh dấu đã trả.
- Admin **tạo hồ sơ hộ** người chưa đăng ký; họ đăng nhập sau bằng đúng Gmail/SĐT đó sẽ nhận lại hồ sơ.

### Cách tính điểm trình

DUPR không công bố công thức, nên app dùng mô hình cùng nguyên lý (`lib/rating.ts`), thang 2.000–8.000:

- Trình của đội = trung bình 2 người. Từ chênh lệch trình suy ra kết quả kỳ vọng (xác suất thắng và tỷ lệ điểm).
- Điểm cộng/trừ = thực tế − kỳ vọng. Thắng đội mạnh hơn, hoặc thắng cách biệt hơn dự đoán thì lên nhiều.
- 5 trận đầu biến động ×2, tới trận 15 là ×1.5, để người mới sớm về đúng trình.
- Quy ước CLB: đội thắng không bị trừ điểm (đổi `WINNER_NEVER_LOSES` thành `false` nếu muốn giống DUPR hơn).
- Trận đôi tính vào bảng **Đôi tổng hợp** và bảng theo giới tính (nam/nữ/nam nữ) nếu khớp. Trận có độ tính như trận thường.

## Triển khai lên VPS

1. Tạo OAuth Client trong [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (loại *Web application*), thêm *Authorized redirect URI*: `https://TEN-MIEN/api/auth/google/callback`.
2. Trên VPS, trong thư mục `club/`, tạo file `.env.production`:

   ```
   APP_URL=https://TEN-MIEN
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ADMIN_EMAILS=gmail-cua-admin@gmail.com
   ADMIN_PHONES=
   ```

   Tài khoản có email/SĐT trong `ADMIN_EMAILS`/`ADMIN_PHONES` tự thành admin ở lần đăng ký đầu tiên.
3. Chạy:

   ```bash
   docker compose up -d --build
   ```

4. Trỏ reverse proxy (Caddy/Nginx, có HTTPS) của tên miền về `127.0.0.1:3000`. Ví dụ Caddyfile:

   ```
   TEN-MIEN {
     reverse_proxy 127.0.0.1:3000
   }
   ```

**Sao lưu**: chép file `data/club.db` (nên đặt cron hằng ngày).

## Chạy thử trên máy

```bash
cp .env.example .env   # điền ADMIN_PHONES=SĐT của bạn để thành admin
npm install
npx prisma migrate deploy && node prisma/seed.mjs
npm run dev
```
