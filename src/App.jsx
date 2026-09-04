import { Component, useEffect, useMemo, useState } from "react";
import { logo, seedData } from "./storeData";
import "./App.css";

const STORE_KEY = "premium-hub-store-v1";
const CART_KEY = "premium-hub-cart-v1";

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (value, currency) => `${currency}${Number(value || 0).toLocaleString("en-IN")}`;
const stockNumber = (item) => Number(item?.stock ?? item?.stockQty ?? 0);
const hasCustomStock = (item) => item?.stock !== undefined || item?.stockQty !== undefined;
const isAvailable = (item) => Boolean(item?.inStock) && (!hasCustomStock(item) || stockNumber(item) > 0);
const stockText = (item) => isAvailable(item) ? (hasCustomStock(item) ? `${stockNumber(item)} in stock` : "In Stock") : "Stock Out";

function loadStore() {
  const saved = localStorage.getItem(STORE_KEY);
  return saved ? JSON.parse(saved) : seedData;
}

function currentRoute() {
  if (location.hash.startsWith("#/")) {
    const path = location.hash.slice(1);
    history.replaceState(null, "", path);
    return path;
  }
  return location.pathname || "/";
}

function App() {
  const [store, setStore] = useState(loadStore);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem(CART_KEY) || "[]"));
  const [route, setRoute] = useState(currentRoute);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [notice, setNotice] = useState("");
  const [dataStatus, setDataStatus] = useState("Loading catalog...");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog API failed")))
      .then((data) => {
        setStore(data);
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
        setDataStatus("Database connected");
      })
      .catch(() => {
        setDataStatus("Using local demo data");
      });
  }, []);
  useEffect(() => {
    fetch("/api/session")
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((data) => setAdminAuthed(Boolean(data.authenticated)))
      .catch(() => setAdminAuthed(false));
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!saveStatus) return undefined;
    const timer = setTimeout(() => setSaveStatus(""), 2600);
    return () => clearTimeout(timer);
  }, [saveStatus]);
  useEffect(() => {
    const onPop = () => setRoute(currentRoute());
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  const ctx = useMemo(() => buildContext(store), [store]);
  const cartLines = useMemo(() => hydrateCart(cart, ctx), [cart, ctx]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
  const showStickyCart = cartCount > 0 && !route.startsWith("/cart") && !route.startsWith("/admin");
  const navigate = (path) => {
    history.pushState(null, "", path);
    setRoute(path);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const updateStore = async (next, successMessage = "✓ Changes saved successfully", errorMessage = "✕ Failed to save changes. Please try again.") => {
    const updated = typeof next === "function" ? next(store) : next;
    setStore(updated);
    localStorage.setItem(STORE_KEY, JSON.stringify(updated));
    try {
      const response = await fetch("/api/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updated),
      });
      if (!response.ok) throw new Error("Save failed");
      const saved = await response.json();
      setStore(saved);
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
      setSaveStatus(successMessage);
    } catch {
      setSaveStatus(errorMessage);
    }
  };
  const addToCart = (productId, variationId, quantity = 1) => {
    const product = ctx.productById[productId];
    const variation = product?.variations.find((item) => item.id === variationId);
    if (!product?.active || !isAvailable(product) || !isAvailable(variation)) return false;
    setCart((items) => {
      const found = items.find((item) => item.productId === productId && item.variationId === variationId);
      if (found) return items.map((item) => item === found ? { ...item, quantity: item.quantity + quantity } : item);
      return [...items, { productId, variationId, quantity }];
    });
    setNotice(`${product.name} (${variation.name}) added to cart`);
    return true;
  };

  const props = { store, ctx, cartLines, cart, setCart, addToCart, navigate, updateStore, adminAuthed, setAdminAuthed, dataStatus, saveStatus, setDataStatus };
  return (
    <div>
      <Header settings={store.settings} cartCount={cartCount} navigate={navigate} route={route} />
      {notice && <div className="toast" role="status">{notice}</div>}
      <main className={showStickyCart ? "with-sticky-cart" : ""}>
        <RouteErrorBoundary key={route}>
          {route === "/" && <Home {...props} />}
          {route.startsWith("/products") && <Products {...props} slug={route.split("/")[2]} />}
          {route.startsWith("/categories") && <Categories {...props} slug={route.split("/")[2]} />}
          {route === "/offers" && <Offers {...props} />}
          {route === "/cart" && <Cart {...props} />}
          {route.startsWith("/admin") && <Admin {...props} />}
        </RouteErrorBoundary>
      </main>
      {showStickyCart && <StickyCartButton count={cartCount} total={cartTotal} settings={store.settings} navigate={navigate} />}
      {!route.startsWith("/admin") && <Footer settings={store.settings} />}
    </div>
  );
}

class RouteErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="section page-top">
          <h1>Page needs attention</h1>
          <p className="muted">This page could not load one catalog item. Please refresh or check the admin data.</p>
        </section>
      );
    }
    return this.props.children;
  }
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
    return { ...item, product, variation, lineTotal: variation.price * item.quantity, purchasable: product.active && isAvailable(product) && isAvailable(variation) };
  }).filter(Boolean);
}

