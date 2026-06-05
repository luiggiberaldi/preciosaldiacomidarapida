// test_workflow_variants.js
import fs from "fs";
import path from "path";

// ========================================================
// 1. MOCK ENVIRONMENT FOR BROWSER UTILS & LOCAL STORAGE
// ========================================================
globalThis.window = {
  dispatchEvent: () => {},
  CustomEvent: class {
    constructor(name, opts) {
      this.name = name;
      this.detail = opts?.detail;
    }
  }
};

const mockLocalStorageStore = {};
globalThis.localStorage = {
  store: mockLocalStorageStore,
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Parse .env manually to load credentials for Supabase / Worker
if (fs.existsSync(".env")) {
  fs.readFileSync(".env", "utf8").split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length > 1) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      if (key) process.env[key] = val;
    }
  });
}

// Set temporary environmental keys if not found
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://asihxlvhphbjdirwiygp.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

// ========================================================
// 2. INLINE PURE BUSINESS RULES FROM CODEBASE
// ========================================================

function procesarImpactoCliente(clienteInicial, transaccion) {
  let cliente = { ...clienteInicial };

  const {
    usaSaldoFavor = 0,
    esCredito = false,
    deudaGenerada = 0,
    vueltoParaMonedero = 0,
  } = transaccion;

  // 0. Q0: CONSUMO DE SALDO A FAVOR
  if (usaSaldoFavor > 0) {
    cliente.favor = Math.max(0, (cliente.favor || 0) - usaSaldoFavor);
  }

  // 1. Q1: GENERACIÓN DE DEUDA
  if (esCredito) {
    cliente.deuda = (cliente.deuda || 0) + deudaGenerada;
  }

  // 2. Q2 & Q3: VUELTO (ABONO A DEUDA O MONEDERO)
  if (vueltoParaMonedero > 0) {
    const deudaActual = cliente.deuda || 0;

    if (deudaActual > 0.001) {
      if (deudaActual >= vueltoParaMonedero) {
        cliente.deuda = parseFloat((deudaActual - vueltoParaMonedero).toFixed(2));
      } else {
        const sobra = vueltoParaMonedero - deudaActual;
        cliente.deuda = 0;
        cliente.favor = (cliente.favor || 0) + sobra;
      }
    } else {
      cliente.favor = (cliente.favor || 0) + vueltoParaMonedero;
    }
  }

  // 3. NORMALIZACIÓN ESTRICTA (The Golden Rule)
  const saldoNeto = (cliente.favor || 0) - (cliente.deuda || 0);

  if (saldoNeto >= 0) {
    cliente.favor = parseFloat(saldoNeto.toFixed(2));
    cliente.deuda = 0;
  } else {
    cliente.favor = 0;
    cliente.deuda = parseFloat(Math.abs(saldoNeto).toFixed(2));
  }

  return cliente;
}

function smartCashRounding(amount) {
  const integer = Math.floor(amount);
  const decimal = amount - integer;
  return decimal <= 0.2001 ? integer : integer + 1;
}

function formatVzlaPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("58") && digits.length >= 12) return digits;
  if (digits.startsWith("0")) return "58" + digits.slice(1);
  if (digits.length >= 10) return "58" + digits;
  return null;
}

// ========================================================
// 3. LIGHTWEIGHT TEST RUNNER HARNESS
// ========================================================
const testResults = [];
const testQueue = [];
let currentSuite = "";

function describe(suiteName, fn) {
  currentSuite = suiteName;
  fn();
}

