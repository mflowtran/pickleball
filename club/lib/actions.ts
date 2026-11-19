"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapRole, createSession, destroySession, getUser, hashPassword, isStaff, requireAdmin, requireUser, verifyPassword } from "./auth";
import { fromLocalInput, normalizePhone } from "./constants";
import { db } from "./db";
import { applyMatch, categorize, parseSets, recomputeAll, winnerOf } from "./rating";

export type State = { error?: string; ok?: string } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;

// ───────── Đăng nhập / đăng ký ─────────

export async function loginPhone(_: State, fd: FormData): Promise<State> {
  const phone = normalizePhone(str(fd, "phone"));
  const password = str(fd, "password");
  if (!phone) return { error: "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)." };
  const u = await db.user.findUnique({ where: { phone } });
  if (!u?.passwordHash || !verifyPassword(password, u.passwordHash)) return { error: "Sai số điện thoại hoặc mật khẩu." };
  await createSession(u.id);
  redirect("/");
}

export async function registerPhone(_: State, fd: FormData): Promise<State> {
  const name = str(fd, "name");
  const phone = normalizePhone(str(fd, "phone"));
  const password = str(fd, "password");
  const gender = str(fd, "gender");
  if (name.length < 2) return { error: "Vui lòng nhập họ tên." };
  if (!phone) return { error: "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)." };
  if (password.length < 6) return { error: "Mật khẩu tối thiểu 6 ký tự." };
  if (gender !== "M" && gender !== "F") return { error: "Vui lòng chọn giới tính." };

  const existing = await db.user.findUnique({ where: { phone } });
  let userId: string;
  if (existing) {
    if (existing.passwordHash) return { error: "Số điện thoại này đã đăng ký. Hãy đăng nhập." };
    // Hồ sơ do admin tạo sẵn: nhận lại hồ sơ, nhưng phải được admin duyệt lại.
    const boot = bootstrapRole(null, phone);
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash: hashPassword(password), status: "PENDING", ...boot },
    });
    userId = existing.id;
  } else {
    const u = await db.user.create({
      data: { name, phone, gender, passwordHash: hashPassword(password), ...bootstrapRole(null, phone) },
    });
    userId = u.id;
  }
  await createSession(userId);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/dang-nhap");
}

// ───────── Hồ sơ cá nhân ─────────

export async function updateProfile(_: State, fd: FormData): Promise<State> {
  const me = await getUser();
  if (!me) return { error: "Chưa đăng nhập." };
  const name = str(fd, "name");
  if (name.length < 2) return { error: "Vui lòng nhập họ tên." };
  const gender = str(fd, "gender");
  const hand = str(fd, "hand");
  const rawPhone = str(fd, "phone");
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) return { error: "Số điện thoại không hợp lệ." };
  if (phone && phone !== me.phone) {
    if (me.passwordHash) return { error: "Tài khoản đăng nhập bằng SĐT không tự đổi số được, hãy nhờ admin." };
    if (await db.user.findUnique({ where: { phone } })) return { error: "Số điện thoại đã được dùng." };
  }
  await db.user.update({
    where: { id: me.id },
    data: {
      name,
      nickname: opt(fd, "nickname"),
      gender: gender === "M" || gender === "F" ? gender : me.gender,
      hand: hand === "R" || hand === "L" ? hand : null,
      phone: phone ?? (me.passwordHash ? me.phone : null),
      hidePhone: fd.get("hidePhone") === "on",
      bio: opt(fd, "bio"),
    },
  });
  revalidatePath("/", "layout");
  return { ok: "Đã lưu hồ sơ." };
}

// ───────── Trận đấu ─────────

