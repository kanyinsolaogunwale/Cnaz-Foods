import Image from "next/image";
import Link from "next/link";
import { MailIcon, PhoneIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { SetupNotice } from "@/components/setup-notice";
import { getFeaturedProducts } from "@/lib/data";
import { site, telHref } from "@/lib/site";

const heroPoints = [
  "Crunchy & lightly salted plantain chips",
  "Fresh, crunchy & tasty peanuts",
  "Groundnut seasoned with the right touch of salt",
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: { "account-deleted"?: string };
}) {
  const { products, configured } = await getFeaturedProducts(3);

  // The hero showcases the plantain chips when available, falling back to the
  // first featured product — all data comes from the database.
  const heroProduct =
    products.find((product) => product.slug === "plantain-chips-250g") ?? products[0];
  const heroImage = heroProduct?.imageUrl ?? "/images/products/plantain-chips-250g.png";
  const heroImageAlt = heroProduct
    ? `${heroProduct.name} — ${heroProduct.weightLabel} pack`
    : "Cnaz Foods snack packaging";

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_75%_15%,rgba(143,199,74,0.20),transparent_70%)]"
        />
        <div className="container-page relative grid gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
          <div className="animate-fade-in">
            <p className="chip border border-brand-400/30 bg-brand-400/10 text-brand-300">
              Plantain Chips · Peanuts · Groundnut
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Quick bite,
              <br />
              <span className="text-brand-300">endless delight.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-base">
              Crunchy plantain chips and freshly packed nuts from Cnaz Foods — perfect for
              everyday snacking, sharing with friends, parties, or enjoying on the go.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="btn-primary px-7 py-3.5 text-base">
                Shop now
              </Link>
              <Link href="#snacks" className="btn-on-dark px-7 py-3.5 text-base">
                See our snacks
              </Link>
            </div>

            <ul className="mt-8 space-y-2.5 text-sm text-white/70">
              {heroPoints.map((point) => (
                <li key={point} className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
            <div className="stage relative aspect-square overflow-hidden rounded-3xl border border-white/10">
              <Image
                src={heroImage}
                alt={heroImageAlt}
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 90vw"
                className="blend-lighten object-contain p-6 sm:p-10"
              />
            </div>
            {heroProduct ? (
              <Link
                href={`/products/${heroProduct.slug}`}
                className="absolute -bottom-4 left-4 rounded-2xl border border-white/10 bg-ink-900/90 px-4 py-3 shadow-lift backdrop-blur transition-colors hover:border-white/25 sm:left-6"
              >
                <p className="text-xs font-medium text-white/60">{heroProduct.name}</p>
                <p className="font-display text-lg font-semibold text-brand-300">
                  ₦{heroProduct.priceNaira.toLocaleString("en-NG")}{" "}
                  <span className="text-xs font-medium text-white/60">· {heroProduct.weightLabel}</span>
                </p>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Featured products */}
      <section id="snacks" className="container-page scroll-mt-24 py-14 sm:py-20">
        {searchParams["account-deleted"] ? (
          <div
            role="status"
            className="mb-10 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center text-sm font-medium text-brand-800"
          >
            Your account has been deleted. You&apos;re always welcome back — your snacks await! 🌱
          </div>
        ) : null}

        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Our snacks
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-600">
            Crunchy plantain chips and freshly packed nuts — made for sharing and
            everyday snacking.
          </p>
        </div>

        <div className="mt-8">
          {!configured ? (
            <SetupNotice />
          ) : products.length === 0 ? (
            <p className="text-ink-600">
              Our products are being added — please check back soon.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index === 0} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/shop" className="btn-primary px-7">
            Browse the shop
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------------------- About */}
      <section className="border-y border-ink-200/70 bg-white">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              About Cnaz Foods
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              Snacks made for sharing
            </h2>
            <p className="mt-4 leading-relaxed text-ink-700">
              Cnaz Foods sells packaged snacks including plantain chips, peanuts and
              groundnuts. Every pack is made for everyday snacking, sharing with friends,
              parties, or enjoying on the go.
            </p>
            <p className="mt-4 leading-relaxed text-ink-700">
              We keep it simple: quality plantains, carefully selected groundnuts and just
              the right seasoning.
            </p>
            <p className="mt-5 font-display text-lg font-semibold text-brand-700">
              “{site.tagline}”
            </p>
            <Link href="/shop" className="btn-primary mt-7">
              Shop our snacks
            </Link>
          </div>
          <div className="stage relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-ink-200/60">
            <Image
              src="/images/logo-cn.png"
              alt="Cnaz Foods logo"
              fill
              sizes="(min-width: 1024px) 32vw, 80vw"
              className="blend-lighten object-contain p-12"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Contact */}
      <section id="contact" className="container-page scroll-mt-24 py-14 sm:py-20">
        <div className="card grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Contact
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              Get in touch
            </h2>
            <p className="mt-4 text-ink-700">
              Questions about an order or our snacks? Reach out — we&apos;re happy to help.
            </p>
          </div>
          <div className="space-y-4 text-[15px]">
            {site.phone ? (
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <PhoneIcon />
                </span>
                <a
                  href={telHref(site.phone)}
                  className="font-medium text-ink-900 hover:text-brand-700"
                >
                  {site.phone}
                </a>
              </div>
            ) : null}
            {site.email ? (
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <MailIcon />
                </span>
                <a
                  href={`mailto:${site.email}`}
                  className="break-all font-medium text-ink-900 hover:text-brand-700"
                >
                  {site.email}
                </a>
              </div>
            ) : null}
            {!site.phone && !site.email ? (
              <p className="text-ink-600">Contact details coming soon.</p>
            ) : null}
            <p className="text-sm leading-relaxed text-ink-600">
              After you place an order, we contact you to confirm the delivery details.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
