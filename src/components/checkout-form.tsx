"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TextAreaField, TextField } from "@/components/form-fields";
import { CartIcon } from "@/components/icons";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { formatNaira } from "@/lib/format";

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  note: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_VALUES: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  note: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Client-side validation mirrors the server rules for fast feedback. */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.fullName.trim().length < 2) {
    errors.fullName = "Please enter your full name.";
  }
  if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  const digits = values.phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    errors.phone = "Please enter a valid phone number.";
  }
  if (values.address.trim().length < 8) {
    errors.address = "Please enter your delivery address (street, area, landmark).";
  }
  if (values.city.trim().length < 2) {
    errors.city = "Please enter your city or town.";
  }
  if (values.note.trim().length > 300) {
    errors.note = "Please keep the note under 300 characters.";
  }
  return errors;
}

export function CheckoutForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { lines, ready, count, subtotal, clear } = useCart();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  // Prefill from the signed-in Google account.
  useEffect(() => {
    if (!user) return;
    setValues((prev) => ({
      ...prev,
      fullName:
        prev.fullName ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        "",
      email: prev.email || user.email || "",
    }));
  }, [user]);

  function setField(field: keyof FormValues) {
    return (value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };
  }

  function handleBlur(field: keyof FormValues) {
    return () => {
      const fieldErrors = validate(values);
      if (fieldErrors[field]) {
        setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
      }
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || placed) return;

    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setFormError("Please check the highlighted fields and try again.");
      const firstField = Object.keys(clientErrors)[0];
      document.getElementById(firstField)?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
          customer: {
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            address: values.address.trim(),
            city: values.city.trim(),
            state: values.state.trim(),
            note: values.note.trim(),
          },
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        order?: { id: string };
        error?: string;
        fieldErrors?: Record<string, string>;
      } | null;

      if (!response.ok || !data?.order) {
        if (data?.fieldErrors) setErrors(data.fieldErrors as FieldErrors);
        setFormError(data?.error ?? "We couldn't place your order. Please try again.");
        setSubmitting(false);
        return;
      }

      // Order is saved — clear the cart and show the confirmation page,
      // where the customer can pay online via Paystack (or wait for our call).
      setPlaced(true);
      clear();
      router.push(`/orders/${data.order.id}`);
    } catch {
      setFormError(
        "We couldn't place your order. Please check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]" aria-hidden="true">
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-ink-100" />
      </div>
    );
  }

  if (placed) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center" role="status">
        <h2 className="font-display text-xl font-semibold text-ink-900">
          Order placed — taking you to your confirmation…
        </h2>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
          <CartIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900">
          Your cart is empty
        </h2>
        <p className="mt-2 text-ink-600">
          Add some snacks before checking out — it only takes a moment.
        </p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse our snacks
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="space-y-8">
        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-medium text-accent-dark"
          >
            {formError}
          </div>
        ) : null}

        <fieldset className="card p-5 sm:p-6">
          <legend className="px-1 font-display text-lg font-semibold text-ink-900">
            Contact details
          </legend>
          <p className="mt-1 text-sm text-ink-600">
            We&apos;ll use these to confirm your order and delivery.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                id="fullName"
                label="Full name"
                required
                autoComplete="name"
                placeholder="e.g. Ada Obi"
                value={values.fullName}
                onChange={setField("fullName")}
                onBlur={handleBlur("fullName")}
                error={errors.fullName}
              />
            </div>
            <TextField
              id="email"
              label="Email address"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={setField("email")}
              onBlur={handleBlur("email")}
              error={errors.email}
              hint="Your order confirmation is sent here."
            />
            <TextField
              id="phone"
              label="Phone number"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 0803 000 0000"
              value={values.phone}
              onChange={setField("phone")}
              onBlur={handleBlur("phone")}
              error={errors.phone}
              hint="We call this number to confirm delivery."
            />
          </div>
        </fieldset>

        <fieldset className="card p-5 sm:p-6">
          <legend className="px-1 font-display text-lg font-semibold text-ink-900">
            Delivery details
          </legend>
          <p className="mt-1 text-sm text-ink-600">
            Where should we bring your snacks?
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                id="address"
                label="Delivery address"
                required
                autoComplete="street-address"
                placeholder="Street, area, landmark"
                value={values.address}
                onChange={setField("address")}
                onBlur={handleBlur("address")}
                error={errors.address}
              />
            </div>
            <TextField
              id="city"
              label="City / town"
              required
              autoComplete="address-level2"
              placeholder="e.g. Uyo"
              value={values.city}
              onChange={setField("city")}
              onBlur={handleBlur("city")}
              error={errors.city}
            />
            <TextField
              id="state"
              label="State (optional)"
              autoComplete="address-level1"
              placeholder="e.g. Akwa Ibom"
              value={values.state}
              onChange={setField("state")}
              onBlur={handleBlur("state")}
              error={errors.state}
            />
            <div className="sm:col-span-2">
              <TextAreaField
                id="note"
                label="Delivery note (optional)"
                rows={3}
                placeholder="Anything we should know about the delivery?"
                value={values.note}
                onChange={setField("note")}
                onBlur={handleBlur("note")}
                error={errors.note}
              />
            </div>
          </div>
        </fieldset>

      </div>

      <aside className="card p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold text-ink-900">Order summary</h2>

        <ul className="mt-4 space-y-3">
          {lines.map((line) => (
            <li key={line.productId} className="flex items-center gap-3">
              <div className="stage relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={line.imageUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="blend-lighten object-contain p-1.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{line.name}</p>
                <p className="text-xs text-ink-600">
                  {line.weightLabel} · Qty {line.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-ink-900">
                {formatNaira(line.priceNaira * line.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-3 border-t border-ink-200 pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-ink-600">
              Subtotal ({count} item{count === 1 ? "" : "s"})
            </dt>
            <dd className="font-medium tabular-nums">{formatNaira(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Delivery</dt>
            <dd className="font-medium text-ink-600">To be confirmed</dd>
          </div>
          <div className="flex justify-between border-t border-ink-200 pt-3">
            <dt className="text-base font-semibold text-ink-900">Total</dt>
            <dd className="text-base font-semibold tabular-nums text-ink-900">
              {formatNaira(subtotal)}
            </dd>
          </div>
        </dl>

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="btn-primary mt-5 w-full"
        >
          {submitting ? "Placing your order…" : "Place order"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          After you place your order you can pay securely online (card, transfer or
          USSD) — or we&apos;ll arrange payment when we call to confirm delivery. You&apos;ll
          also receive a confirmation email.
        </p>
      </aside>
    </form>
  );
}
