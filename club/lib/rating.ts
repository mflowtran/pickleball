/**
 * Điểm trình kiểu DUPR (thang 2.000 – 8.000).
 *
 * DUPR không công bố công thức, nên đây là mô hình cùng nguyên lý:
 *  - So sánh trình trung bình 2 đội để ra kết quả KỲ VỌNG (xác suất thắng + tỷ lệ điểm).
 *  - Điểm tăng/giảm theo chênh lệch giữa THỰC TẾ và kỳ vọng: thắng đội mạnh hơn hoặc
 *    thắng cách biệt hơn dự đoán thì lên nhiều; thắng sít sao đội yếu hơn thì gần như không lên.
 *  - Người mới (ít trận) biến động nhanh hơn để sớm về đúng trình.
 */
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const RATING_MIN = 2;
export const RATING_MAX = 8;
export const DEFAULT_RATING = 3;

const K = 0.2; // biên độ cơ bản mỗi trận
const WIN_SCALE = 0.75; // chênh 0.75 trình ≈ 91% thắng
const POINT_SCALE = 1.5; // chênh 0.5 trình ≈ 11–5
const WINNER_NEVER_LOSES = true; // đặt false để giống DUPR hơn (thắng sít sao đội yếu vẫn có thể bị trừ)

type Tx = Prisma.TransactionClient;

export function parseSets(json: string): [number, number][] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function winnerOf(sets: [number, number][]): 0 | 1 | 2 {
  let a = 0, b = 0;
  for (const [x, y] of sets) {
    if (x > y) a++;
    else if (y > x) b++;
  }
  return a > b ? 1 : b > a ? 2 : 0;
}

function reliabilityFactor(matches: number) {
  if (matches < 5) return 2;
  if (matches < 15) return 1.5;
  return 1;
}

/** Mức thay đổi cơ bản cho đội 1 (đội 2 nhận giá trị đối xứng). */
export function baseDelta(team1: number, team2: number, sets: [number, number][], winnerTeam: number) {
  const diff = team1 - team2;
  const pWin = 1 / (1 + Math.pow(10, -diff / WIN_SCALE));
  const pShare = 1 / (1 + Math.pow(10, -diff / POINT_SCALE));
  let p1 = 0, p2 = 0;
  for (const [x, y] of sets) { p1 += x; p2 += y; }
  const share = p1 + p2 > 0 ? p1 / (p1 + p2) : 0.5;
  const won = winnerTeam === 1 ? 1 : 0;
  const d = K * (0.5 * (won - pWin) + (share - pShare));
  // Quy ước CLB: đội thắng không bao giờ bị trừ điểm, đội thua không bao giờ được cộng.
  if (WINNER_NEVER_LOSES) return winnerTeam === 1 ? Math.max(0, d) : Math.min(0, d);
  return d;
}

const clamp = (v: number) => Math.round(Math.min(RATING_MAX, Math.max(RATING_MIN, v)) * 1000) / 1000;

/** Phân loại trận theo giới tính người chơi. */
export function categorize(kind: string, team1: (string | null)[], team2: (string | null)[]) {
  if (kind === "SINGLES") return "SINGLES";
  const all = [...team1, ...team2];
  if (all.every((g) => g === "M")) return "MD";
  if (all.every((g) => g === "F")) return "WD";
  const mixed = (t: (string | null)[]) => t.includes("M") && t.includes("F");
  if (mixed(team1) && mixed(team2)) return "XD";
  return "DOUBLES";
}

/** Các bảng xếp hạng mà một trận được tính vào. */
export function ratedCategories(category: string) {
  if (category === "SINGLES") return ["SINGLES"];
  if (category === "DOUBLES") return ["DOUBLES"];
  return ["DOUBLES", category];
}

/** Áp kết quả 1 trận đã xác nhận vào điểm trình. */
export async function applyMatch(tx: Tx, matchId: string) {
  const m = await tx.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { players: { include: { user: { include: { level: true, ratings: true } } } } },
  });
  const sets = parseSets(m.sets);
  for (const category of ratedCategories(m.category)) {
    const cur = m.players.map((p) => {
      const r = p.user.ratings.find((x) => x.category === category);
      return {
        userId: p.userId,
        team: p.team,
        value: r?.value ?? p.user.level?.baseRating ?? DEFAULT_RATING,
        matches: r?.matches ?? 0,
        wins: r?.wins ?? 0,
      };
    });
    const avg = (team: number) => {
      const t = cur.filter((c) => c.team === team);
      return t.reduce((s, c) => s + c.value, 0) / (t.length || 1);
    };
    const d1 = baseDelta(avg(1), avg(2), sets, m.winnerTeam);
    for (const c of cur) {
      const won = c.team === m.winnerTeam;
      const after = clamp(c.value + (c.team === 1 ? d1 : -d1) * reliabilityFactor(c.matches));
      await tx.rating.upsert({
        where: { userId_category: { userId: c.userId, category } },
        create: { userId: c.userId, category, value: after, matches: 1, wins: won ? 1 : 0 },
        update: { value: after, matches: c.matches + 1, wins: c.wins + (won ? 1 : 0) },
      });
      await tx.ratingChange.create({
        data: {
          matchId: m.id, userId: c.userId, category, before: c.value, after,
          delta: Math.round((after - c.value) * 1000) / 1000, won, playedAt: m.playedAt,
        },
      });
    }
  }
}

/** Tính lại toàn bộ điểm trình từ đầu (sau khi xoá/sửa trận đã xác nhận). */
export async function recomputeAll() {
  await db.$transaction(
    async (tx) => {
      await tx.ratingChange.deleteMany();
      await tx.rating.deleteMany();
      const matches = await tx.match.findMany({
        where: { status: "CONFIRMED" },
        orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      for (const m of matches) await applyMatch(tx, m.id);
    },
    { timeout: 120_000 },
  );
}
