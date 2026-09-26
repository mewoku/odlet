// Creates deploy/prod/.env with fresh secrets (never overwrites an existing file).
//   node deploy/prod/gen-env.mjs odlet.xyz [gatewayPort]
// ANON_KEY is public (it ships in the app and the site); everything else stays on the server.
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, ".env");
if (existsSync(file)) {
  console.log(".env exists, leaving it alone");
  process.exit(0);
}
const domain = process.argv[2] || "odlet.xyz";
const port = process.argv[3] || "8130";
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const secret = randomBytes(48).toString("base64url");
const jwt = (role) => {
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64u(JSON.stringify({ iss: "odlet", role, iat: now, exp: now + 10 * 365 * 24 * 3600 }));
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
};
const lines = [
  `DOMAIN=${domain}`,
  `SITE_URL=https://${domain}`,
  `GATEWAY_PORT=${port}`,
  `POSTGRES_PASSWORD=${randomBytes(24).toString("hex")}`,
  `JWT_SECRET=${secret}`,
  `ANON_KEY=${jwt("anon")}`,
  `SERVICE_ROLE_KEY=${jwt("service_role")}`,
  `CONTACT_EMAIL=`,
  `NEXT_PUBLIC_MARKET_OPEN=false`,
  `NEXT_PUBLIC_PAYMENT_RECIPIENT=`,
  `MINT_AUTHORITY_SECRET_KEY=`,
];
writeFileSync(file, lines.join("\n") + "\n", { mode: 0o600 });
console.log(`wrote ${file}`);
