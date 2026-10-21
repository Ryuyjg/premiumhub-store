import { getCatalog, isAdmin, publicCatalog, readJson, saveCatalog, sendJson } from "./_shared.js";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
};

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const catalog = await getCatalog();
      return sendJson(res, isAdmin(req) ? catalog : publicCatalog(catalog), 200, NO_CACHE_HEADERS);
    }

    if (req.method === "PUT") {
      if (!isAdmin(req)) return sendJson(res, { error: "Unauthorized" }, 401, NO_CACHE_HEADERS);
      const updated = await readJson(req);
      const saved = await saveCatalog(updated);
      return sendJson(res, saved, 200, NO_CACHE_HEADERS);
    }

    return sendJson(res, { error: "Method not allowed" }, 405, NO_CACHE_HEADERS);
  } catch (error) {
    return sendJson(res, { error: error.message || "Server error" }, 500, NO_CACHE_HEADERS);
  }
}

