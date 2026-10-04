export const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
export const stockNumber = (item) => Number(item?.stock ?? item?.stockQty ?? 0);
export const hasCustomStock = (item) => item?.stock !== undefined || item?.stockQty !== undefined;
export const stockLimit = (item) => hasCustomStock(item) ? Math.max(0, stockNumber(item)) : Infinity;
export const isAvailable = (item) => Boolean(item?.inStock) && (!hasCustomStock(item) || stockNumber(item) > 0);
export const stockText = (item) => isAvailable(item) ? (hasCustomStock(item) ? `${stockNumber(item)} in stock` : "In Stock") : "Stock Out";
export const availableVariations = (product) => product?.variations?.filter(isAvailable) || [];
export const hasAvailableVariation = (product) => availableVariations(product).length > 0;
export const lowestVariation = (product) => {
  const priced = (product?.variations || []).filter((variation) => variation.price !== "" && variation.price != null && Number.isFinite(Number(variation.price)));
  const available = priced.filter(isAvailable);
  return [...(available.length ? available : priced)].sort((a, b) => Number(a.price) - Number(b.price))[0];
};
export const whatsappUrl = (settings, message) => {
  const number = String(settings.whatsappNumber || "").replace(/\D/g, "");
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};
