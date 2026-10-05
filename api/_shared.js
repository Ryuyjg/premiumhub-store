import { createHmac, timingSafeEqual } from "node:crypto";
import { seedData } from "../src/storeData.js";

const CATALOG_KEY = "catalog";
const LARGE_DATA_IMAGE_LENGTH = 60000;

export function sendJson(res, response, status = 200, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(response));
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

export function readCookie(req, name) {
  const header = req.headers.cookie || "";
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
    if (rows?.[0]?.data) {
      const data = rows[0].data;
      let repaired = false;
      if (Array.isArray(data.products)) {
        data.products = data.products.map((p) => {
          if (!p.variations || p.variations.length === 0) {
            repaired = true;
            const price = p.name && p.name.toLowerCase().includes("capcut") ? 299 : 199;
            p.variations = [
              {
                id: `${p.id}-var-1`,
                name: "1 Month",
                price: price,
                originalPrice: price + 100,
                stock: 10,
                inStock: true,
                shortDescription: p.shortDescription || "Full Access • Fast Delivery",
                sku: `${(p.name || "PLAN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)}-1`,
                order: 1,
              },
            ];
            p.stock = 10;
            p.inStock = true;
          }
          return p;
        });
      }
      if (repaired) {
        await saveCatalog(data);
      }
      return data;
    }
    await saveCatalog(seedData);
    return seedData;
  } catch {
    return seedData;
  }
}

function compactImage(value, label = "Premium Hub") {
  if (typeof value !== "string") return value;
  if (!value.startsWith("data:image/") || value.length <= LARGE_DATA_IMAGE_LENGTH) return value;
  const text = String(label || "Premium Hub").trim().slice(0, 16) || "Premium Hub";
  const hue = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const background = `hsl(${hue} 72% 38%)`;
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="28" fill="${background}"/><text x="80" y="84" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#fff">${safeText}</text></svg>`)}`;
}

export function publicCatalog(data) {
  return {
    ...data,
    settings: {
      ...data.settings,
      logoImage: compactImage(data.settings?.logoImage, data.settings?.siteName),
    },
    categories: Array.isArray(data.categories)
      ? data.categories.map((category) => ({ ...category, image: compactImage(category.image, category.name) }))
      : [],
    products: Array.isArray(data.products)
      ? data.products.map((product) => ({ ...product }))
      : [],
    offers: Array.isArray(data.offers)
      ? data.offers.map((offer) => ({ ...offer, image: compactImage(offer.image, offer.itemName || offer.title) }))
      : [],
  };
}

export async function saveCatalog(data) {
  const rows = await supabaseRequest("store_documents", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key: CATALOG_KEY, data }),
  });
  return rows?.[0]?.data || data;
}
