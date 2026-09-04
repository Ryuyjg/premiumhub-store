import { isAdmin, sendJson } from "./_shared.js";

export default function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, { error: "Method not allowed" }, 405);
  return sendJson(res, { authenticated: isAdmin(req) });
}