export async function createMatch(_: State, fd: FormData): Promise<State> {
  const me = await requireUser();
  const kind = str(fd, "kind") === "SINGLES" ? "SINGLES" : "DOUBLES";
  const t1 = [str(fd, "t1a"), kind === "DOUBLES" ? str(fd, "t1b") : ""].filter(Boolean);
  const t2 = [str(fd, "t2a"), kind === "DOUBLES" ? str(fd, "t2b") : ""].filter(Boolean);
  const need = kind === "SINGLES" ? 1 : 2;
  if (t1.length !== need || t2.length !== need) return { error: "Vui lòng chọn đủ người chơi." };
  const ids = [...t1, ...t2];
  if (new Set(ids).size !== ids.length) return { error: "Một người không thể xuất hiện 2 lần trong trận." };

  const users = await db.user.findMany({ where: { id: { in: ids }, status: "ACTIVE" } });
  if (users.length !== ids.length) return { error: "Có người chơi không hợp lệ." };
  const staff = isStaff(me);
  if (!staff && !ids.includes(me.id)) return { error: "Bạn chỉ được ghi trận mà mình tham gia." };

  const sets = parseSets(str(fd, "sets")).filter((s) => Array.isArray(s) && s.length === 2);
  if (sets.length < 1 || sets.length > 5) return { error: "Vui lòng nhập tỷ số (1–5 set)." };
  for (const [a, b] of sets) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 99 || b > 99) return { error: "Tỷ số không hợp lệ." };
    if (a === b) return { error: "Một set không thể hoà." };
  }
  const winnerTeam = winnerOf(sets);
  if (!winnerTeam) return { error: "Số set thắng đang hoà, chưa xác định được đội thắng." };

  const playedAt = fromLocalInput(str(fd, "playedAt")) ?? new Date();
  if (playedAt.getTime() > Date.now() + 3600_000) return { error: "Thời gian trận đấu không thể ở tương lai." };

  const stakeItem = opt(fd, "stakeItem");
  const stakeQty = stakeItem ? Number(str(fd, "stakeQty") || "1") : null;
  if (stakeItem && (!stakeQty || !(stakeQty > 0) || stakeQty > 1000)) return { error: "Số lượng độ không hợp lệ." };

  const g = (id: string) => users.find((u) => u.id === id)!.gender;
  const category = categorize(kind, t1.map(g), t2.map(g));

  const match = await db.$transaction(async (tx) => {
    const m = await tx.match.create({
      data: {
        kind, category, playedAt, sets: JSON.stringify(sets), winnerTeam,
        note: opt(fd, "note"),
        createdById: me.id,
        status: staff ? "CONFIRMED" : "PENDING",
        confirmedById: staff ? me.id : null,
        confirmedAt: staff ? new Date() : null,
        stakeItem, stakeQty, stakeNote: stakeItem ? opt(fd, "stakeNote") : null,
        players: { create: [...t1.map((userId) => ({ userId, team: 1 })), ...t2.map((userId) => ({ userId, team: 2 }))] },
      },
    });
    if (staff) await applyMatch(tx, m.id);
    return m;
  });
  // Trận ghi lùi ngày về trước các trận đã tính điểm → tính lại để đúng thứ tự thời gian.
  if (staff) await recomputeIfBackdated(match.id);
  revalidatePath("/", "layout");
  redirect(`/tran-dau/${match.id}`);
}

async function recomputeIfBackdated(matchId: string) {
  const m = await db.match.findUniqueOrThrow({ where: { id: matchId } });
  const later = await db.match.count({ where: { status: "CONFIRMED", playedAt: { gt: m.playedAt }, id: { not: m.id } } });
  if (later > 0) await recomputeAll();
}

async function loadMatch(fd: FormData) {
  const me = await requireUser();
  const m = await db.match.findUnique({ where: { id: str(fd, "id") }, include: { players: true } });
  if (!m) throw new Error("Không tìm thấy trận đấu.");
  const mine = m.players.find((p) => p.userId === me.id);
  const creator = m.players.find((p) => p.userId === m.createdById);
  // Người được quyền xác nhận: người chơi ở đội đối diện với người ghi trận, hoặc admin/trưởng nhóm.
  const canConfirm = isStaff(me) || (!!mine && !!creator && mine.team !== creator.team);
  return { me, m, mine, canConfirm };
}

export async function confirmMatch(fd: FormData) {
  const { me, m, canConfirm } = await loadMatch(fd);
  if (!canConfirm || m.status !== "PENDING") return;
  await db.$transaction(async (tx) => {
    const r = await tx.match.updateMany({
      where: { id: m.id, status: "PENDING" },
      data: { status: "CONFIRMED", confirmedById: me.id, confirmedAt: new Date() },
    });
    if (r.count === 1) await applyMatch(tx, m.id);
  });
  await recomputeIfBackdated(m.id);
  revalidatePath("/", "layout");
}

