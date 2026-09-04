import { getCatalog, isAdmin, json, saveCatalog } from "./_shared.js";

export default async function handler(request) {
  if (request.method === "GET") {
    return json(await getCatalog());
  }

  if (request.method === "PUT") {
    if (!isAdmin(request)) return json({ error: "Unauthorized" }, 401);
    const data = await request.json();
    return json(await saveCatalog(data));
  }

  return json({ error: "Method not allowed" }, 405);
}
