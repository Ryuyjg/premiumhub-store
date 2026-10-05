import { createHmac, timingSafeEqual } from "node:crypto";
import { BRAND_LOGOS_DATA } from "../src/brandLogos.js";
import { seedData } from "../src/storeData.js";

const CATALOG_KEY = "catalog";
const LARGE_DATA_IMAGE_LENGTH = 60000;
const BRAND_LOGO_MAP = new Map(BRAND_LOGOS_DATA.map((brand) => [brand.id, brand]));
const CUSTOM_BRANDS = new Map([
  ["prime-video", { color: "#00A8E1", label: "Prime", textColor: "#fff" }],
  ["jiohotstar", { color: "#0B5CFF", label: "JioHotstar", textColor: "#fff" }],
  ["hotstar", { color: "#0B5CFF", label: "Hotstar", textColor: "#fff" }],
  ["gemini", { color: "#8B5CF6", label: "Gemini", textColor: "#fff" }],
  ["replit", { color: "#F26207", label: "Replit", textColor: "#fff" }],
  ["n8n", { color: "#EA4B71", label: "n8n", textColor: "#fff" }],
  ["capcut", { color: "#111827", label: "CapCut", textColor: "#fff" }],
]);
const BRAND_ALIASES = [
  ["youtube", ["youtube-premium", "youtube"]],
  ["netflix", ["netflix"]],
  ["spotify", ["spotify"]],
  ["openai", ["chatgpt", "gpt", "openai"]],
  ["anthropic", ["claude"]],
  ["canva", ["canva"]],
  ["sonyliv", ["sonyliv", "sony-liv", "sony liv"]],
  ["zee5", ["zee5"]],
  ["appletv", ["apple-tv", "apple tv", "appletv"]],
  ["applemusic", ["apple-music", "apple music"]],
  ["prime-video", ["prime-video", "prime video", "amazon prime"]],
  ["jiohotstar", ["jiohotstar", "jio-hotstar", "jio hotstar"]],
  ["hotstar", ["hotstar"]],
  ["gemini", ["gemini"]],
  ["replit", ["replit"]],
  ["n8n", ["n8n"]],
  ["capcut", ["capcut", "capcut-pro", "capcut pro"]],
];

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

function dataSvg(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function brandKeyFor(item) {
  const values = [item?.id, item?.slug, item?.name, item?.title].map(normalizeText);
  const readable = String([item?.id, item?.slug, item?.name, item?.title].filter(Boolean).join(" ")).toLowerCase();
  for (const [key, aliases] of BRAND_ALIASES) {
    if (aliases.some((alias) => values.includes(normalizeText(alias)) || readable.includes(alias))) return key;
  }
  return "";
}

function brandImage(item) {
  const key = brandKeyFor(item);
  const custom = CUSTOM_BRANDS.get(key);
  if (custom) {
    const safeLabel = custom.label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return dataSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="34" fill="${custom.color}"/><text x="80" y="84" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${safeLabel.length > 8 ? 18 : 25}" font-weight="850" fill="${custom.textColor}">${safeLabel}</text></svg>`);
  }

  const brand = BRAND_LOGO_MAP.get(key);
  if (!brand) return "";

  const background = brand.color === "#FFFFFF" ? "#111827" : brand.color;
  const icon = brand.path.trim().startsWith("<svg")
    ? brand.path.replace("<svg ", '<svg x="32" y="32" width="96" height="96" ')
    : `<svg x="36" y="36" width="88" height="88" viewBox="0 0 24 24"><path fill="#fff" d="${brand.path}"/></svg>`;
  return dataSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="34" fill="${background}"/>${icon}</svg>`);
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
      ? data.products.map((product) => ({ ...product, image: brandImage(product) || compactImage(product.image, product.name) }))
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
