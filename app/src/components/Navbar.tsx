"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/src/components/ConnectWallet";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/create-policy", label: "Create Policy" },
  { href: "/admin", label: "Contracts" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/70">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Arvyon
          </Link>
          <div className="hidden gap-5 text-sm sm:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    active
                      ? "font-medium text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <ConnectWallet />
      </nav>
    </header>
  );
}