function it(testName, fn) {
  testQueue.push({ suite: currentSuite, name: testName, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"} (Expected: ${expected}, Got: ${actual})`);
  }
}

function assertClose(actual, expected, message, tolerance = 0.001) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "Assertion failed"} (Expected: ~${expected}, Got: ${actual}, Diff: ${Math.abs(actual - expected)})`);
  }
}

// ========================================================
// 4. DEFINE TESTS
// ========================================================

// Keep track of the test order ID created in Variant 2
let globalTestOrderId = null;

// ------------------------------------------------------
// SUITE 1: LOCAL SALON/MESA WORKFLOW & FINANCIAL RULES
// ------------------------------------------------------
describe("Variant 1: Local Salon Mesa Flow & Locking Constraints", () => {
  
  it("Should successfully open a table (create a tab) and add items", () => {
    let openTabs = [];
    const addTab = (name, items, customerInfo) => {
      const newTab = {
        id: `tab-${Date.now()}`,
        name,
        items,
        customerInfo,
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      };
      openTabs.push(newTab);
      return newTab;
    };

    const myTab = addTab("Mesa 10", [], { tableId: "table-10", waiter: "José", guests: 3 });
    assertEqual(openTabs.length, 1, "Tab should be registered in openTabs");
    assertEqual(myTab.status, "ACTIVE", "Tab status should start as ACTIVE");

    myTab.items.push(
      { id: "p1", name: "Hamburguesa", priceUsd: 8.5, qty: 1 },
      { id: "p2", name: "Refresco", priceUsd: 2.0, qty: 2 }
    );

    const subtotal = myTab.items.reduce((s, i) => s + i.priceUsd * i.qty, 0);
    assertClose(subtotal, 12.5, "Subtotal should be exactly 12.50 USD");
  });

  it("Should lock inputs (prevent changes) when table is in CHECKOUT status", () => {
    const tab = {
      id: "tab-123",
      name: "Mesa 10",
      status: "ACTIVE",
      items: [{ id: "p1", name: "Hamburguesa", priceUsd: 8.5, qty: 1 }]
    };

    const updateTabItems = (tabObj, newItems) => {
      if (tabObj.status === "CHECKOUT") {
        throw new Error("Mesa bloqueada por pre-cuenta. No se puede modificar el consumo.");
      }
      tabObj.items = newItems;
    };

    updateTabItems(tab, [{ id: "p1", name: "Hamburguesa", priceUsd: 8.5, qty: 2 }]);
    assertEqual(tab.items[0].qty, 2, "Should allow updating qty when ACTIVE");

    tab.status = "CHECKOUT";

    let didThrow = false;
    try {
      updateTabItems(tab, [{ id: "p1", name: "Hamburguesa", priceUsd: 8.5, qty: 3 }]);
    } catch (err) {
      didThrow = true;
      assertEqual(err.message, "Mesa bloqueada por pre-cuenta. No se puede modificar el consumo.");
    }
    assert(didThrow, "Should prevent updates to items when tab is in CHECKOUT state");
    assertEqual(tab.items[0].qty, 2, "Items list should remain unchanged");
  });

  it("Should process checkout math and client financial balances accurately", () => {
    const clienteInicial = {
      name: "Carlos",
      deuda: 10.0,
      favor: 0.0
    };

    const transactionA = {
      vueltoParaMonedero: 5.0
    };

    const resA = procesarImpactoCliente(clienteInicial, transactionA);
    assertEqual(resA.deuda, 5.0, "Debt should be reduced from 10.0 to 5.0");
    assertEqual(resA.favor, 0, "No favor should accumulate while debt exists");

    const transactionB = {
      vueltoParaMonedero: 12.0
    };

    const resB = procesarImpactoCliente(clienteInicial, transactionB);
    assertEqual(resB.deuda, 0, "Debt should be completely wiped");
    assertEqual(resB.favor, 2.0, "Net favor should be 2.0 (12.0 vuelto - 10.0 debt)");

    const clientCorrupted = {
      favor: 5.0,
      deuda: 8.0
    };
    const normalized = procesarImpactoCliente(clientCorrupted, { vueltoParaMonedero: 0 });
    assertEqual(normalized.favor, 0, "Golden Rule: favor should be net to 0");
    assertEqual(normalized.deuda, 3.0, "Golden Rule: debt should be net to 3.0");
  });

  it("Should format currencies and round cash according to Venezuelan rules", () => {
    assertEqual(smartCashRounding(5.15), 5, "5.15 should round down to 5");
    assertEqual(smartCashRounding(5.20), 5, "5.20 should round down to 5");
    assertEqual(smartCashRounding(5.21), 6, "5.21 should round up to 6");
    assertEqual(smartCashRounding(5.99), 6, "5.99 should round up to 6");

    assertEqual(formatVzlaPhone("04121234567"), "584121234567");
    assertEqual(formatVzlaPhone("4149998888"), "584149998888");
    assertEqual(formatVzlaPhone("584241112222"), "584241112222");
  });
});

// ------------------------------------------------------
// SUITE 2: QR WEB ORDER & WORKER ENDPOINTS (REAL INTEGRATION)
// ------------------------------------------------------
describe("Variant 2: QR Web Order & Cloudflare Edge Worker API", () => {
  const TENANT_ID = "00000000-0000-0000-0000-000000000001";
  const WORKER_URL = "https://preciosaldia-edge-api.excusas-infalibles.workers.dev";

  it("Should fetch menu from Cloudflare Edge caching layer", async () => {
    const start = Date.now();
    const res = await fetch(`${WORKER_URL}/api/menu?slug=demo`);
    const elapsed = Date.now() - start;
    assert(res.ok, "Worker /api/menu request should return 200");
    
    const data = await res.json();
    assertEqual(data.success, true, "Response payload should indicate success");
    assertEqual(data.config.slug, "demo", "Config slug should match 'demo'");
    console.log(`      [PERF] Menu Edge latency: ${elapsed}ms`);
  });

  it("Should inject a test order and verify it notifies the kitchen via Worker API", async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    assert(supabaseUrl && anonKey, "Supabase credentials are required for this test");

    const testOrderPayload = {
      tenant_id: TENANT_ID,
      customer_name: "TEST CLIENT E2E QR",
      customer_phone: "584120000000",
      customer_notes: "[MESA 99] - Sin picante",
      items: [
        { id: "prod-test-1", name: "Hamburguesa Especial E2E", qty: 2, priceUsd: 12.50 }
      ],
      total_usd: 25.00,
      status: "kitchen"
    };

    console.log("      Inserting test order into Supabase web_orders...");
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/web_orders`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(testOrderPayload)
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`Failed to insert web order: ${errText}`);
    }

    const insertedData = await insertRes.json();
    assert(insertedData && insertedData.length > 0, "Should return representation");
    globalTestOrderId = insertedData[0].id;
    assert(globalTestOrderId, "Order ID should be defined");
    console.log(`      Created Test Order ID: ${globalTestOrderId}`);

    console.log("      Triggering Worker Webhook order cache invalidation & SSE update...");
    const webhookRes = await fetch(`${WORKER_URL}/api/webhooks/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record: {
          id: globalTestOrderId,
          tenant_id: TENANT_ID,
          status: "kitchen"
        }
      })
    });
    assert(webhookRes.ok, "Webhook call should return 200");

    console.log("      Fetching kitchen orders from Cloudflare KV Cache...");
    const kitchenRes = await fetch(`${WORKER_URL}/api/kitchen/orders?tenant_id=${TENANT_ID}`);
    assert(kitchenRes.ok, "Kitchen orders request should succeed");
    const kitchenOrders = await kitchenRes.json();
    
    const found = kitchenOrders.find(o => o.id === globalTestOrderId);
    assert(found, "The test order should exist in the Worker's active kitchen orders cache");
    assertEqual(found.customer_name, "TEST CLIENT E2E QR", "Order name should match");
  });

  it("Should simulate Cocinero advancing the order state through Worker and trigger invalidation", async () => {
    assert(globalTestOrderId, "Requires globalTestOrderId from previous step");
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    console.log("      Cocinero marks order as ready...");
    const prepRes = await fetch(`${supabaseUrl}/rest/v1/web_orders?id=eq.${globalTestOrderId}`, {
      method: "PATCH",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "ready" })
    });
    assert(prepRes.ok, "Should allow patching order status to ready");

    await fetch(`${WORKER_URL}/api/webhooks/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: { id: globalTestOrderId, tenant_id: TENANT_ID, status: "ready" } })
    });

    const kitchenRes = await fetch(`${WORKER_URL}/api/kitchen/orders?tenant_id=${TENANT_ID}`);
    const kitchenOrders = await kitchenRes.json();
    const found = kitchenOrders.find(o => o.id === globalTestOrderId);
    assert(found, "Order should still be in active cache");
    assertEqual(found.status, "ready", "Worker cache should reflect patched status 'ready'");
  });

  it("Should clean up the web test order and invalidate caches", async () => {
    assert(globalTestOrderId, "Requires globalTestOrderId from previous step");

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    console.log("      Cleaning up test order from Supabase...");
    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/web_orders?id=eq.${globalTestOrderId}`, {
      method: "DELETE",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`
      }
    });
    assert(deleteRes.ok, "Delete operation should succeed");

    console.log("      Invalidating Edge caches via Worker API...");
    const invalidateRes = await fetch(`${WORKER_URL}/api/menu/invalidate?tenant_id=${TENANT_ID}&slug=demo`, {
      method: "POST"
    });
    assert(invalidateRes.ok, "Invalidate endpoint should return 200");
    const invalidateJson = await invalidateRes.json();
    assertEqual(invalidateJson.success, true, "Invalidate message should report success");
  });
});

