import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 font-mono text-xs text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="text-green">$</span> echo &quot;hack the planet, responsibly&quot;
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href="/security" className="hover:text-green-bright">
              responsible-disclosure
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
