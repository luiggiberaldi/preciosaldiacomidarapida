import { formatBs } from "../../utils/calculatorUtils";

/**
 * Builds a WhatsApp-ready receipt URL for sharing a sale.
 * @param {object} receipt - The sale/receipt object
 * @returns {string} WhatsApp URL with pre-filled message
 */
export function buildReceiptWhatsAppUrl(receipt) {
  const r = receipt;
  // Format dates consistently
  const dateObj = new Date(r.timestamp);
  const dateStr = dateObj.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const fecha = `${dateStr} · ${timeStr}`;

  const saleNum = String(r.saleNumber || 0).padStart(4, "0");

  // Items
  const itemsLines = (r.items ?? [])
    .map((item) => {
      const qty = item.isWeight
        ? `${parseFloat(item.qty).toFixed(3)}kg`
        : `${item.qty}x`;
      const nameWithSize = item.size ? `${item.name} [${item.size}]` : item.name;
      const subUsd = (item.priceUsd * item.qty).toFixed(2);
      const subBs = formatBs(item.priceUsd * item.qty * r.rate);
      const extrasLine = item.selectedExtras?.length > 0 ? `\n   + ${item.selectedExtras.map(e => e.name).join(", ")}` : "";
      const noteLine = item.note ? `\n   💬 ${item.note}` : "";
      return `• ${qty} ${nameWithSize} — $${subUsd} · ${subBs} Bs${extrasLine}${noteLine}`;
    })
    .join("\n");

  // Totales
  const totalBs = r.totalBs ?? r.totalUsd * r.rate;
  const totalUsdStr = `$${parseFloat(r.totalUsd).toFixed(2)}`;
  const totalBsStr = `${formatBs(totalBs)} Bs`;

  // Pagos
  const paymentsStr = (r.payments ?? [])
    .map((p) => p.methodLabel)
    .join(", ");

  const clienteLine =
    r.customerName && r.customerName !== "Consumidor Final"
      ? `📋 Cliente: ${r.customerName}`
      : null;

  // Construcción del texto
  const textBlocks = [
    `🍔 *Pedido #${saleNum}*`,
    clienteLine,
    `📅 ${fecha}`,
    ``,
    itemsLines,
    ``,
    `💵 Total: ${totalUsdStr} · ${totalBsStr}`,
    `🏦 Tasa BCV: ${formatBs(r.rate)} Bs/$`,
    paymentsStr ? `💳 Pago: ${paymentsStr}` : null,
  ];

  const text = textBlocks.filter((line) => line !== null).join("\n");

  const formatVzlaPhone = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("58")) return digits;
    if (digits.startsWith("0")) return "58" + digits.slice(1);
    return "58" + digits;
  };

  const phone = formatVzlaPhone(r.customerPhone);
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}
