/**
 * Copies the website's PUBLIC Supabase env values into the mobile .env.local
 * (merging with the existing EXPO_PUBLIC_WEBSITE_URL). Secrets are never
 * copied: the mobile app only needs the public URL + anon key, which it
 * normally receives at runtime from /api/mobile/config anyway — these values
 * are just a fallback so the app also works when the website API is briefly
 * unreachable.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", ".."); // repo root
const websiteEnv = path.join(root, ".env.local");
const mobileEnv = path.join(__dirname, "..", ".env.local");

function readVars(file) {
  const vars = {};
  if (!fs.existsSync(file)) return vars;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !line.trim().startsWith("#")) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

const website = readVars(websiteEnv);
const mobile = readVars(mobileEnv);

const patches = {
  EXPO_PUBLIC_SUPABASE_URL: website.NEXT_PUBLIC_SUPABASE_URL ?? "",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: website.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

if (!mobile.EXPO_PUBLIC_WEBSITE_URL) {
  patches.EXPO_PUBLIC_WEBSITE_URL = "http://localhost:3000";
}

const merged = { ...mobile, ...patches };
const content =
  Object.entries(merged)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";

fs.writeFileSync(mobileEnv, content);
console.log(
  `Updated mobile/.env.local (website URL: ${merged.EXPO_PUBLIC_WEBSITE_URL}, ` +
    `Supabase: ${merged.EXPO_PUBLIC_SUPABASE_URL ? "configured" : "not set"})`,
);
