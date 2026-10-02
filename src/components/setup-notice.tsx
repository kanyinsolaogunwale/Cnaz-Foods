/**
 * Shown on data-driven pages when Supabase hasn't been configured yet.
 * In production this should never appear — the required env vars will be set.
 */
export function SetupNotice({
  title = "Connect the shop database to see products",
}: {
  title?: string;
}) {
  return (
    <div className="card mx-auto max-w-2xl p-6 sm:p-8" role="note">
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
        <li>
          Copy <code className="rounded bg-ink-100 px-1.5 py-0.5">.env.example</code> to{" "}
          <code className="rounded bg-ink-100 px-1.5 py-0.5">.env.local</code> and add your
          Supabase URL, anon key and service role key.
        </li>
        <li>
          Run <code className="rounded bg-ink-100 px-1.5 py-0.5">supabase/schema.sql</code> in
          the Supabase SQL editor; it creates the tables, security policies and the Cnaz
          Foods products.
        </li>
        <li>Restart the dev server.</li>
      </ol>
    </div>
  );
}
