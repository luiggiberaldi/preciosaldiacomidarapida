// worker/src/index.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle OPTIONS requests (CORS preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Tasa BCV Endpoint
      if (url.pathname === "/api/tasa" && request.method === "GET") {
        return await handleGetTasa(env);
      }

      // 2. Menu Endpoint (Config + Catalog)
      if (url.pathname === "/api/menu" && request.method === "GET") {
        const slug = url.searchParams.get("slug");
        if (!slug) {
          return errorResponse("Missing slug parameter", 400);
        }
        return await handleGetMenu(slug, env);
      }

      // 3. Invalidate Menu Cache
      if (url.pathname === "/api/menu/invalidate" && request.method === "POST") {
        const tenantId = url.searchParams.get("tenant_id");
        const slug = url.searchParams.get("slug");
        if (!tenantId && !slug) {
          return errorResponse("Missing tenant_id or slug parameter", 400);
        }
        return await handleInvalidateMenu(tenantId, slug, env);
      }

      // 4. Supabase Webhook for New Orders (web_orders via Supabase DB Webhook)
      if (url.pathname === "/api/webhooks/order" && request.method === "POST") {
        return await handleOrderWebhook(request, env);
      }

      // 4b. Local POS Order Webhook — triggered by POS client directly
      //     Notifies KitchenView via SSE when a local sale goes to kitchen
      if (url.pathname === "/api/webhooks/local-order" && request.method === "POST") {
        return await handleLocalOrderWebhook(request, env);
      }

      // 5. Kitchen Orders Cache Endpoint
      if (url.pathname === "/api/kitchen/orders" && request.method === "GET") {
        const tenantId = url.searchParams.get("tenant_id");
        if (!tenantId) {
          return errorResponse("Missing tenant_id parameter", 400);
        }
        return await handleGetKitchenOrders(tenantId, env);
      }

      // 6. SSE Real-time Notification Stream (Stateless SSE using KV timestamps)
      if (url.pathname === "/api/stream" && request.method === "GET") {
        const tenantId = url.searchParams.get("tenant_id");
        if (!tenantId) {
          return errorResponse("Missing tenant_id parameter", 400);
        }
        return handleSSEStream(tenantId, request, env);
      }

      return errorResponse("Not Found", 404);
    } catch (err) {
      console.error("Worker error:", err.message);
      return errorResponse(err.message || "Internal Server Error", 500);
    }
  }
};

// ─── HELPERS ──────────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    }
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ success: false, error: message }, status);
}

