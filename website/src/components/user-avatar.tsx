"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  /** Google profile photo URL, if the account has one. */
  src: string | null;
  /** Display name (or email) used for the initial fallback. */
  name: string;
  /** Tailwind size classes, e.g. "h-8 w-8" or "h-14 w-14". */
  className: string;
  /** Tailwind text size for the initial, e.g. "text-sm" or "text-xl". */
  textClassName: string;
};

/**
 * Google profile photo with a graceful fallback: if the account has no photo
 * (the URL 404s) or the image fails to load, a brand-green circle with the
 * person's initial is shown instead of a broken image.
 */
export function UserAvatar({ src, name, className, textClassName }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full bg-brand-600 font-semibold text-white ${className} ${textClassName}`}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={64}
      height={64}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full border border-ink-200 object-cover ${className}`}
      unoptimized
    />
  );
}
