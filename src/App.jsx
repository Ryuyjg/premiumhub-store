import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORE_KEY = "premium-hub-store-v1";
const CART_KEY = "premium-hub-cart-v1";
const ADMIN_KEY = "premium-hub-admin";

const logo = (text, bg, fg = "#fff") =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="32" fill="${bg}"/><text x="50%" y="48%" text-anchor="middle" font-family="Inter,Arial" font-size="46" font-weight="800" fill="${fg}">${text}</text><text x="50%" y="68%" text-anchor="middle" font-family="Inter,Arial" font-size="19" font-weight="600" fill="${fg}" opacity=".76">Premium Hub</text></svg>`)}`;

const seedData = {
  settings: {
    siteName: "Premium Hub",
    tagline: "Premium Subscriptions. Better Prices.",
    whatsappNumber: "919876543210",
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

function product(id, name, categoryId, description, features, image, featured, order, variations) {
  return {
    id, name, slug: id, categoryId, image, shortDescription: description, description, features,
    active: true, inStock: true, featured, order,
    variations: variations.map(([name, price, originalPrice, inStock], index) => ({
      id: `${id}-${index}`, name, price, originalPrice, inStock, sku: `${id.toUpperCase()}-${index + 1}`, order: index + 1,
    })),
  };
}

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (value, currency) => `${currency}${Number(value || 0).toLocaleString("en-IN")}`;

function loadStore() {
  const saved = localStorage.getItem(STORE_KEY);
  return saved ? JSON.parse(saved) : seedData;
}

function App() {
  const [store, setStore] = useState(loadStore);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem(CART_KEY) || "[]"));
  const [route, setRoute] = useState(location.hash.replace("#", "") || "/");
  const [adminAuthed, setAdminAuthed] = useState(localStorage.getItem(ADMIN_KEY) === "yes");
  const [notice, setNotice] = useState("");

  useEffect(() => localStorage.setItem(STORE_KEY, JSON.stringify(store)), [store]);
  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace("#", "") || "/");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const ctx = useMemo(() => buildContext(store), [store]);
  const cartLines = useMemo(() => hydrateCart(cart, ctx), [cart, ctx]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const navigate = (path) => { location.hash = path; setRoute(path); scrollTo({ top: 0, behavior: "smooth" }); };
  const updateStore = (next) => setStore(typeof next === "function" ? next(store) : next);
  const addToCart = (productId, variationId, quantity = 1) => {
    const product = ctx.productById[productId];
    const variation = product?.variations.find((item) => item.id === variationId);
    if (!product?.active || !product?.inStock || !variation?.inStock) return false;
    setCart((items) => {
      const found = items.find((item) => item.productId === productId && item.variationId === variationId);
      if (found) return items.map((item) => item === found ? { ...item, quantity: item.quantity + quantity } : item);
      return [...items, { productId, variationId, quantity }];
    });
    setNotice(`${product.name} (${variation.name}) added to cart`);
    return true;
  };

  const props = { store, ctx, cartLines, cart, setCart, addToCart, navigate, updateStore, adminAuthed, setAdminAuthed };
  return (
    <div>
      <Header settings={store.settings} cartCount={cartCount} navigate={navigate} />
      {notice && <div className="toast" role="status">{notice}</div>}
      <main>
        {route === "/" && <Home {...props} />}
        {route.startsWith("/products") && <Products {...props} slug={route.split("/")[2]} />}
        {route.startsWith("/categories") && <Categories {...props} slug={route.split("/")[2]} />}
        {route === "/offers" && <Offers {...props} />}
        {route === "/cart" && <Cart {...props} />}
        {route.startsWith("/admin") && <Admin {...props} />}
      </main>
      {!route.startsWith("/admin") && <Footer settings={store.settings} />}
    </div>
  );
}

function buildContext(store) {
  const now = new Date();
  const categories = [...store.categories].filter((c) => c.active).sort((a, b) => a.order - b.order);
  const products = [...store.products].filter((p) => p.active && categories.some((c) => c.id === p.categoryId)).sort((a, b) => a.order - b.order);
  const activeOffers = store.offers.filter((offer) => offer.active && (!offer.startDate || new Date(offer.startDate) <= now) && (!offer.endDate || new Date(offer.endDate) >= now));
  return {
    categories, products, activeOffers,
    categoryById: Object.fromEntries(store.categories.map((c) => [c.id, c])),
    productById: Object.fromEntries(store.products.map((p) => [p.id, p])),
  };
}

