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

/** Snack type chips, shared by the mobile sheet and the desktop dropdown. */
function SnackTypeChips({
  types,
  draftType,
  onToggle,
}: {
  types: SnackTypeOption[];
  draftType: string;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="label">Snack type</legend>
      <div className="flex flex-wrap gap-2">
        {types.map((type) => (
          <button
            key={type.value}
            type="button"
            aria-pressed={draftType === type.value}
            onClick={() => onToggle(type.value)}
            className={chipClass(draftType === type.value)}
          >
            {type.value}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Price range inputs, shared by the mobile sheet and the desktop dropdown. */
function PriceRange({ min, max }: { min: string; max: string }) {
  return (
    <fieldset>
      <legend className="label">Price (₦)</legend>
      <div className="grid grid-cols-2 gap-3">
        <PriceInput name="min" label="Min" defaultValue={min} />
        <PriceInput name="max" label="Max" defaultValue={max} />
      </div>
    </fieldset>
  );
}

/** Sort select, shared by the mobile sheet and the desktop dropdown. */
function SortSelect({ current }: { current: string }) {
  return (
    <fieldset>
      <legend className="label">Sort by</legend>
      <select name="sort" defaultValue={current} className="input">
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

/**
 * Catalogue controls for the shop page. The search field fills the row with
 * the Filters button beside it. Below lg the button is icon-only and opens a
 * bottom sheet; at lg and up it shows icon + text and opens an overlay
 * dropdown panel anchored beneath the button (no dimmed backdrop — it reads
 * as part of the page, not a popup). Every control navigates to /shop with
 * URL params, so results are shareable and the server stays the single
 * source of truth (same query engine as GET /api/products).
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
  const [sheetOpen, setSheetOpen] = useState(false); // mobile / tablet
  const [dropdownOpen, setDropdownOpen] = useState(false); // desktop (lg+)
  const [draftType, setDraftType] = useState(values.type);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  const open = sheetOpen || dropdownOpen;

  const activeCount =
    (values.q ? 1 : 0) +
    (values.type ? 1 : 0) +
    (values.sort ? 1 : 0) +
    (values.min ? 1 : 0) +
    (values.max ? 1 : 0);

  function apply(next: ShopFilterValues) {
    const qs = toQueryString(next);
    setSheetOpen(false);
    setDropdownOpen(false);
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  function closeSheet() {
    setSheetOpen(false);
    filtersButtonRef.current?.focus();
  }

  function closeDropdown() {
    setDropdownOpen(false);
    filtersButtonRef.current?.focus();
  }

  function toggle(openNext: boolean) {
    setDraftType(values.type);
    setSheetOpen(openNext && window.innerWidth < 1024);
    setDropdownOpen(openNext && window.innerWidth >= 1024);
  }

  // Bottom sheet (below lg): Escape closes it, page scroll locks while it is
  // open, and focus moves to the close button on open.
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

  // Desktop dropdown (lg+): Escape closes it; the page stays scrollable and
  // the invisible backdrop closes it on any outside click.
  useEffect(() => {
    if (!dropdownOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDropdown();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdownOpen]);

  return (
    <div className="mt-8">
      {/* Search fills the container; the Filters button sits right beside it. */}
      <div className="flex items-center gap-2.5">
        <form
          role="search"
          aria-label="Search products"
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            apply({ ...values, q: String(data.get("q") ?? "") });
          }}
        >
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              name="q"
              defaultValue={values.q}
              placeholder="Search snacks, e.g. plantain chips…"
              autoComplete="off"
              aria-label="Search snacks"
              className="input w-full py-2.5 pl-10 pr-24 text-[15px] sm:pr-28"
            />
            <button
              type="submit"
              className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 text-sm sm:px-4"
            >
              Search
            </button>
          </div>
        </form>

        {/* Filters toggle: icon-only on mobile and tablet, icon + text on
            desktop. The desktop dropdown anchors to this wrapper. */}
        <div className="relative shrink-0">
          <button
            ref={filtersButtonRef}
            type="button"
            onClick={() => toggle(!open)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Filters"
            className="btn-secondary relative px-3 py-2.5 lg:px-5"
          >
            <FilterIcon className="h-5 w-5 lg:h-4 lg:w-4" />
            <span className="hidden text-[15px] lg:inline">Filters</span>
            {activeCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white"
              >
                {activeCount > 9 ? "9+" : activeCount}
              </span>
            )}
          </button>

          {/* Desktop dropdown overlay (lg+): anchored right below the
              button, part of the page — no dimmed backdrop. */}
          {dropdownOpen && (
            <>
              <button
                type="button"
                aria-label="Close filters"
                tabIndex={-1}
                onClick={closeDropdown}
                className="fixed inset-0 z-20 hidden cursor-default bg-transparent lg:block"
              />
              <div
                role="dialog"
                aria-label="Product filters"
                className="absolute right-0 top-full z-30 mt-2 hidden w-80 max-w-[calc(100vw-2rem)] animate-fade-in rounded-2xl border border-ink-200 bg-white p-5 shadow-lift lg:block"
              >
                <form
                  className="space-y-5"
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
                  <SnackTypeChips
                    types={types}
                    draftType={draftType}
                    onToggle={(value) =>
                      setDraftType(draftType === value ? "" : value)
                    }
                  />
                  <PriceRange min={values.min} max={values.max} />
                  <SortSelect current={values.sort} />

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
            </>
          )}
        </div>
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

      {/* Mobile/tablet filter bottom sheet (the full filter set). */}
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
              <SnackTypeChips
                types={types}
                draftType={draftType}
                onToggle={(value) => setDraftType(draftType === value ? "" : value)}
              />
              <PriceRange min={values.min} max={values.max} />
              <SortSelect current={values.sort} />

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
