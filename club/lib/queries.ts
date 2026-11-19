import type { Prisma } from "@prisma/client";
import { periodStart } from "./constants";
import { db } from "./db";

export const matchInclude = {
  players: { include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } } },
} satisfies Prisma.MatchInclude;

export type MatchWithPlayers = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

export type BoardRow = {
  user: { id: string; name: string; nickname: string | null; avatarUrl: string | null; level: { name: string } | null };
  rating: number;
  matches: number;
  wins: number;
  delta: number | null;
};

/** Bảng phong thần. Toàn thời gian: xếp theo điểm trình. Theo kỳ: xếp theo điểm tăng trong kỳ. */
export async function leaderboard(category: string, period: string, levelId?: number): Promise<BoardRow[]> {
  const ratings = await db.rating.findMany({
    where: { category, user: { status: "ACTIVE", ...(levelId ? { levelId } : {}) } },
    include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true, level: { select: { name: true } } } } },
    orderBy: [{ value: "desc" }, { matches: "desc" }],
  });
  const start = periodStart(period);
  if (!start) return ratings.map((r) => ({ user: r.user, rating: r.value, matches: r.matches, wins: r.wins, delta: null }));

  const where = { category, playedAt: { gte: start } };
  const [all, won] = await Promise.all([
    db.ratingChange.groupBy({ by: ["userId"], where, _sum: { delta: true }, _count: { _all: true } }),
    db.ratingChange.groupBy({ by: ["userId"], where: { ...where, won: true }, _count: { _all: true } }),
  ]);
  const wins = new Map(won.map((w) => [w.userId, w._count._all]));
  const agg = new Map(all.map((a) => [a.userId, a]));
  return ratings
    .filter((r) => agg.has(r.userId))
    .map((r) => {
      const a = agg.get(r.userId)!;
      return { user: r.user, rating: r.value, matches: a._count._all, wins: wins.get(r.userId) ?? 0, delta: a._sum.delta ?? 0 };
    })
    .sort((x, y) => (y.delta ?? 0) - (x.delta ?? 0) || y.wins - x.wins);
}