function hydrateCart(cart, ctx) {
  return cart.map((item) => {
    const product = ctx.productById[item.productId];
    const variation = product?.variations.find((v) => v.id === item.variationId);
    if (!product || !variation) return null;
    return { ...item, product, variation, lineTotal: variation.price * item.quantity, purchasable: product.active && product.inStock && variation.inStock };
  }).filter(Boolean);
}

function Header({ settings, cartCount, navigate }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate("/")}>
        <span className="brand-mark">PH</span><span>{settings.siteName}</span>
      </button>
      <nav>
        {["Home", "Categories", "Offers", "Products"].map((label) => <button key={label} onClick={() => navigate(label === "Home" ? "/" : `/${label.toLowerCase()}`)}>{label}</button>)}
        <button className="cart-link" onClick={() => navigate("/cart")}>Cart <b>{cartCount}</b></button>
      </nav>
    </header>
  );
}

function Home({ store, ctx, addToCart, navigate }) {
  const featured = ctx.products.filter((p) => p.featured).slice(0, 6);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Digital subscription store</p>
          <h1>{store.settings.tagline}</h1>
          <p>Browse trusted OTT, AI, music and editing plans. Pick a variation, review your cart, and place the order on WhatsApp in one tap.</p>
          <div className="actions"><button onClick={() => navigate("/products")}>View All Products</button><button className="ghost" onClick={() => navigate("/offers")}>See Offers</button></div>
        </div>
        <div className="hero-panel">
          <span>Live catalog</span><strong>{ctx.products.length} products</strong><small>{ctx.activeOffers.length} active offers</small>
        </div>
      </section>
      <Section title="Featured Categories" action="View categories" onAction={() => navigate("/categories")}>
        <CategoryGrid categories={ctx.categories.filter((c) => c.featured).slice(0, 4)} navigate={navigate} />
      </Section>
      <Section title="Offers / Deals" action="All offers" onAction={() => navigate("/offers")}>
        <OfferGrid offers={ctx.activeOffers.slice(0, 3)} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} />
      </Section>
      <Section title="Featured Products" action="View all" onAction={() => navigate("/products")}>
        <ProductGrid products={featured} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} />
      </Section>
      <section className="contact-cta">
        <h2>Need a custom plan?</h2><p>Message Premium Hub directly and we will confirm availability, payment and activation steps.</p>
        <a href={`https://wa.me/${store.settings.whatsappNumber}`} target="_blank">Contact on WhatsApp</a>
      </section>
    </>
  );
}

function Section({ title, action, onAction, children }) {
  return <section className="section"><div className="section-head"><h2>{title}</h2>{action && <button className="text-btn" onClick={onAction}>{action}</button>}</div>{children}</section>;
}

function CategoryGrid({ categories, navigate }) {
  return <div className="category-grid">{categories.map((category) => <button className="category-card" key={category.id} onClick={() => navigate(`/categories/${category.slug}`)}><img src={category.image} alt={category.name} /><strong>{category.name}</strong><span>{category.description}</span></button>)}</div>;
}

function ProductGrid({ products, ctx, settings, addToCart, navigate }) {
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} category={ctx.categoryById[product.categoryId]} settings={settings} addToCart={addToCart} navigate={navigate} />)}</div>;
}

function ProductCard({ product, category, settings, addToCart, navigate }) {
  const first = product.variations.find((v) => v.inStock);
  const disabled = !product.inStock || !first;
  return (
    <article className="product-card">
      <img src={product.image} alt={`${product.name} logo`} />
      <div><span className="pill">{category?.name}</span><h3>{product.name}</h3><p>{product.shortDescription}</p></div>
      <div className="card-foot"><strong>{first ? `From ${money(first.price, settings.currency)}` : "Unavailable"}</strong><span className={disabled ? "stock out" : "stock"}>{disabled ? "Out of Stock" : "In Stock"}</span></div>
      <div className="card-actions"><button className="ghost" onClick={() => navigate(`/products/${product.slug}`)}>View Details</button><button disabled={disabled} onClick={() => addToCart(product.id, first.id)}>Add to Cart</button></div>
    </article>
  );
}

function Products({ store, ctx, slug, addToCart, navigate }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  if (slug) return <ProductDetails product={ctx.products.find((p) => p.slug === slug)} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} />;
  const filtered = ctx.products.filter((p) => (category === "all" || p.categoryId === category) && p.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="section page-top">
      <div className="section-head"><h1>Products</h1></div>
      <div className="filters"><input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{ctx.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <ProductGrid products={filtered} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} />
    </section>
  );
}

