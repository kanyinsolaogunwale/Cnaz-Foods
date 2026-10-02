"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { CartIcon, CloseIcon, MenuIcon } from "@/components/icons";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes the overlay menu and returns focus to the toggle button.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const cartLabel =
    count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart";

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-cream-50/90 backdrop-blur">
      <div className="container-page relative z-40 flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg"
          aria-label="Cnaz Foods — home"
        >
          <Image
            src="/images/logo-cn.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-lg"
          />
          <span className="hidden font-display text-lg font-semibold tracking-tight sm:block">
            Cnaz Foods
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={`rounded-lg px-3.5 py-2 text-[15px] font-medium transition-colors ${
                isActive(pathname, link.href)
                  ? "bg-brand-100 text-brand-800"
                  : "text-ink-700 hover:bg-ink-100 hover:text-ink-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {loading ? (
            <span aria-hidden="true" className="h-9 w-9 animate-pulse rounded-full bg-ink-100" />
          ) : user ? (
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full p-1 pr-1.5 hover:bg-ink-100"
              aria-label="Your account"
            >
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-ink-200"
                  unoptimized
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {(user.user_metadata?.full_name ?? user.email ?? "C")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
              <span className="hidden text-sm font-medium text-ink-800 lg:block">Account</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-[15px] font-medium text-ink-700 hover:bg-ink-100 hover:text-ink-900 sm:block"
            >
              Sign in
            </Link>
          )}

          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium text-ink-800 hover:bg-ink-100"
            aria-label={cartLabel}
          >
            <CartIcon />
            <span className="hidden sm:block">Cart</span>
            {count > 0 && (
              <span
                aria-hidden="true"
                className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink-800 hover:bg-ink-100 md:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/*
        Mobile menu: an overlay, not an in-flow block — it floats above the
        page so opening it never pushes content down. A dimmed backdrop closes
        it on tap; Escape also closes it (see the keydown effect above).
      */}
      {menuOpen && (
        <div id="mobile-menu" className="md:hidden">
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 animate-fade-in bg-ink-950/40"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            aria-label="Mobile"
            className="absolute inset-x-0 top-full z-40 border-b border-ink-200/80 bg-cream-50 shadow-lift animate-fade-in"
          >
            <div className="container-page flex flex-col gap-1 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-3 text-[15px] font-medium ${
                    isActive(pathname, link.href)
                      ? "bg-brand-100 text-brand-800"
                      : "text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={user ? "/account" : "/login"}
                className="rounded-lg px-3 py-3 text-[15px] font-medium text-ink-700 hover:bg-ink-100"
              >
                {user ? "Your account" : "Sign in"}
              </Link>
              <Link
                href="/cart"
                className="flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium text-ink-700 hover:bg-ink-100"
              >
                Cart
                {count > 0 ? (
                  <span
                    aria-hidden="true"
                    className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
