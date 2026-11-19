export const CLUB_NAME = "CLB Pickleball BT Splendora";

export const CATEGORIES = ["DOUBLES", "SINGLES", "MD", "WD", "XD"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<string, string> = {
  DOUBLES: "Đôi (tổng hợp)",
  SINGLES: "Đơn",
  MD: "Đôi nam",
  WD: "Đôi nữ",
  XD: "Đôi nam nữ",
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị",
  LEADER: "Trưởng nhóm",
  MEMBER: "Thành viên",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  ACTIVE: "Hoạt động",
  REJECTED: "Từ chối",
  DISABLED: "Đã khoá",
};

export const MATCH_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  REJECTED: "Bị từ chối",
};

export const STAKE_PRESETS = ["bia", "dừa", "nồi lẩu", "chai nước", "ly cà phê"];

export const PERIODS = [
  { key: "all", label: "Tất cả" },
  { key: "month", label: "Tháng này" },
  { key: "quarter", label: "Quý này" },
  { key: "year", label: "Năm nay" },
] as const;

const TZ = "Asia/Ho_Chi_Minh";
const TZ_OFFSET_MS = 7 * 3600 * 1000;

/** Mốc bắt đầu kỳ (theo giờ Việt Nam), trả về null nếu "all". */
export function periodStart(period: string, now = new Date()): Date | null {
  const vn = new Date(now.getTime() + TZ_OFFSET_MS);
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  let start: number;
  if (period === "month") start = Date.UTC(y, m, 1);
  else if (period === "quarter") start = Date.UTC(y, m - (m % 3), 1);
  else if (period === "year") start = Date.UTC(y, 0, 1);
  else return null;
  return new Date(start - TZ_OFFSET_MS);
}

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

/** Giá trị cho <input type="datetime-local"> theo giờ Việt Nam. */
export function toLocalInput(d: Date) {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 16);
}

/** Đọc giá trị datetime-local (giờ Việt Nam) thành Date. */
export function fromLocalInput(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return null;
  const d = new Date(s.slice(0, 16) + ":00.000Z");
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - TZ_OFFSET_MS);
}

export function fmtRating(v: number) {
  return v.toFixed(3);
}

export function fmtQty(q: number | null | undefined) {
  if (q == null) return "";
  return Number.isInteger(q) ? String(q) : String(q);
}

export function displayName(u: { name: string; nickname?: string | null }) {
  return u.nickname ? `${u.name} (${u.nickname})` : u.name;
}

export function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length >= 11) p = "0" + p.slice(2);
  return /^0\d{9}$/.test(p) ? p : null;
}
