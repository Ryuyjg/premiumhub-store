import { getCatalog, isAdmin, readJson, saveCatalog, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return sendJson(res, await getCatalog(), 200, {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      });
    }

    if (req.method === "PUT") {
      if (!isAdmin(req)) return sendJson(res, { error: "Unauthorized" }, 401);
      return sendJson(res, await saveCatalog(await readJson(req)));
    }

    return sendJson(res, { error: "Method not allowed" }, 405);
  } catch (error) {
    return sendJson(res, { error: error.message || "Server error" }, 500);
  }
}
