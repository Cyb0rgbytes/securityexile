import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-bg-deep/70 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="hanko h-11 text-xl">
            影
          </span>
          <div>
            <p className="font-display text-sm font-semibold tracking-wide text-fg">Security Exile</p>
            <p className="mt-0.5 text-sm text-fg-muted">Hack the planet, responsibly.</p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-fg-muted">
          <li>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-green-bright">
              Discord
            </a>
          </li>
          <li>
            <Link href="/security" className="hover:text-green-bright">
              Responsible disclosure
            </Link>
          </li>
          <li>
            <a href="/.well-known/security.txt" className="hover:text-green-bright">
              security.txt
            </a>
          </li>
          <li>© {new Date().getFullYear()} Security Exile</li>
        </ul>
      </div>
    </footer>
  );
}
