/**
 * Unified price extraction helper.
 * Handles all field name variants from the catalog/backend:
 *   priceUsdt → priceUsd → price_usd → price
 * Returns a safe number (fallback 0).
 */
export function getPriceUsd(obj) {
    if (!obj) return 0;
    const raw = obj.price_usd ?? obj.priceUsd ?? obj.price ?? 0;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
