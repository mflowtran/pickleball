import type { Metadata, Viewport } from "next";
import { CLUB_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: CLUB_NAME,
  description: "Thành viên, trình thi đấu, bảng phong thần và nhật ký trận đấu.",
};

export const viewport: Viewport = { themeColor: "#1f3d2c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
