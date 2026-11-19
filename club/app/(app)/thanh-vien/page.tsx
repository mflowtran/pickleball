import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { fmtRating, ROLE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";

export default async function Members() {
  const [levels, users] = await Promise.all([
    db.level.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, include: { ratings: { where: { category: "DOUBLES" } } } }),
  ]);
  const groups = [...levels.map((l) => ({ ...l, members: users.filter((u) => u.levelId === l.id) })),
    { id: 0, name: "Chưa xếp nhóm", baseRating: 3, members: users.filter((u) => !u.levelId) }];
  return (
    <>
      <h1 className="text-xl font-bold">👥 Thành viên ({users.length})</h1>
      {groups.filter((g) => g.members.length > 0).map((g) => (
        <section key={g.id}>
          <h2 className="mb-2 flex items-baseline justify-between font-bold">
            {g.name} <span className="text-sm font-normal text-mute">{g.members.length} người</span>
          </h2>
          <div className="card divide-y divide-line p-0">
            {g.members.map((u) => (
              <Link key={u.id} href={`/thanh-vien/${u.id}`} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar user={u} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{u.name}</span>
                  <span className="block truncate text-xs text-mute">
                    {[u.nickname, u.gender === "M" ? "Nam" : u.gender === "F" ? "Nữ" : null, u.role !== "MEMBER" ? ROLE_LABEL[u.role] : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="num font-bold">{fmtRating(u.ratings[0]?.value ?? g.baseRating)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