// Helper to query Supabase REST API directly
async function querySupabase(path, env, options = {}) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL or SUPABASE_KEY is not configured in Worker environment variables.");
  }

  const url = `${supabaseUrl}/rest/v1/${path}`;
  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase API error (${response.status}): ${text}`);
  }

  return await response.json();
}

// ─── ENDPOINT HANDLERS ────────────────────────────────────

// 1. Fetch and Cache BCV Rate
async function handleGetTasa(env) {
  const cacheKey = "bcv_rates_cache";
  
  // Try to read from KV first
  const cached = await env.PRECIOS_AL_DIA_KV.get(cacheKey);
  if (cached) {
    return jsonResponse(JSON.parse(cached));
  }

  // Fetch rates from primary (Ve Dolar API) and secondary (Google Apps Script) sources
  let bcvPrice = 0;
  let euroPrice = 0;
  
  try {
    const dolarApiData = await fetch("https://ve.dolarapi.com/v1/dolares/oficial").then(r => r.json()).catch(() => null);
    if (dolarApiData && dolarApiData.promedio) {
      bcvPrice = parseFloat(dolarApiData.promedio);
    }

    const euroApiData = await fetch("https://ve.dolarapi.com/v1/dolares/euro").then(r => r.json()).catch(() => null);
    if (euroApiData && euroApiData.promedio) {
      euroPrice = parseFloat(euroApiData.promedio);
    }
  } catch (e) {
    console.error("Failed fetching Ve Dolar API:", e.message);
  }

  // Fallback to Google Apps Script if Ve Dolar API fails
  if (!bcvPrice || !euroPrice) {
    try {
      const googleScriptUrl = "https://script.google.com/macros/s/AKfycbx0N47Hg6XebPBhgSLnfkaFyR4ez9_UWFTCS0mcb978i5r-iraxcM5svMJao2HMtrtiAA/exec?token=Lvbp1994";
      const privateData = await fetch(googleScriptUrl).then(r => r.json()).catch(() => null);
      if (privateData) {
        if (!bcvPrice && privateData.bcv) bcvPrice = parseFloat(privateData.bcv.price || privateData.bcv);
        if (!euroPrice && privateData.euro) euroPrice = parseFloat(privateData.euro.price || privateData.euro);
      }
    } catch (e) {
      console.error("Failed fetching Google Script Fallback:", e.message);
    }
  }

  // Final validation and defaults
  bcvPrice = bcvPrice || 36.5;
  euroPrice = euroPrice || 39.5;

  const result = {
    bcv: { price: bcvPrice, source: "BCV Oficial", change: 0 },
    euro: { price: euroPrice, source: "Euro BCV", change: 0 },
    lastUpdate: new Date().toISOString(),
  };

  // Cache in KV for 4 hours (14400 seconds)
  await env.PRECIOS_AL_DIA_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 14400 });

  return jsonResponse(result);
}

// 2. Fetch and Cache Menu (web_config + web_catalog)
async function handleGetMenu(slug, env) {
  const cacheKey = `menu_slug_${slug}`;

  // Try reading from KV cache
  const cached = await env.PRECIOS_AL_DIA_KV.get(cacheKey);
  if (cached) {
    return jsonResponse(JSON.parse(cached));
  }

  // 1. Fetch web_config from Supabase
  const configList = await querySupabase(`web_config?slug=eq.${slug}&select=*`, env);
  if (!configList || configList.length === 0) {
    return errorResponse("Business config not found", 404);
  }
  const config = configList[0];
  const tenantId = config.tenant_id;

  // 2. Fetch active catalog items from Supabase
  const catalog = await querySupabase(`web_catalog?tenant_id=eq.${tenantId}&is_available=eq.true&select=*&order=category.asc,name.asc`, env);

  const payload = {
    success: true,
    config,
    catalog: catalog || [],
  };

  // Cache in KV for 5 minutes (300 seconds)
  await env.PRECIOS_AL_DIA_KV.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 });
  // Also link tenant_id to slug mapping in KV for invalidation
  await env.PRECIOS_AL_DIA_KV.put(`tenant_slug_${tenantId}`, slug, { expirationTtl: 86400 });

  return jsonResponse(payload);
}

// 3. Invalidate Menu Cache manually (called from POS after save)
async function handleInvalidateMenu(tenantId, slug, env) {
  let activeSlug = slug;
  
  if (tenantId && !activeSlug) {
    activeSlug = await env.PRECIOS_AL_DIA_KV.get(`tenant_slug_${tenantId}`);
  }

  if (activeSlug) {
    await env.PRECIOS_AL_DIA_KV.delete(`menu_slug_${activeSlug}`);
  }

  if (tenantId) {
    // Also invalidate kitchen orders cache
    await env.PRECIOS_AL_DIA_KV.delete(`kitchen_orders_${tenantId}`);
    // Update timestamp for SSE stream
    await env.PRECIOS_AL_DIA_KV.put(`stream_ts_${tenantId}`, String(Date.now()));
  }

  return jsonResponse({ success: true, message: "Cache invalidated successfully" });
}

// 4. Handle Supabase Webhook for new orders (web_orders)
async function handleOrderWebhook(request, env) {
  const body = await request.json();
  // Supabase webhooks send details in body.record
  const record = body.record;
  const tenantId = record?.tenant_id || body.tenant_id;

  if (tenantId) {
    // 1. Update timestamp for SSE stream to notify KitchenView
    await env.PRECIOS_AL_DIA_KV.put(`stream_ts_${tenantId}`, String(Date.now()));

    // 2. Fetch active orders from Supabase and cache it
    try {
      // Query pending/preparing/ready web_orders
      const activeOrders = await querySupabase(`web_orders?tenant_id=eq.${tenantId}&status=in.(kitchen,ready)&select=*&order=created_at.asc`, env);
      await env.PRECIOS_AL_DIA_KV.put(`kitchen_orders_${tenantId}`, JSON.stringify(activeOrders || []), { expirationTtl: 300 });
    } catch (e) {
      console.error("Error fetching web orders on webhook:", e.message);
    }
  }

  return jsonResponse({ success: true, received: true });
}

// 4b. Handle Local POS Order Webhook
//     Called by the POS client when a sale is sent to kitchen.
//     Only updates the SSE stream timestamp — no DB writes.
async function handleLocalOrderWebhook(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const tenantId = body.tenant_id;
  if (!tenantId) {
    return errorResponse("Missing tenant_id", 400);
  }

  // Bump the SSE stream timestamp so KitchenView reloads
  await env.PRECIOS_AL_DIA_KV.put(`stream_ts_${tenantId}`, String(Date.now()));

  return jsonResponse({ success: true, notified: true });
}

// 5. Get Kitchen Orders from Cache
async function handleGetKitchenOrders(tenantId, env) {
  const cacheKey = `kitchen_orders_${tenantId}`;

  // Try reading from KV
  const cached = await env.PRECIOS_AL_DIA_KV.get(cacheKey);
  if (cached) {
    return jsonResponse(JSON.parse(cached));
  }

  // Fetch from Supabase
  const activeOrders = await querySupabase(`web_orders?tenant_id=eq.${tenantId}&status=in.(kitchen,ready)&select=*&order=created_at.asc`, env);
  
  // Cache in KV for 5 minutes
  await env.PRECIOS_AL_DIA_KV.put(cacheKey, JSON.stringify(activeOrders || []), { expirationTtl: 300 });

  return jsonResponse(activeOrders || []);
}

// 6. SSE Real-time Notification Stream (Stateless SSE using KV timestamps)
function handleSSEStream(tenantId, request, env) {
  let lastCheckedTs = String(Date.now());
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send handshake
      controller.enqueue(encoder.encode("retry: 10000\n\n"));
      controller.enqueue(encoder.encode("data: connected\n\n"));

      // Set up polling loop to check KV timestamp change
      const intervalId = setInterval(async () => {
        try {
          const currentTs = await env.PRECIOS_AL_DIA_KV.get(`stream_ts_${tenantId}`);
          if (currentTs && currentTs !== lastCheckedTs) {
            lastCheckedTs = currentTs;
            controller.enqueue(encoder.encode("event: new_order\ndata: update\n\n"));
          }
        } catch (e) {
          console.error("SSE stream check error:", e.message);
        }
      }, 3000);

      // Clean up on stream end
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      ...corsHeaders,
    }
  });
}
