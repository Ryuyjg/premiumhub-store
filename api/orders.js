import { isAdmin, readJson, sendJson, supabaseRequest } from "./_shared.js";

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
};

const ORDERS_KEY = "orders";

function shortId() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function getOrdersFromDocs() {
  try {
    const rows = await supabaseRequest(`store_documents?key=eq.${ORDERS_KEY}&select=data`);
    if (rows?.[0]?.data && Array.isArray(rows[0].data.orders)) {
      return rows[0].data.orders;
    }
  } catch (err) {
    console.warn("Could not read orders from store_documents:", err.message);
  }
  return [];
}

async function saveOrdersToDocs(orders) {
  const trimmed = orders.slice(0, 200);
  await supabaseRequest("store_documents", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key: ORDERS_KEY, data: { orders: trimmed } }),
  });
  return trimmed;
}

export default async function handler(req, res) {
  try {
    // POST /api/orders — customer creates an order
    if (req.method === "POST") {
      const body = await readJson(req);
      const { items, total, customerName, upiApp } = body;
      if (!Array.isArray(items) || items.length === 0 || !total) {
        return sendJson(res, { error: "Invalid order data" }, 400, NO_CACHE);
      }

      const id = shortId();
      const newOrder = {
        id,
        customer_name: (customerName || "Customer").slice(0, 80),
        items,
        total: Number(total),
        upi_app: upiApp || "upi",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try dedicated orders table first, fall back to store_documents
      let saved = false;
      try {
        await supabaseRequest("orders", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            ...newOrder,
            items: JSON.stringify(items),
          }),
        });
        saved = true;
      } catch {
        // Fallback to store_documents
      }

      if (!saved) {
        const currentOrders = await getOrdersFromDocs();
        await saveOrdersToDocs([newOrder, ...currentOrders]);
      }

      return sendJson(res, { id, status: "pending" }, 201, NO_CACHE);
    }

    // GET /api/orders
    if (req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const id = url.searchParams.get("id");

      // 1. Admin listing all orders
      if (isAdmin(req) && !id) {
        try {
          const directRows = await supabaseRequest("orders?order=created_at.desc&limit=100", { method: "GET" });
          if (Array.isArray(directRows) && directRows.length > 0) {
            return sendJson(res, directRows, 200, NO_CACHE);
          }
        } catch {
          // Fallback to store_documents
        }
        const docOrders = await getOrdersFromDocs();
        return sendJson(res, docOrders, 200, NO_CACHE);
      }

      // 2. Customer polling single order
      if (id) {
        try {
          const directRows = await supabaseRequest(
            `orders?id=eq.${encodeURIComponent(id)}&select=id,status,created_at`,
            { method: "GET" }
          );
          if (directRows && directRows.length > 0) {
            return sendJson(res, directRows[0], 200, NO_CACHE);
          }
        } catch {
          // Fallback
        }

        const docOrders = await getOrdersFromDocs();
        const found = docOrders.find((o) => o.id === id);
        if (found) {
          return sendJson(res, { id: found.id, status: found.status, created_at: found.created_at }, 200, NO_CACHE);
        }

        return sendJson(res, { error: "Order not found" }, 404, NO_CACHE);
      }

      return sendJson(res, { error: "Missing order id" }, 400, NO_CACHE);
    }

    // PUT /api/orders — admin update order status
    if (req.method === "PUT") {
      if (!isAdmin(req)) return sendJson(res, { error: "Unauthorized" }, 401, NO_CACHE);
      const { id, status } = await readJson(req);
      if (!id || !["confirmed", "rejected"].includes(status)) {
        return sendJson(res, { error: "Invalid request" }, 400, NO_CACHE);
      }

      let updated = false;
      try {
        await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
        });
        updated = true;
      } catch {
        // Fallback
      }

      const docOrders = await getOrdersFromDocs();
      const updatedList = docOrders.map((o) =>
        o.id === id ? { ...o, status, updated_at: new Date().toISOString() } : o
      );
      await saveOrdersToDocs(updatedList);

      return sendJson(res, { id, status }, 200, NO_CACHE);
    }

    return sendJson(res, { error: "Method not allowed" }, 405, NO_CACHE);
  } catch (err) {
    return sendJson(res, { error: err.message || "Server error" }, 500, NO_CACHE);
  }
}
