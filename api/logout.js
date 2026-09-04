import { clearAdminCookie, sendJson } from "./_shared.js";

export default function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, { error: "Method not allowed" }, 405);
  return sendJson(res, { ok: true }, 200, { "Set-Cookie": clearAdminCookie() });
}
