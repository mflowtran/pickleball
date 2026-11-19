export function Avatar({ user, size = 40 }: { user: { name: string; avatarUrl?: string | null }; size?: number }) {
  const initials = user.name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white">
      {initials}
    </span>
  );
}
