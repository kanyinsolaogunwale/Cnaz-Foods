import Image from "next/image";
import Link from "next/link";
import { MailIcon, PhoneIcon } from "@/components/icons";
import { site, telHref } from "@/lib/site";

const shopLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/cart", label: "Cart" },
];

const accountLinks = [
  { href: "/login", label: "Sign in" },
  { href: "/account", label: "Your account" },
  { href: "/account/orders", label: "Order history" },
];

export function Footer() {
  return (
    <footer className="mt-20 bg-ink-950 text-white">
      {/* Tablet (md) and up: the brand overview, Shop, Account and Contact
          sit on one row and justify-between spreads the leftover space
          equally BETWEEN the blocks, so the visual gap from the overview to
          Shop matches the gaps between the link columns no matter how wide
          each column's text is. Below md: two columns on small tablets,
          stacked on phones. */}
      <div className="container-page flex flex-col gap-10 py-12 sm:grid sm:grid-cols-2 md:flex md:flex-row md:justify-between md:gap-10 lg:py-16">
        <div className="max-w-xs md:w-56 md:max-w-none lg:w-64">
          <Image
            src="/images/logo-cn.png"
            alt="Cnaz Foods logo"
            width={56}
            height={56}
            className="h-14 w-14 rounded-xl"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            {site.description}
          </p>
          <p className="mt-3 font-display text-sm font-semibold text-brand-300">
            “{site.tagline}”
          </p>
        </div>

        <nav aria-label="Shop">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Shop
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {shopLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/80 transition-colors hover:text-brand-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Account
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {accountLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/80 transition-colors hover:text-brand-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Contact
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            {site.phone ? (
              <a
                href={telHref(site.phone)}
                className="flex items-center gap-2.5 text-white/80 transition-colors hover:text-brand-300"
              >
                <PhoneIcon className="h-4 w-4 shrink-0 text-brand-300" />
                {site.phone}
              </a>
            ) : null}
            {site.email ? (
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-2.5 break-all text-white/80 transition-colors hover:text-brand-300"
              >
                <MailIcon className="h-4 w-4 shrink-0 text-brand-300" />
                {site.email}
              </a>
            ) : null}
            {!site.phone && !site.email && (
              <p className="text-white/60">Contact details coming soon.</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Cnaz Foods. All rights reserved.</p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