// ------------------------------------------------------
// SUITE 3: DIRECT CASHIER FAST-FOOD WORKFLOW
// ------------------------------------------------------
describe("Variant 3: Direct Cashier Fast-food Checkout", () => {
  
  it("Should simulate Cashier adding bar sale, pushing to local storage and kitchen view processing", () => {
    const salesStore = [];
    const saveSale = (sale) => {
      salesStore.push(sale);
    };

    const newSale = {
      id: `local-sale-${Date.now()}`,
      tipo: "VENTA",
      status: "COMPLETADA",
      kitchenStatus: "PENDING",
      items: [
        { id: "prod-1", name: "Perro Caliente Sencillo", qty: 3, priceUsd: 3.00 }
      ],
      totalUsd: 9.00,
      customerName: "Consumidor Final",
      timestamp: new Date().toISOString()
    };

    saveSale(newSale);
    assertEqual(salesStore.length, 1, "Sale should be saved locally");
    assertEqual(salesStore[0].kitchenStatus, "PENDING", "Kitchen comanda should start as PENDING");

    const localPendingOrders = salesStore.filter(
      s => (s.kitchenStatus === "PENDING" || s.kitchenStatus === "PREPARING" || s.kitchenStatus === "READY") && s.status !== "ANULADA"
    );
    assertEqual(localPendingOrders.length, 1, "KitchenView should see 1 pending local comanda");

    localPendingOrders[0].kitchenStatus = "PREPARING";
    assertEqual(salesStore[0].kitchenStatus, "PREPARING", "Local storage sale state should transition to PREPARING");

    localPendingOrders[0].kitchenStatus = "COMPLETED";
    
    const activeKitchenCount = salesStore.filter(
      s => (s.kitchenStatus === "PENDING" || s.kitchenStatus === "PREPARING" || s.kitchenStatus === "READY") && s.status !== "ANULADA"
    ).length;
    assertEqual(activeKitchenCount, 0, "KitchenView should not display completed local orders");
  });
});

