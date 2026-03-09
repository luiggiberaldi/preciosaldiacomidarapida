/**
 * Unified price extraction helper for the POS app.
 * Handles all field name variants from products/sizes/extras:
 *   priceUsdt -> priceUsd -> price_usd -> price
 * Returns a safe number (fallback 0).
 */
export function getPriceUsd(obj) {
    if (!obj) return 0;
    const raw = obj.priceUsdt ?? obj.priceUsd ?? obj.price_usd ?? obj.price ?? 0;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
