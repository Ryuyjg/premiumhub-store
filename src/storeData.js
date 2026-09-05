export const logo = (text, bg, fg = "#fff") =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="32" fill="${bg}"/><text x="50%" y="48%" text-anchor="middle" font-family="Inter,Arial" font-size="46" font-weight="800" fill="${fg}">${text}</text><text x="50%" y="68%" text-anchor="middle" font-family="Inter,Arial" font-size="19" font-weight="600" fill="${fg}" opacity=".76">Premium Hub</text></svg>`)}`;

export function product(id, name, categoryId, description, features, image, featured, order, variations) {
  const builtVariations = variations.map(([name, price, originalPrice, inStock, stock], index) => {
    const quantity = stock ?? (inStock ? 10 : 0);
    return {
      id: `${id}-${index}`,
      name,
      price,
      originalPrice,
      stock: quantity,
      inStock: quantity > 0,
      sku: `${id.toUpperCase()}-${index + 1}`,
      order: index + 1,
    };
  });

  return {
    id,
    name,
    slug: id,
    categoryId,
    image,
    shortDescription: description,
    description,
    features,
    active: true,
    stock: builtVariations.reduce((sum, variation) => sum + variation.stock, 0),
    inStock: builtVariations.some((variation) => variation.inStock),
    featured,
    order,
    variations: builtVariations,
  };
}

export const seedData = {
  settings: {
    siteName: "Premium Hub",
    logoImage: "",
    tagline: "Premium Subscriptions. Better Prices.",
    whatsappNumber: "919876543210",
    whatsappGroupLink: "",
    offerTimerMinutes: "15",
    whatsappMessage: "Hello Premium Hub, I would like to place an order.",
    currency: "₹",
    contact: "support@premiumhub.local",
    footerText: "Digital subscriptions delivered fast through WhatsApp.",
    instagram: "https://instagram.com/premiumhub",
  },
  categories: [
    { id: "ott", name: "OTT Subscriptions", slug: "ott-subscriptions", description: "Netflix, Prime Video, JioHotstar, SonyLIV and ZEE5 plans.", active: true, featured: true, order: 1, image: logo("OTT", "#111827") },
    { id: "ai", name: "AI Tools", slug: "ai-tools", description: "ChatGPT, Claude and useful AI products.", active: true, featured: true, order: 2, image: logo("AI", "#0f766e") },
    { id: "music", name: "Music", slug: "music", description: "Spotify and other music subscriptions.", active: true, featured: true, order: 3, image: logo("♪", "#b91c1c") },
    { id: "editing", name: "Editing Tools", slug: "editing-tools", description: "CapCut and creative software offers.", active: true, featured: true, order: 4, image: logo("EDIT", "#4338ca") },
  ],
  products: [
    product("netflix", "Netflix Premium", "ott", "4K streaming with premium account support.", ["4K UHD streaming", "Multi-device support", "Fast activation"], logo("N", "#e50914"), true, 1, [["1 Month", 399, 499, true], ["3 Months", 999, 1199, true], ["6 Months", 1799, 2199, false]]),
    product("prime-video", "Prime Video", "ott", "Prime entertainment plan for movies and series.", ["HD streaming", "Regional content", "Quick setup"], logo("prime", "#00a8e1"), true, 2, [["1 Month", 199, 299, true], ["3 Months", 499, 699, true]]),
    product("jiohotstar", "JioHotstar", "ott", "Sports, movies and premium shows in one plan.", ["Live sports", "HD content", "Mobile friendly"], logo("JH", "#2563eb"), true, 3, [["1 Month", 149, 199, true], ["1 Year", 899, 1199, true]]),
    product("sonyliv", "SonyLIV", "ott", "SonyLIV premium subscription access.", ["Sports and originals", "HD streaming"], logo("SL", "#581c87"), false, 4, [["1 Month", 179, 249, true], ["6 Months", 699, 899, false]]),
    product("zee5", "ZEE5", "ott", "Premium ZEE5 entertainment plans.", ["Movies", "Shows", "Family content"], logo("Z5", "#7c2d12"), false, 5, [["1 Month", 99, 149, true], ["1 Year", 599, 899, true]]),
    product("youtube-premium", "YouTube Premium", "music", "Ad-free YouTube and background play.", ["No ads", "Background play", "YouTube Music"], logo("YT", "#dc2626"), true, 6, [["1 Month", 129, 159, true], ["3 Months", 349, 449, true]]),
    product("spotify", "Spotify Premium", "music", "Premium music subscription plans.", ["Ad-free music", "Offline listening", "High quality audio"], logo("SP", "#16a34a"), true, 7, [["1 Month", 99, 129, true], ["3 Months", 249, 329, true], ["1 Year", 699, 999, true]]),
    product("chatgpt", "ChatGPT", "ai", "AI assistant plans for productivity.", ["Writing help", "Research support", "Coding assistance"], logo("GPT", "#111827"), true, 8, [["1 Month", 999, 1299, true], ["3 Months", 2699, 3299, true]]),
    product("claude", "Claude", "ai", "Claude AI subscription access.", ["Long context", "Writing support", "Reasoning"], logo("CL", "#7c3aed"), false, 9, [["1 Month", 949, 1199, true]]),
    product("capcut", "CapCut Pro", "editing", "Editing tools for creators.", ["Premium effects", "Templates", "Export tools"], logo("CC", "#0891b2"), true, 10, [["1 Month", 299, 399, true], ["1 Year", 1999, 2499, true]]),
  ],
  offers: [
    { id: "offer-spotify-year", title: "Spotify Yearly Deal", productId: "spotify", variationId: "spotify-2", price: 649, originalPrice: 999, description: "Limited yearly price for music lovers.", startDate: "", endDate: "", active: true, image: logo("DEAL", "#166534") },
    { id: "offer-prime-3m", title: "Prime Video 3 Month Offer", productId: "prime-video", variationId: "prime-video-1", price: 449, originalPrice: 699, description: "Save on a three month entertainment plan.", startDate: "", endDate: "", active: true, image: "" },
  ],
};