export async function rejectMatch(fd: FormData) {
  const { me, m, canConfirm } = await loadMatch(fd);
  if (!canConfirm || m.status !== "PENDING") return;
  await db.match.update({ where: { id: m.id }, data: { status: "REJECTED", confirmedById: me.id, confirmedAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function deleteMatch(fd: FormData) {
  const { me, m } = await loadMatch(fd);
  const allowed = me.role === "ADMIN" || (m.createdById === me.id && m.status !== "CONFIRMED");
  if (!allowed) return;
  await db.match.delete({ where: { id: m.id } });
  if (m.status === "CONFIRMED") await recomputeAll();
  revalidatePath("/", "layout");
  redirect("/tran-dau");
}

export async function setStakePaid(fd: FormData) {
  const { me, m, mine } = await loadMatch(fd);
  if (m.status !== "CONFIRMED" || !m.stakeItem) return;
  // Người nhận độ (đội thắng) hoặc admin/trưởng nhóm mới được đánh dấu đã trả.
  if (!isStaff(me) && mine?.team !== m.winnerTeam) return;
  const paid = str(fd, "paid") === "1";
  await db.match.update({ where: { id: m.id }, data: { stakePaid: paid, stakePaidAt: paid ? new Date() : null } });
  revalidatePath("/", "layout");
}

// ───────── Quản trị ─────────

async function changeLevel(userId: string, toLevelId: number | null, byId: string, note?: string | null) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.levelId === toLevelId) return;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { levelId: toLevelId } }),
    db.levelChange.create({ data: { userId, fromLevelId: u.levelId, toLevelId, changedById: byId, note: note ?? null } }),
  ]);
}

export async function approveUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const levelId = Number(str(fd, "levelId")) || null;
  if (str(fd, "decision") === "reject") {
    await db.user.update({ where: { id }, data: { status: "REJECTED" } });
  } else {
    await changeLevel(id, levelId, admin.id, "Xếp nhóm khi duyệt");
    await db.user.update({ where: { id }, data: { status: "ACTIVE" } });
  }
  revalidatePath("/", "layout");
}

export async function saveMember(_: State, fd: FormData): Promise<State> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (name.length < 2) return { error: "Vui lòng nhập họ tên." };
  const gender = str(fd, "gender");
  if (gender !== "M" && gender !== "F") return { error: "Vui lòng chọn giới tính." };
  const rawPhone = str(fd, "phone");
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) return { error: "Số điện thoại không hợp lệ." };
  const email = opt(fd, "email")?.toLowerCase() ?? null;
  const levelId = Number(str(fd, "levelId")) || null;
  const role = ["ADMIN", "LEADER", "MEMBER"].includes(str(fd, "role")) ? str(fd, "role") : "MEMBER";
  const status = ["ACTIVE", "PENDING", "REJECTED", "DISABLED"].includes(str(fd, "status")) ? str(fd, "status") : "ACTIVE";

  const dup = await db.user.findFirst({
    where: { id: id ? { not: id } : undefined, OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
  });
  if ((phone || email) && dup) return { error: "Số điện thoại hoặc email đã thuộc về thành viên khác." };

  const data = { name, nickname: opt(fd, "nickname"), gender, phone, email };
  if (id) {
    if (id === admin.id && (role !== "ADMIN" || status !== "ACTIVE")) return { error: "Không thể tự hạ quyền hoặc khoá chính mình." };
    const password = str(fd, "password");
    if (password && password.length < 6) return { error: "Mật khẩu tối thiểu 6 ký tự." };
    await db.user.update({
      where: { id },
      data: { ...data, role, status, ...(password ? { passwordHash: hashPassword(password) } : {}) },
    });
    if (status !== "ACTIVE") await db.session.deleteMany({ where: { userId: id } });
    await changeLevel(id, levelId, admin.id, opt(fd, "levelNote"));
    revalidatePath("/", "layout");
    return { ok: "Đã lưu." };
  }
  const u = await db.user.create({ data: { ...data, role, status: "ACTIVE" } });
  await changeLevel(u.id, levelId, admin.id, "Xếp nhóm khi tạo hồ sơ");
  revalidatePath("/", "layout");
  return { ok: `Đã tạo hồ sơ ${name}.` };
}

export async function saveLevel(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  const name = str(fd, "name");
  const baseRating = Number(str(fd, "baseRating"));
  if (!id || !name || !(baseRating >= 2 && baseRating <= 8)) return;
  await db.level.update({ where: { id }, data: { name, baseRating } });
  revalidatePath("/", "layout");
}

export async function recomputeRatings() {
  await requireAdmin();
  await recomputeAll();
  revalidatePath("/", "layout");
}