function ProductDetails({ product, ctx, settings, addToCart, navigate }) {
  const [variationId, setVariationId] = useState(product?.variations.find((v) => v.inStock)?.id || product?.variations[0]?.id);
  const [quantity, setQuantity] = useState(1);
  if (!product) return <Empty title="Product not found" action={() => navigate("/products")} />;
  const selected = product.variations.find((v) => v.id === variationId);
  const canBuy = product.active && product.inStock && selected?.inStock;
  const buy = () => { if (addToCart(product.id, selected.id, quantity)) navigate("/cart"); };
  return (
    <section className="detail page-top">
      <img src={product.image} alt={`${product.name} logo`} />
      <div>
        <span className="pill">{ctx.categoryById[product.categoryId]?.name}</span><h1>{product.name}</h1><p>{product.description}</p>
        <div className="feature-list">{product.features.map((f) => <span key={f}>{f}</span>)}</div>
        <h2>Choose a plan</h2>
        <div className="plans">{product.variations.map((v) => <button className={variationId === v.id ? "plan active" : "plan"} key={v.id} onClick={() => setVariationId(v.id)}><span>{v.name}</span><strong>{money(v.price, settings.currency)}</strong><small>{v.inStock ? "In Stock" : "Out of Stock"}</small></button>)}</div>
        <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button><b>{quantity}</b><button onClick={() => setQuantity(quantity + 1)}>+</button></div>
        <div className="actions"><button disabled={!canBuy} onClick={() => addToCart(product.id, selected.id, quantity)}>Add to Cart</button><button disabled={!canBuy} className="ghost" onClick={buy}>Buy Now</button></div>
      </div>
    </section>
  );
}

function Categories({ ctx, slug, navigate, store, addToCart }) {
  const category = slug ? ctx.categories.find((c) => c.slug === slug) : null;
  if (category) return <section className="section page-top"><h1>{category.name}</h1><p>{category.description}</p><ProductGrid products={ctx.products.filter((p) => p.categoryId === category.id)} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} /></section>;
  return <section className="section page-top"><h1>Categories</h1><CategoryGrid categories={ctx.categories} navigate={navigate} /></section>;
}

function Offers({ ctx, settings, addToCart, navigate }) {
  return <section className="section page-top"><h1>Offers</h1><OfferGrid offers={ctx.activeOffers} ctx={ctx} settings={settings} addToCart={addToCart} navigate={navigate} /></section>;
}

function OfferGrid({ offers, ctx, settings, addToCart, navigate }) {
  if (!offers.length) return <p className="muted">No active offers right now.</p>;
  return <div className="offer-grid">{offers.map((offer) => {
    const product = ctx.productById[offer.productId];
    const variation = product?.variations.find((v) => v.id === offer.variationId);
    const canBuy = product?.active && product?.inStock && variation?.inStock;
    return <article className="offer-card" key={offer.id}><img src={offer.image || product?.image} alt={offer.title} /><div><span className="pill">Deal</span><h3>{offer.title}</h3><p>{offer.description}</p><strong>{money(offer.price, settings.currency)} <s>{offer.originalPrice ? money(offer.originalPrice, settings.currency) : ""}</s></strong><div className="card-actions"><button onClick={() => navigate(`/products/${product?.slug}`)}>View</button><button disabled={!canBuy} className="ghost" onClick={() => addToCart(product.id, variation.id)}>Add</button></div></div></article>;
  })}</div>;
}

function Cart({ cartLines, setCart, store }) {
  const total = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
  const message = `${store.settings.whatsappMessage}\n\nOrder Details:\n${cartLines.map((item, i) => `${i + 1}. ${item.product.name} - ${item.variation.name} x ${item.quantity} - ${money(item.lineTotal, store.settings.currency)}`).join("\n")}\n\nTotal: ${money(total, store.settings.currency)}\n\nPlease let me know the payment details and next steps.`;
  return (
    <section className="section page-top cart-page"><h1>Cart</h1>
      {!cartLines.length ? <Empty title="Your cart is empty" /> : cartLines.map((item) => <div className="cart-row" key={`${item.productId}-${item.variationId}`}><img src={item.product.image} alt={item.product.name} /><div><strong>{item.product.name}</strong><span>{item.variation.name}</span>{!item.purchasable && <small className="danger">Currently out of stock</small>}</div><b>{money(item.variation.price, store.settings.currency)}</b><input type="number" min="1" value={item.quantity} onChange={(e) => setCart((cart) => cart.map((c) => c.productId === item.productId && c.variationId === item.variationId ? { ...c, quantity: Math.max(1, Number(e.target.value)) } : c))} /><strong>{money(item.lineTotal, store.settings.currency)}</strong><button className="text-btn" onClick={() => setCart((cart) => cart.filter((c) => !(c.productId === item.productId && c.variationId === item.variationId)))}>Remove</button></div>)}
      {!!cartLines.length && <aside className="summary"><span>Subtotal</span><strong>{money(total, store.settings.currency)}</strong><span>Total</span><strong>{money(total, store.settings.currency)}</strong><a className={cartLines.every((i) => i.purchasable) ? "order-btn" : "order-btn disabled"} href={`https://wa.me/${store.settings.whatsappNumber}?text=${encodeURIComponent(message)}`} target="_blank">Order Now</a></aside>}
    </section>
  );
}

