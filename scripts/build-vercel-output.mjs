import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const output = ".vercel/output";
const functionDir = join(output, "functions", "api.func");

await rm(output, { recursive: true, force: true });
await mkdir(join(output, "static"), { recursive: true });
await mkdir(functionDir, { recursive: true });
await cp("dist", join(output, "static"), { recursive: true });

await writeFile(
  join(output, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api/(.*)", dest: "/api?path=$1" },
        { handle: "filesystem" },
        { src: "/.*", dest: "/index.html" },
      ],
      framework: { version: "vite" },
    },
    null,
    2,
  ),
);

await writeFile(
  join(functionDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "edge",
      entrypoint: "index.js",
      envVarsInUse: [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ADMIN_PASSWORD",
        "ADMIN_SESSION_SECRET",
      ],
    },
    null,
    2,
  ),
);

await writeFile(
  join(functionDir, "index.js"),
  `const CATALOG_KEY = "catalog";

const seedData = ${JSON.stringify((await import("../src/storeData.js")).seedData)};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function cookie(request, name) {
  const header = request.headers.get("cookie") || "";
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + "="))
    ?.slice(name.length + 1);
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signSession(value) {
  const encoder = new TextEncoder();
  const secret = process.env.ADMIN_SESSION_SECRET || "local-development-secret";
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function isAdmin(request) {
  const token = cookie(request, "premium_hub_admin");
  return Boolean(token) && token === await signSession("admin");
}

async function adminCookie() {
  return "premium_hub_admin=" + await signSession("admin") + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800";
}

function clearAdminCookie() {
  return "premium_hub_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

async function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase environment variables are missing.");

  const response = await fetch(url.replace(/\\/$/, "") + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

async function getCatalog() {
  const rows = await supabase("store_documents?key=eq." + CATALOG_KEY + "&select=data");
  if (rows?.[0]?.data) return rows[0].data;
  await saveCatalog(seedData);
  return seedData;
}

async function saveCatalog(data) {
  const rows = await supabase("store_documents", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key: CATALOG_KEY, data }),
  });
  return rows?.[0]?.data || data;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.searchParams.get("path") || "";

    try {
      if (request.method === "GET" && path === "catalog") return json(await getCatalog());
      if (request.method === "PUT" && path === "catalog") {
        if (!(await isAdmin(request))) return json({ error: "Unauthorized" }, 401);
        return json(await saveCatalog(await request.json()));
      }
      if (request.method === "POST" && path === "login") {
        const body = await request.json();
        if (!body.password || body.password !== process.env.ADMIN_PASSWORD) return json({ error: "Invalid password" }, 401);
        return json({ authenticated: true }, 200, { "Set-Cookie": await adminCookie() });
      }
      if (request.method === "POST" && path === "logout") {
        return json({ ok: true }, 200, { "Set-Cookie": clearAdminCookie() });
      }
      if (request.method === "GET" && path === "session") {
        return json({ authenticated: await isAdmin(request) });
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: error.message || "Server error" }, 500);
    }
  },
};
`,
);

console.log("Created .vercel/output");
