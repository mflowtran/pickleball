import { MatchForm } from "@/components/MatchForm";
import { isStaff, requireUser } from "@/lib/auth";
import { displayName, toLocalInput } from "@/lib/constants";
import { db } from "@/lib/db";

export default async function NewMatch() {
  const me = await requireUser();
  const users = await db.user.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, nickname: true } });
  return (
    <>
      <h1 className="text-xl font-bold">Ghi trận đấu</h1>
      <MatchForm
        players={users.map((u) => ({ id: u.id, label: displayName(u) + (u.id === me.id ? " — tôi" : "") }))}
        meId={me.id}
        staff={isStaff(me)}
        now={toLocalInput(new Date())}
      />
    </>
  );
}
