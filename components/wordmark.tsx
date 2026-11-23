import Link from "next/link";

export function Wordmark({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center bg-accent">
        <span className="bracket text-[13px] leading-none text-white" aria-hidden="true">
          {"</>"}
        </span>
        <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 bg-signal" aria-hidden="true" />
      </span>
      <span className="leading-none">
        <span className="block text-[16px] font-extrabold tracking-[-0.045em] text-ink">Aeris</span>
        <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-ink-muted">
          Intelligence
        </span>
      </span>
    </Link>
  );
}