function Admin({ store, updateStore, adminAuthed, setAdminAuthed }) {
  const [tab, setTab] = useState("products");
  if (!adminAuthed) return <Login onLogin={(password) => { if (password === "admin123") { localStorage.setItem(ADMIN_KEY, "yes"); setAdminAuthed(true); } }} />;
  const stats = { products: store.products.length, categories: store.categories.length, offers: store.offers.filter((o) => o.active).length, out: store.products.filter((p) => !p.inStock).length };
  return (
    <section className="admin page-top">
      <div className="admin-head"><h1>Admin Dashboard</h1><button className="ghost" onClick={() => { localStorage.removeItem(ADMIN_KEY); setAdminAuthed(false); }}>Logout</button></div>
      <div className="stats">{Object.entries(stats).map(([k, v]) => <div key={k}><strong>{v}</strong><span>{k}</span></div>)}</div>
      <div className="tabs">{["products", "categories", "offers", "settings"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
      {tab === "products" && <ProductAdmin store={store} updateStore={updateStore} />}
      {tab === "categories" && <CategoryAdmin store={store} updateStore={updateStore} />}
      {tab === "offers" && <OfferAdmin store={store} updateStore={updateStore} />}
      {tab === "settings" && <SettingsAdmin store={store} updateStore={updateStore} />}
    </section>
  );
}

function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  return <section className="login page-top"><h1>Admin Login</h1><p>Demo password: admin123</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><button onClick={() => onLogin(password)}>Login</button></section>;
}

function ProductAdmin({ store, updateStore }) {
  const blank = { id: uid("product"), name: "", slug: "", categoryId: store.categories[0]?.id || "", image: logo("NEW", "#334155"), shortDescription: "", description: "", features: [], active: true, inStock: true, featured: false, order: store.products.length + 1, variations: [] };
  const [draft, setDraft] = useState(blank);
  const save = () => updateStore((s) => ({ ...s, products: [...s.products.filter((p) => p.id !== draft.id), { ...draft, slug: draft.slug || slugify(draft.name), features: textToList(draft.features) }] }));
  return <Editor title="Product Management" onNew={() => setDraft({ ...blank, id: uid("product") })} list={store.products} pick={setDraft} draft={<ProductForm draft={draft} setDraft={setDraft} categories={store.categories} />} save={save} remove={() => updateStore((s) => ({ ...s, products: s.products.filter((p) => p.id !== draft.id) }))} />;
}

function ProductForm({ draft, setDraft, categories }) {
  const patch = (key, value) => setDraft({ ...draft, [key]: value });
  return <div className="form-grid"><input value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder="Product name" /><select value={draft.categoryId} onChange={(e) => patch("categoryId", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input value={draft.image} onChange={(e) => patch("image", e.target.value)} placeholder="Image URL or data URL" /><input type="number" value={draft.order} onChange={(e) => patch("order", Number(e.target.value))} placeholder="Display order" /><textarea value={draft.shortDescription} onChange={(e) => patch("shortDescription", e.target.value)} placeholder="Short description" /><textarea value={draft.description} onChange={(e) => patch("description", e.target.value)} placeholder="Full description" /><textarea value={Array.isArray(draft.features) ? draft.features.join("\n") : draft.features} onChange={(e) => patch("features", e.target.value)} placeholder="Features, one per line" /><label><input type="checkbox" checked={draft.active} onChange={(e) => patch("active", e.target.checked)} /> Active</label><label><input type="checkbox" checked={draft.inStock} onChange={(e) => patch("inStock", e.target.checked)} /> Product in stock</label><label><input type="checkbox" checked={draft.featured} onChange={(e) => patch("featured", e.target.checked)} /> Featured</label><VariationEditor variations={draft.variations} setVariations={(variations) => patch("variations", variations)} productId={draft.id} /></div>;
}

function VariationEditor({ variations, setVariations, productId }) {
  const set = (id, key, value) => setVariations(variations.map((v) => v.id === id ? { ...v, [key]: value } : v));
  return <div className="variation-editor"><h3>Variations</h3>{variations.map((v) => <div className="variation-row" key={v.id}><input value={v.name} onChange={(e) => set(v.id, "name", e.target.value)} placeholder="1 Month" /><input type="number" value={v.price} onChange={(e) => set(v.id, "price", Number(e.target.value))} /><input type="number" value={v.originalPrice || ""} onChange={(e) => set(v.id, "originalPrice", Number(e.target.value))} placeholder="Original" /><label><input type="checkbox" checked={v.inStock} onChange={(e) => set(v.id, "inStock", e.target.checked)} /> In stock</label><button className="text-btn" onClick={() => setVariations(variations.filter((item) => item.id !== v.id))}>Delete</button></div>)}<button className="ghost" onClick={() => setVariations([...variations, { id: uid(productId), name: "1 Month", price: 0, originalPrice: 0, inStock: true, sku: "", order: variations.length + 1 }])}>Add Variation</button></div>;
}

function CategoryAdmin({ store, updateStore }) {
  const blank = { id: uid("category"), name: "", slug: "", description: "", active: true, featured: false, order: store.categories.length + 1, image: logo("CAT", "#475569") };
  const [draft, setDraft] = useState(blank);
  const save = () => updateStore((s) => ({ ...s, categories: [...s.categories.filter((c) => c.id !== draft.id), { ...draft, slug: draft.slug || slugify(draft.name) }] }));
  const form = <div className="form-grid"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Category name" /><input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Image URL" /><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" /><input type="number" value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} /><label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label><label><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Featured</label></div>;
  return <Editor title="Category Management" onNew={() => setDraft({ ...blank, id: uid("category") })} list={store.categories} pick={setDraft} draft={form} save={save} remove={() => updateStore((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== draft.id) }))} />;
}

function OfferAdmin({ store, updateStore }) {
  const first = store.products[0];
  const blank = { id: uid("offer"), title: "", productId: first?.id || "", variationId: first?.variations[0]?.id || "", price: 0, originalPrice: 0, description: "", startDate: "", endDate: "", active: true, image: "" };
  const [draft, setDraft] = useState(blank);
  const product = store.products.find((p) => p.id === draft.productId);
  const save = () => updateStore((s) => ({ ...s, offers: [...s.offers.filter((o) => o.id !== draft.id), draft] }));
  const form = <div className="form-grid"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Offer title" /><select value={draft.productId} onChange={(e) => { const p = store.products.find((item) => item.id === e.target.value); setDraft({ ...draft, productId: e.target.value, variationId: p?.variations[0]?.id || "" }); }}>{store.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={draft.variationId} onChange={(e) => setDraft({ ...draft, variationId: e.target.value })}>{product?.variations.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select><input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /><input type="number" value={draft.originalPrice} onChange={(e) => setDraft({ ...draft, originalPrice: Number(e.target.value) })} /><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" /><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /><input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Offer image URL" /><label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label></div>;
  return <Editor title="Offer Management" onNew={() => setDraft({ ...blank, id: uid("offer") })} list={store.offers} pick={setDraft} draft={form} save={save} remove={() => updateStore((s) => ({ ...s, offers: s.offers.filter((o) => o.id !== draft.id) }))} />;
}

function SettingsAdmin({ store, updateStore }) {
  const [draft, setDraft] = useState(store.settings);
  return <section className="admin-editor"><h2>Website Settings</h2><div className="form-grid">{Object.keys(draft).map((key) => <label key={key}>{key}<input value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>)}</div><button onClick={() => updateStore({ ...store, settings: draft })}>Save Settings</button></section>;
}

function Editor({ title, list, pick, draft, save, remove, onNew }) {
  return <section className="admin-editor"><div className="section-head"><h2>{title}</h2><button onClick={onNew}>New</button></div><div className="editor-layout"><div className="admin-list">{list.map((item) => <button key={item.id} onClick={() => pick(structuredClone(item))}>{item.name || item.title}<small>{item.active === false ? "Disabled" : "Active"}</small></button>)}</div><div>{draft}<div className="actions"><button onClick={save}>Save</button><button className="ghost" onClick={remove}>Delete</button></div></div></div></section>;
}

function textToList(value) {
  return Array.isArray(value) ? value : value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function Footer({ settings }) {
  return <footer><strong>{settings.siteName}</strong><span>{settings.footerText}</span><span>{settings.contact}</span><a href={settings.instagram}>Instagram</a><button onClick={() => { location.hash = "/admin"; }}>Admin</button></footer>;
}

function Empty({ title, action }) {
  return <div className="empty"><h2>{title}</h2>{action && <button onClick={action}>Back to products</button>}</div>;
}

export default App;