function Header({ settings, cartCount, navigate, route }) {
  const isAdminRoute = route.startsWith("/admin");
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate("/")}>
        {settings.logoImage ? <img className="brand-logo" src={settings.logoImage} alt={`${settings.siteName} logo`} /> : <span className="brand-mark">PH</span>}
        <span>{settings.siteName}</span>
      </button>
      {!isAdminRoute && (
        <nav>
          {["Home", "Categories", "Offers", "Products"].map((label) => {
            const path = label === "Home" ? "/" : `/${label.toLowerCase()}`;
            const active = path === "/" ? route === "/" : route.startsWith(path);
            return <button className={active ? "active" : ""} key={label} onClick={() => navigate(path)}>{label}</button>;
          })}
          <button className={route.startsWith("/cart") ? "cart-link active" : "cart-link"} onClick={() => navigate("/cart")}>Cart <b>{cartCount}</b></button>
        </nav>
      )}
    </header>
  );
}

function StickyCartButton({ count, total, settings, navigate }) {
  const label = count === 1 ? "1 Item" : `${count} Items`;
  return (
    <button className="sticky-cart-cta" onClick={() => navigate("/cart")}>
      <span>View Cart</span>
      <b>{label}</b>
      <strong>{money(total, settings.currency)}</strong>
    </button>
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
  const first = product.variations.find((v) => isAvailable(v));
  const disabled = !isAvailable(product) || !first;
  return (
    <article className="product-card">
      <div className="image-wrap">
        <img src={product.image} alt={`${product.name} logo`} />
        {disabled && <span className="stock-badge">Stock Out</span>}
      </div>
      <div><span className="pill">{category?.name}</span><h3>{product.name}</h3><p>{product.shortDescription}</p></div>
      <div className="card-foot"><strong>{first ? `From ${money(first.price, settings.currency)}` : "Unavailable"}</strong><span className={disabled ? "stock out" : "stock"}>{disabled ? "Stock Out" : stockText(product)}</span></div>
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
  const canBuy = product.active && isAvailable(product) && isAvailable(selected);
  const buy = () => { if (addToCart(product.id, selected.id, quantity)) navigate("/cart"); };
  return (
    <section className="detail page-top">
      <div className="detail-image image-wrap">
        <img src={product.image} alt={`${product.name} logo`} />
        {!isAvailable(product) && <span className="stock-badge">Stock Out</span>}
      </div>
      <div>
        <span className="pill">{ctx.categoryById[product.categoryId]?.name}</span><h1>{product.name}</h1><p>{product.description}</p>
        <span className={isAvailable(product) ? "stock detail-stock" : "stock out detail-stock"}>{stockText(product)}</span>
        <div className="feature-list">{product.features.map((f) => <span key={f}>{f}</span>)}</div>
        <h2>Choose a plan</h2>
        <div className="plans">{product.variations.map((v) => <button className={variationId === v.id ? "plan active" : "plan"} key={v.id} onClick={() => setVariationId(v.id)}><span>{v.name}</span><strong>{money(v.price, settings.currency)}</strong><small className={isAvailable(v) ? "" : "danger"}>{stockText(v)}</small></button>)}</div>
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

function Offers({ ctx, store, addToCart, navigate }) {
  return <section className="section page-top"><h1>Offers</h1><OfferGrid offers={ctx.activeOffers} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} /></section>;
}

function OfferGrid({ offers, ctx, settings, addToCart, navigate }) {
  if (!offers.length) return <p className="muted">No active offers right now.</p>;
  return <div className="offer-grid">{offers.map((offer) => {
    const product = ctx.productById[offer.productId];
    const variation = product?.variations?.find((v) => v.id === offer.variationId);
    const canBuy = Boolean(product?.active && variation && isAvailable(product) && isAvailable(variation));
    const image = offer.image || product?.image || logo("DEAL", "#166534");
    return (
      <article className="offer-card" key={offer.id}>
        <div className="image-wrap">
          <img src={image} alt={offer.title || "Offer"} />
          {!canBuy && <span className="stock-badge">Stock Out</span>}
        </div>
        <div>
          <span className="pill">Deal</span>
          <h3>{offer.title}</h3>
          <p>{offer.description}</p>
          <strong>{money(offer.price, settings.currency)} <s>{offer.originalPrice ? money(offer.originalPrice, settings.currency) : ""}</s></strong>
          {(!product || !variation) && <small className="danger">Offer product is not configured</small>}
          <div className="card-actions">
            <button disabled={!product} onClick={() => product && navigate(`/products/${product.slug}`)}>View</button>
            <button disabled={!canBuy} className="ghost" onClick={() => addToCart(product.id, variation.id)}>Add</button>
          </div>
        </div>
      </article>
    );
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

function Admin({ store, updateStore, adminAuthed, setAdminAuthed, saveStatus }) {
  const [tab, setTab] = useState("products");
  if (!adminAuthed) return <Login onLogin={() => setAdminAuthed(true)} />;
  const stats = { products: store.products.length, categories: store.categories.length, offers: store.offers.filter((o) => o.active).length, out: store.products.filter((p) => !p.inStock).length };
  return (
    <section className="admin page-top">
      <div className="admin-head">
        <div><h1>Admin Dashboard</h1></div>
        <button className="ghost" onClick={async () => { await fetch("/api/logout", { method: "POST", credentials: "include" }); setAdminAuthed(false); }}>Logout</button>
      </div>
      <div className="stats">{Object.entries(stats).map(([k, v]) => <div key={k}><strong>{v}</strong><span>{k}</span></div>)}</div>
      <div className="tabs">{["products", "categories", "offers", "settings"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
      {tab === "products" && <ProductAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} />}
      {tab === "categories" && <CategoryAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} />}
      {tab === "offers" && <OfferAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} />}
      {tab === "settings" && <SettingsAdmin key={JSON.stringify(store.settings)} store={store} updateStore={updateStore} saveStatus={saveStatus} />}
    </section>
  );
}

function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = async () => {
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (response.ok) onLogin();
    else setError("Invalid admin password");
  };
  return <section className="login page-top"><h1>Admin Login</h1><p>Use the secure admin password configured in Vercel.</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><button onClick={login}>Login</button>{error && <small className="danger">{error}</small>}</section>;
}

function ProductAdmin({ store, updateStore, saveStatus }) {
  const blank = { id: uid("product"), name: "", slug: "", categoryId: store.categories[0]?.id || "", image: logo("NEW", "#334155"), shortDescription: "", description: "", features: [], active: true, inStock: true, stock: 10, featured: false, order: store.products.length + 1, variations: [] };
  const [draft, setDraft] = useState(blank);
  const save = () => {
    const stock = draft.stock ?? (draft.inStock ? 10 : 0);
    const variations = draft.variations.map((variation) => {
      const variationStock = variation.stock ?? (variation.inStock ? 10 : 0);
      return { ...variation, stock: variationStock, inStock: variationStock > 0 };
    });
    updateStore(
      (s) => ({ ...s, products: [...s.products.filter((p) => p.id !== draft.id), { ...draft, slug: draft.slug || slugify(draft.name), features: textToList(draft.features), stock, inStock: stock > 0, variations }] }),
      "✓ Product saved successfully",
      "✕ Failed to save product. Please try again."
    );
  };
  return <Editor title="Product Management" onNew={() => setDraft({ ...blank, id: uid("product") })} list={store.products} pick={setDraft} draft={<ProductForm draft={draft} setDraft={setDraft} categories={store.categories} />} save={save} remove={() => updateStore((s) => ({ ...s, products: s.products.filter((p) => p.id !== draft.id) }), "✓ Product deleted successfully", "✕ Failed to delete product. Please try again.")} saveStatus={saveStatus} />;
}

function ProductForm({ draft, setDraft, categories }) {
  const patch = (key, value) => setDraft({ ...draft, [key]: value });
  return (
    <div className="form-grid product-form">
      <label>Product name<input value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder="Product name" /></label>
      <label>Category<select value={draft.categoryId} onChange={(e) => patch("categoryId", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="image-field">Product image URL<input value={draft.image} onChange={(e) => patch("image", e.target.value)} placeholder="Paste image URL or upload below" /></label>
      <label className="image-field">Upload product image<input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files?.[0], (image) => patch("image", image))} /></label>
      <div className="image-preview"><img src={draft.image} alt="Product preview" /></div>
      <label>Current stock<input type="number" min="0" value={draft.stock ?? (draft.inStock ? 10 : 0)} onChange={(e) => { const stock = Math.max(0, Number(e.target.value)); setDraft({ ...draft, stock, inStock: stock > 0 }); }} /></label>
      <label>Display order<input type="number" value={draft.order} onChange={(e) => patch("order", Number(e.target.value))} /></label>
      <label>Short description<textarea value={draft.shortDescription} onChange={(e) => patch("shortDescription", e.target.value)} placeholder="Short description shown on product cards" /></label>
      <label>Full description<textarea value={draft.description} onChange={(e) => patch("description", e.target.value)} placeholder="Full description shown on product details" /></label>
      <label>Features<textarea value={Array.isArray(draft.features) ? draft.features.join("\n") : draft.features} onChange={(e) => patch("features", e.target.value)} placeholder="Features, one per line" /></label>
      <div className="toggle-row">
        <label><input type="checkbox" checked={draft.active} onChange={(e) => patch("active", e.target.checked)} /> Active</label>
        <label><input type="checkbox" checked={isAvailable(draft)} onChange={(e) => { const stock = e.target.checked ? Math.max(1, stockNumber(draft) || 10) : 0; setDraft({ ...draft, stock, inStock: stock > 0 }); }} /> Product in stock</label>
        <label><input type="checkbox" checked={draft.featured} onChange={(e) => patch("featured", e.target.checked)} /> Featured</label>
      </div>
      <VariationEditor variations={draft.variations} setVariations={(variations) => patch("variations", variations)} productId={draft.id} />
    </div>
  );
}

function VariationEditor({ variations, setVariations, productId }) {
  const set = (id, key, value) => setVariations(variations.map((v) => v.id === id ? { ...v, [key]: value } : v));
  const setStock = (id, value) => {
    const stock = Math.max(0, Number(value));
    setVariations(variations.map((v) => v.id === id ? { ...v, stock, inStock: stock > 0 } : v));
  };
  return <div className="variation-editor"><h3>Variations</h3>{variations.map((v) => <div className="variation-row" key={v.id}><input value={v.name} onChange={(e) => set(v.id, "name", e.target.value)} placeholder="1 Month" /><input type="number" value={v.price} onChange={(e) => set(v.id, "price", Number(e.target.value))} /><input type="number" value={v.originalPrice || ""} onChange={(e) => set(v.id, "originalPrice", Number(e.target.value))} placeholder="Original" /><input type="number" min="0" value={v.stock ?? (v.inStock ? 10 : 0)} onChange={(e) => setStock(v.id, e.target.value)} placeholder="Stock" /><label><input type="checkbox" checked={isAvailable(v)} onChange={(e) => setStock(v.id, e.target.checked ? Math.max(1, stockNumber(v) || 10) : 0)} /> In stock</label><button className="text-btn" onClick={() => setVariations(variations.filter((item) => item.id !== v.id))}>Delete</button></div>)}<button className="ghost" onClick={() => setVariations([...variations, { id: uid(productId), name: "1 Month", price: 0, originalPrice: 0, stock: 10, inStock: true, sku: "", order: variations.length + 1 }])}>Add Variation</button></div>;
}

function CategoryAdmin({ store, updateStore, saveStatus }) {
  const blank = { id: uid("category"), name: "", slug: "", description: "", active: true, featured: false, order: store.categories.length + 1, image: logo("CAT", "#475569") };
  const [draft, setDraft] = useState(blank);
  const save = () => updateStore((s) => ({ ...s, categories: [...s.categories.filter((c) => c.id !== draft.id), { ...draft, slug: draft.slug || slugify(draft.name) }] }), "✓ Category saved successfully", "✕ Failed to save category. Please try again.");
  const form = <div className="form-grid"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Category name" /><input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Image URL" /><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" /><input type="number" value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} /><label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label><label><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Featured</label></div>;
  return <Editor title="Category Management" onNew={() => setDraft({ ...blank, id: uid("category") })} list={store.categories} pick={setDraft} draft={form} save={save} remove={() => updateStore((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== draft.id) }), "✓ Category deleted successfully", "✕ Failed to delete category. Please try again.")} saveStatus={saveStatus} />;
}

function OfferAdmin({ store, updateStore, saveStatus }) {
  const first = store.products[0];
  const blank = { id: uid("offer"), title: "", productId: first?.id || "", variationId: first?.variations[0]?.id || "", price: 0, originalPrice: 0, description: "", startDate: "", endDate: "", active: true, image: "" };
  const [draft, setDraft] = useState(blank);
  const product = store.products.find((p) => p.id === draft.productId);
  const save = () => updateStore((s) => ({ ...s, offers: [...s.offers.filter((o) => o.id !== draft.id), draft] }), "✓ Offer saved successfully", "✕ Failed to save offer. Please try again.");
  const form = <div className="form-grid"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Offer title" /><select value={draft.productId} onChange={(e) => { const p = store.products.find((item) => item.id === e.target.value); setDraft({ ...draft, productId: e.target.value, variationId: p?.variations[0]?.id || "" }); }}>{store.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={draft.variationId} onChange={(e) => setDraft({ ...draft, variationId: e.target.value })}>{product?.variations.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select><input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /><input type="number" value={draft.originalPrice} onChange={(e) => setDraft({ ...draft, originalPrice: Number(e.target.value) })} /><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" /><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /><input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Offer image URL" /><label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label></div>;
  return <Editor title="Offer Management" onNew={() => setDraft({ ...blank, id: uid("offer") })} list={store.offers} pick={setDraft} draft={form} save={save} remove={() => updateStore((s) => ({ ...s, offers: s.offers.filter((o) => o.id !== draft.id) }), "✓ Offer deleted successfully", "✕ Failed to delete offer. Please try again.")} saveStatus={saveStatus} />;
}

function SettingsAdmin({ store, updateStore, saveStatus }) {
  const [draft, setDraft] = useState(store.settings);
  const save = () => updateStore((latest) => ({ ...latest, settings: { ...latest.settings, ...draft } }), "✓ Settings saved successfully", "✕ Failed to save settings. Please try again.");
  return (
    <section className="admin-editor">
      <h2>Website Settings</h2>
      <div className="form-grid settings-form">
        <Field label="Site name" value={draft.siteName} onChange={(siteName) => setDraft({ ...draft, siteName })} />
        <Field label="Tagline" value={draft.tagline} onChange={(tagline) => setDraft({ ...draft, tagline })} />
        <Field label="WhatsApp number" value={draft.whatsappNumber} onChange={(whatsappNumber) => setDraft({ ...draft, whatsappNumber })} />
        <Field label="Currency" value={draft.currency} onChange={(currency) => setDraft({ ...draft, currency })} />
        <Field label="Contact email" value={draft.contact} onChange={(contact) => setDraft({ ...draft, contact })} />
        <Field label="Instagram link" value={draft.instagram} onChange={(instagram) => setDraft({ ...draft, instagram })} />
        <label className="image-field">Logo image URL
          <input value={draft.logoImage || ""} onChange={(e) => setDraft({ ...draft, logoImage: e.target.value })} placeholder="https://..." />
        </label>
        <label className="image-field">Upload logo image
          <input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files[0], (image) => setDraft({ ...draft, logoImage: image }))} />
        </label>
        {draft.logoImage && <div className="logo-preview"><img src={draft.logoImage} alt="Logo preview" /></div>}
        <label>Footer text<textarea value={draft.footerText || ""} onChange={(e) => setDraft({ ...draft, footerText: e.target.value })} /></label>
        <label>WhatsApp message<textarea value={draft.whatsappMessage || ""} onChange={(e) => setDraft({ ...draft, whatsappMessage: e.target.value })} /></label>
      </div>
      <div className="actions editor-actions"><button onClick={save}>Save Settings</button><AdminStatusMessage message={saveStatus} /></div>
    </section>
  );
}

function Field({ label, value, onChange }) {
  return <label>{label}<input value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Editor({ title, list, pick, draft, save, remove, onNew, saveStatus }) {
  return <section className="admin-editor"><div className="section-head"><h2>{title}</h2><button onClick={onNew}>New</button></div><div className="editor-layout"><div className="admin-list">{list.map((item) => <button key={item.id} onClick={() => pick(structuredClone(item))}>{item.name || item.title}<small>{item.active === false ? "Disabled" : "Active"}</small></button>)}</div><div>{draft}<div className="actions editor-actions"><button onClick={save}>Save</button><button className="ghost" onClick={remove}>Delete</button><AdminStatusMessage message={saveStatus} /></div></div></div></section>;
}

function AdminStatusMessage({ message }) {
  if (!message) return null;
  const kind = message.toLowerCase().includes("failed") ? "error" : "active";
  return <div className={`admin-status ${kind}`} role="status">{message}</div>;
}

function textToList(value) {
  return Array.isArray(value) ? value : value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function readImageFile(file, done) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => done(reader.result);
  reader.readAsDataURL(file);
}

function Footer({ settings }) {
  return <footer><strong>{settings.siteName}</strong><span>{settings.footerText}</span><span>{settings.contact}</span><a href={settings.instagram}>Instagram</a></footer>;
}

function Empty({ title, action }) {
  return <div className="empty"><h2>{title}</h2>{action && <button onClick={action}>Back to products</button>}</div>;
}

export default App;
