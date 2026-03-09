/**
 * Parses the `customer_notes` string from web_orders into structured data.
 * Eliminates duplicated regex matching across KitchenView, InboxView, etc.
 *
 * @param {string} notes - Raw customer_notes from a web order
 * @returns {{ deliveryType: string, tableNumber: string|null, cleanNotes: string, gpsLink: string|null }}
 */
export function parseOrderNotes(notes) {
    if (!notes) return { deliveryType: "UNKNOWN", tableNumber: null, cleanNotes: "", gpsLink: null };

    let deliveryType = "LLEVAR"; // default fallback
    let cleanNotes = notes;
    let tableNumber = null;

    // 1. Detect delivery type tags
    const mesaMatch = cleanNotes.match(/\[MESA (.*?)\]/);
    if (mesaMatch) {
        deliveryType = "MESA_QR";
        tableNumber = mesaMatch[1];
        cleanNotes = cleanNotes.replace(mesaMatch[0], "").trim();
    } else if (cleanNotes.includes("[EN EL LOCAL]")) {
        deliveryType = "LOCAL";
        cleanNotes = cleanNotes.replace("[EN EL LOCAL]", "").trim();
    } else if (cleanNotes.includes("[PARA LLEVAR]")) {
        deliveryType = "LLEVAR";
        cleanNotes = cleanNotes.replace("[PARA LLEVAR]", "").trim();
    } else if (cleanNotes.includes("[DELIVERY]")) {
        deliveryType = "DELIVERY";
        cleanNotes = cleanNotes.replace("[DELIVERY]", "").trim();
    }

    // 2. Strip "Dir: ..." prefix from delivery address (already embedded in notes)
    cleanNotes = cleanNotes.replace(/^Dir:\s*/i, "").trim();

    // 3. Strip "- Notas: " prefix
    cleanNotes = cleanNotes.replace(/^-\s*Notas:\s*/i, "").trim();

    // 4. Extract GPS link if present
    let gpsLink = null;
    const urlRegex = /(https:\/\/maps\.google\.com\/\?q=[^\s]+)/i;
    const urlMatch = cleanNotes.match(urlRegex);
    if (urlMatch) {
        gpsLink = urlMatch[1];
        cleanNotes = cleanNotes
            .replace(gpsLink, "")
            .replace(/Ubicacion GPS:/gi, "")
            .replace(/\(Precision aprox: [0-9]+m\)/gi, "")
            .replace(/\(Por favor anade referencias del lugar\)/gi, "")
            .replace(/^\s*[\r\n]/gm, "")
            .trim();
    }

    return { deliveryType, tableNumber, cleanNotes, gpsLink };
}
