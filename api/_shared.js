import { createHmac, timingSafeEqual } from "node:crypto";
import { seedData } from "../src/storeData.js";

const CATALOG_KEY = "catalog";

export function json(response, status = 200, headers = {}) {
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function signSession(value) {
  const secret = process.env.ADMIN_SESSION_SECRET || "local-development-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function isAdmin(request) {
  const token = readCookie(request, "premium_hub_admin");
  if (!token) return false;
  const expected = signSession("admin");
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}

export function adminCookie() {
  const secure = process.env.VERCEL ? "Secure; " : "";
  return `premium_hub_admin=${signSession("admin")}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=604800`;
}

export function clearAdminCookie() {
  const secure = process.env.VERCEL ? "Secure; " : "";
  return `premium_hub_admin=; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=0`;
}

export async function supabaseRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase environment variables are missing.");

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function getCatalog() {
  try {
    const rows = await supabaseRequest(`store_documents?key=eq.${CATALOG_KEY}&select=data`);
    if (rows?.[0]?.data) return rows[0].data;
    await saveCatalog(seedData);
    return seedData;
  } catch {
    return seedData;
  }
}

export async function saveCatalog(data) {
  const rows = await supabaseRequest("store_documents", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key: CATALOG_KEY, data }),
  });
  return rows?.[0]?.data || data;
}
