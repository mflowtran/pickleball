"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Trang chủ", icon: "🏠" },
  { href: "/bang-phong-than", label: "Phong thần", icon: "🏆" },
  { href: "/tran-dau", label: "Trận đấu", icon: "🏓" },
  { href: "/so-do", label: "Sổ độ", icon: "🍺" },
  { href: "/thanh-vien", label: "Thành viên", icon: "👥" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {ITEMS.map((it) => {
          const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${on ? "text-brand" : "text-mute"}`}
              >
                <span className={`text-xl leading-none ${on ? "" : "opacity-60 grayscale"}`} aria-hidden>{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
