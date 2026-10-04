"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { CartIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";
import { UserAvatar } from "@/components/user-avatar";

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Full-screen menu: Escape closes it, scroll locks while open, focus moves
  // to the close button on open and back to the menu toggle on close.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const cartLabel =
    count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart";

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-cream-50/90 backdrop-blur">
      <div className="container-page relative z-40 flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg"
          aria-label="Cnaz Foods home"
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

        {/* Search, inline on large screens (a second header row carries it on
            mobile and tablet — see below). Submits to the shop page. */}
        <form
          action="/shop"
          role="search"
          aria-label="Search products"
          className="hidden min-w-0 flex-1 justify-center px-2 lg:flex"
        >
          <div className="relative w-full max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              name="q"
              placeholder="Search snacks…"
              autoComplete="off"
              aria-label="Search products"
              className="input py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {loading ? (
            <span aria-hidden="true" className="h-9 w-9 animate-pulse rounded-full bg-ink-100" />
          ) : user ? (
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full p-1 pr-1.5 hover:bg-ink-100"
              aria-label="My account"
            >
              <span className="hidden text-sm font-medium text-ink-800 md:block">My account</span>
              <UserAvatar
                src={user.user_metadata?.avatar_url ?? null}
                name={(user.user_metadata?.full_name ?? user.email ?? "C") as string}
                className="h-8 w-8"
                textClassName="text-sm"
              />
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
            aria-label="Menu"
            className="grid h-10 w-10 place-items-center rounded-lg text-ink-800 hover:bg-ink-100 md:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Search for mobile and tablet: its own always-visible header row so
          nothing in the main row gets cramped or misaligned. */}
      <form
        action="/shop"
        role="search"
        aria-label="Search products"
        className="border-t border-ink-200/60 lg:hidden"
      >
        <div className="container-page py-2.5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              name="q"
              placeholder="Search snacks…"
              autoComplete="off"
              aria-label="Search products"
              className="input py-2.5 pl-10 pr-3 text-[15px]"
            />
          </div>
        </div>
      </form>

      </header>

      {/*
        Mobile menu: a full-screen takeover. It lives OUTSIDE the <header>
        because the header's backdrop-blur would otherwise become the containing
        block for position:fixed and clip the menu to the header's height. It
        covers the whole viewport, locks scroll while open, and Escape closes it.
      */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 flex flex-col bg-cream-50 animate-fade-in md:hidden"
        >
          <div className="container-page flex h-16 shrink-0 items-center justify-between border-b border-ink-200/80">
            <span className="flex items-center gap-2.5">
              <Image
                src="/images/logo-cn.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg"
              />
              <span className="font-display text-lg font-semibold tracking-tight">
                Cnaz Foods
              </span>
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
              }}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-lg text-ink-800 hover:bg-ink-100"
            >
              <CloseIcon />
            </button>
          </div>

          <nav aria-label="Mobile" className="container-page flex flex-1 flex-col gap-1.5 pt-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-4 font-display text-2xl font-semibold tracking-tight ${
                  isActive(pathname, link.href)
                    ? "bg-brand-100 text-brand-800"
                    : "text-ink-900 hover:bg-ink-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={user ? "/account" : "/login"}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-4 font-display text-2xl font-semibold tracking-tight text-ink-900 hover:bg-ink-100"
            >
              {user ? "Your account" : "Sign in"}
            </Link>
            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-xl px-4 py-4 font-display text-2xl font-semibold tracking-tight text-ink-900 hover:bg-ink-100"
            >
              Cart
              {count > 0 ? (
                <span
                  aria-hidden="true"
                  className="grid h-7 min-w-7 place-items-center rounded-full bg-brand-600 px-2 text-sm font-semibold text-white"
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          </nav>

          <div className="container-page pb-10 pt-6">
            <p className="border-t border-ink-200 pt-6 font-display text-sm font-semibold text-brand-700">
              Quick bite, endless delight.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
