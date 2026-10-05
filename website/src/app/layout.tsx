import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { site } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Cnaz Foods · Quick bite, endless delight.",
    template: "%s · Cnaz Foods",
  },
  description: `${site.description} Order crunchy plantain chips, roasted peanuts and seasoned groundnut online.`,
  openGraph: {      title: "Cnaz Foods · Quick bite, endless delight.",
    description: site.description,
    url: site.url,
    siteName: "Cnaz Foods",
    images: [{ url: "/images/logo-cn.png", width: 1250, height: 1250, alt: "Cnaz Foods logo" }],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F08",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <CartProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
            >
              Skip to content
            </a>

            <div className="bg-ink-950 text-white">
              <div className="container-page flex items-center justify-center gap-2 py-2 text-center text-xs sm:text-[13px]">
                <span className="text-white/85">{site.tagline}</span>
                <Link
                  href="/shop"
                  className="font-semibold text-brand-300 hover:text-brand-200"
                >
                  Shop now →
                </Link>
              </div>
            </div>

            <Header />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
