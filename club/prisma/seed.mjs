// Tạo 4 nhóm trình mặc định (chạy nhiều lần không sao).
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const levels = [
  { id: 1, name: "Nhóm 1 (cao nhất)", sortOrder: 1, baseRating: 4.0 },
  { id: 2, name: "Nhóm 2", sortOrder: 2, baseRating: 3.5 },
  { id: 3, name: "Nhóm 3", sortOrder: 3, baseRating: 3.0 },
  { id: 4, name: "Nhóm 4", sortOrder: 4, baseRating: 2.5 },
];
for (const l of levels) await db.level.upsert({ where: { id: l.id }, create: l, update: {} });
await db.$disconnect();