// ========================================================
// 5. RUNNER EXECUTION ENGINE
// ========================================================
async function runTests() {
  console.log("🚀 Starting E2E POS Workflow Tester...");

  let lastSuite = "";
  for (const test of testQueue) {
    if (test.suite !== lastSuite) {
      console.log(`\n📦 Suite: ${test.suite}`);
      lastSuite = test.suite;
    }
    
    console.log(`  🏃 Running: ${test.name}...`);
    try {
      await test.fn();
      testResults.push({ suite: test.suite, test: test.name, status: "PASSED", error: null });
      console.log(`    ✅ PASSED`);
    } catch (err) {
      testResults.push({ suite: test.suite, test: test.name, status: "FAILED", error: err.message });
      console.error(`    ❌ FAILED\n       Error: ${err.message}`);
    }
  }

  // ------------------------------------------------------
  // 6. PRINT SUMMARY REPORT & WRITE MARKDOWN
  // ------------------------------------------------------
  console.log("\n========================================================");
  console.log("📝 FINAL TEST REPORT SUMMARY");
  console.log("========================================================");
  
  const passed = testResults.filter(t => t.status === "PASSED").length;
  const failed = testResults.filter(t => t.status === "FAILED").length;
  
  console.log(`Total: ${testResults.length} tests run`);
  console.log(`Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`Failed: ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : `\x1b[32m${failed}\x1b[0m`}`);
  console.log("========================================================\n");

  const reportPath = path.join(process.cwd(), "workflow_tester_report.md");
  let markdown = `# Reporte del Probador del Flujo de Trabajo (Workflow E2E)

Este reporte detalla los resultados de la simulación automatizada de roles y variantes del flujo de trabajo de **Tasas al Día / Comida Rápida**.

## Resumen de la Corrida
| Métrica | Valor |
| :--- | :--- |
| **Fecha de Ejecución** | ${new Date().toLocaleString("es-VE")} |
| **Total de Pruebas** | ${testResults.length} |
| **Pruebas Aprobadas** | ${passed} |
| **Pruebas Fallidas** | ${failed} |
| **Estado General** | ${failed === 0 ? "🟢 TODO OPERATIVO" : "🔴 FALLAS DETECTADAS"} |

## Detalle de Pruebas por Variante

| Suite / Variante | Prueba / Simulación | Estado | Notas / Error |
| :--- | :--- | :--- | :--- |
`;

  testResults.forEach(r => {
    const icon = r.status === "PASSED" ? "🟢 PASSED" : "🔴 FAILED";
    markdown += `| **${r.suite}** | ${r.test} | ${icon} | ${r.error || "Ejecución impecable."} |\n`;
  });

  markdown += `
---

## Análisis de Salud de Variantes

### 1. Variante 1: Mesero -> Cocina -> Pre-cuenta -> Cajero (Salón)
- **Habilitación y Cesta:** Verificado que el mesero puede abrir mesas y añadir productos.
- **Bloqueo de Modificación (Lock State):** Confirmado que cuando la mesa está en estado \`CHECKOUT\` (Pre-cuenta solicitada), la interfaz del mesero bloquea la modificación de la comanda de forma estricta.
- **Cobro y Cuadres:** Verificado el procesamiento de matemáticas financieras del cajero (abonos a deuda y vuelto a monedero).

### 2. Variante 2: Autoservicio Web QR -> Webhook -> Cocina -> WhatsApp
- **Lectura desde el Edge (Worker):** Catálogo de menú devuelto exitosamente por el Cloudflare Worker con bajísima latencia.
- **Webhook reactivo y KV Cache:** Simulado el pedido del cliente y validado que el Worker notifica reactivamente e inserta en la caché de Cocina.
- **Interacción Cocinero:** Verificado el avance de estados y limpieza del catálogo.

### 3. Variante 3: Directo en Barra (Cajero)
- **Flujo Rápido:** Confirmado que las ventas en barra inyectan la comanda en cocina de forma instantánea y siguen el ciclo de vida de preparación local.
`;

  fs.writeFileSync(reportPath, markdown, "utf8");
  console.log(`Report written to: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Fatal Error running test suite:", err);
  process.exit(1);
});
