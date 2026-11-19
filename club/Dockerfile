FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
RUN DATABASE_URL="file:/tmp/build.db" npm run build
ENV DATABASE_URL="file:/data/club.db" PORT=3000
VOLUME /data
EXPOSE 3000
# Mỗi lần khởi động: cập nhật cấu trúc DB, tạo 4 nhóm trình mặc định, rồi chạy app.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.mjs && npx next start -p ${PORT}"]
