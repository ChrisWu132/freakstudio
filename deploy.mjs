// Pages publishes every file in the upload directory, so deploying "." made README, wrangler.toml,
// test/ and original-export/ public. Only the files below go up; functions/ is picked up from this directory.
import { cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

process.chdir(import.meta.dirname);
const PUBLIC = ["index.html", "404.html", "robots.txt", "sitemap.xml", "_redirects", "assets", "css", "js"];
rmSync("dist", { recursive: true, force: true });
for (const p of PUBLIC) cpSync(p, `dist/${p}`, { recursive: true });

// A user-level token would override the wrangler login (see memory blockless-deploy-cloudflare-token-trap).
const env = { ...process.env };
delete env.CLOUDFLARE_API_TOKEN;
delete env.CLOUDFLARE_ACCOUNT_ID;
execFileSync("npx wrangler pages deploy dist --project-name=freakstudio --commit-dirty=true --branch=main", {
  stdio: "inherit",
  env,
  shell: true,
});
