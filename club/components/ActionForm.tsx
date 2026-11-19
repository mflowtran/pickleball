"use client";

import { useActionState } from "react";
import type { State } from "@/lib/actions";

export function ActionForm({
  action, children, submit, className, btnClass = "btn btn-primary w-full",
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  btnClass?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className ?? "space-y-3"}>
      {children}
      {state?.error && <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-xl bg-green-soft px-3 py-2 text-sm text-brand">{state.ok}</p>}
      <button className={btnClass} disabled={pending}>{pending ? "Đang xử lý…" : submit}</button>
    </form>
  );
}
