"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/icons";
import type { SnackTypeOption } from "@/lib/data";

/** Catalogue control values as they appear in the shop URL. */
export type ShopFilterValues = {
  q: string;
  sort: string; // "" | "price-asc" | "price-desc"
  type: string; // snack type derived from real product names
  min: string; // minimum price in naira ("" = unset)
  max: string; // maximum price in naira ("" = unset)
};

const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price-asc", label: "Price: Low to high" },
  { value: "price-desc", label: "Price: High to low" },
];

const EMPTY_VALUES: ShopFilterValues = { q: "", sort: "", type: "", min: "", max: "" };

function toQueryString(values: ShopFilterValues): string {
  const params = new URLSearchParams();
  if (values.q.trim()) params.set("q", values.q.trim());
  if (values.type) params.set("type", values.type);
  if (values.sort) params.set("sort", values.sort);
  if (values.min.trim()) params.set("min", values.min.trim());
  if (values.max.trim()) params.set("max", values.max.trim());
  return params.toString();
}

function chipClass(active: boolean): string {
  return `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-ink-200 bg-white text-ink-700 hover:border-brand-600 hover:text-brand-700"
  }`;
}

function PriceInput({
  name,
  label,
  defaultValue,
}: {
  name: "min" | "max";
  label: string;
  defaultValue: string;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500"
      >
        ₦
      </span>
      <input
        type="number"
        name={name}
        min={0}
        defaultValue={defaultValue}
        placeholder={label}
        aria-label={label === "Min" ? "Minimum price in naira" : "Maximum price in naira"}
        className="input w-full py-2 pl-7 pr-2 text-sm"
      />
    </div>
  );
}

/**
 * Catalogue controls for the shop page. Search is always visible; on desktop
 * (lg+) the snack-type chips, sort and price range sit in an inline bar, while
 * smaller screens open the same controls in a bottom sheet. Every control
 * navigates to /shop with URL params, so results are shareable and the server
 * stays the single source of truth (same query engine as GET /api/products).
 */
export function ShopFilters({
  types,
  values,
  resultCount,
}: {
  types: SnackTypeOption[];
  values: ShopFilterValues;
  resultCount: number;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftType, setDraftType] = useState(values.type);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  const activeCount =
    (values.q ? 1 : 0) +
    (values.type ? 1 : 0) +
    (values.sort ? 1 : 0) +
    (values.min ? 1 : 0) +
    (values.max ? 1 : 0);

  function apply(next: ShopFilterValues) {
    const qs = toQueryString(next);
    setSheetOpen(false);
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  function closeSheet() {
    setSheetOpen(false);
    filtersButtonRef.current?.focus();
  }

  // Bottom sheet: Escape closes it, page scroll locks while it is open, and
  // focus moves to the close button on open (mirrors the header mobile menu).
  useEffect(() => {
    if (!sheetOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeSheet();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetCloseRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  return (
    <div className="mt-8">
      {/* Search: always visible on every screen size. */}
      <form
        role="search"
        aria-label="Search products"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          apply({ ...values, q: String(data.get("q") ?? "") });
        }}
      >
        <div className="relative max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            name="q"
            defaultValue={values.q}
            placeholder="Search snacks, e.g. plantain chips…"
            autoComplete="off"
            aria-label="Search snacks"
            className="input py-2.5 pl-10 pr-24 text-[15px] sm:pr-28"
          />
          <button
            type="submit"
            className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 text-sm sm:px-4"
          >
            Search
          </button>
        </div>
      </form>

      {/* Desktop filter bar (lg and up). */}
      <div className="mt-3 hidden flex-wrap items-center gap-2.5 lg:flex">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by snack type"
        >
          {types.map((type) => (
            <button
              key={type.value}
              type="button"
              aria-pressed={values.type === type.value}
              onClick={() =>
                apply({ ...values, type: values.type === type.value ? "" : type.value })
              }
              className={chipClass(values.type === type.value)}
            >
              {type.value}
            </button>
          ))}
        </div>

        <label className="sr-only" htmlFor="sort-desktop">
          Sort products
        </label>
        <select
          id="sort-desktop"
          defaultValue={values.sort}
          onChange={(event) => apply({ ...values, sort: event.target.value })}
          className="input w-auto py-2 pr-8 text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            apply({
              ...values,
              min: String(data.get("min") ?? ""),
              max: String(data.get("max") ?? ""),
            });
          }}
        >
          <PriceInput name="min" label="Min" defaultValue={values.min} />
          <span aria-hidden="true" className="text-ink-500">
            –
          </span>
          <PriceInput name="max" label="Max" defaultValue={values.max} />
          <button type="submit" className="btn-secondary px-4 py-2 text-sm">
            Apply
          </button>
        </form>
      </div>

      {/* Mobile and tablet controls: the full filter set opens in a bottom
          sheet; sorting stays one tap away on the page itself. */}
      <div className="mt-3 flex items-center gap-2.5 lg:hidden">
        <button
          ref={filtersButtonRef}
          type="button"
          onClick={() => {
            setDraftType(values.type);
            setSheetOpen(true);
          }}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          className="btn-secondary relative flex-1 py-2.5"
        >
          <FilterIcon className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white"
            >
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          )}
        </button>

        <label className="sr-only" htmlFor="sort-mobile">
          Sort products
        </label>
        <select
          id="sort-mobile"
          defaultValue={values.sort}
          onChange={(event) => apply({ ...values, sort: event.target.value })}
          className="input w-44 shrink-0 py-2.5 text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Result count and reset. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-500" aria-live="polite">
          {resultCount} snack{resultCount === 1 ? "" : "s"}
          {activeCount > 0 ? " · filters active" : ""}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => apply(EMPTY_VALUES)}
            className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Mobile/tablet filter bottom sheet. */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Product filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={closeSheet}
            className="absolute inset-0 bg-ink-950/50"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-3xl bg-cream-50 shadow-lift">
            <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-cream-50 px-5 py-4">
              <p className="font-display text-lg font-semibold text-ink-900">Filters</p>
              <button
                ref={sheetCloseRef}
                type="button"
                onClick={closeSheet}
                aria-label="Close filters"
                className="grid h-10 w-10 place-items-center rounded-lg text-ink-800 hover:bg-ink-100"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="space-y-6 px-5 py-5"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                apply({
                  q: values.q,
                  sort: String(data.get("sort") ?? ""),
                  type: draftType,
                  min: String(data.get("min") ?? ""),
                  max: String(data.get("max") ?? ""),
                });
              }}
            >
              <fieldset>
                <legend className="label">Snack type</legend>
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      aria-pressed={draftType === type.value}
                      onClick={() =>
                        setDraftType(draftType === type.value ? "" : type.value)
                      }
                      className={chipClass(draftType === type.value)}
                    >
                      {type.value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="label">Price (₦)</legend>
                <div className="grid grid-cols-2 gap-3">
                  <PriceInput name="min" label="Min" defaultValue={values.min} />
                  <PriceInput name="max" label="Max" defaultValue={values.max} />
                </div>
              </fieldset>

              <fieldset>
                <legend className="label">Sort by</legend>
                <select name="sort" defaultValue={values.sort} className="input">
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </fieldset>

              <div className="flex items-center gap-3 border-t border-ink-200 pt-4">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => apply(EMPTY_VALUES)}
                    className="btn-secondary shrink-0"
                  >
                    Clear all
                  </button>
                )}
                <button type="submit" className="btn-primary flex-1">
                  Apply filters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
