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
const stockLimit = (item) => hasCustomStock(item) ? Math.max(0, stockNumber(item)) : Infinity;
const isAvailable = (item) => Boolean(item?.inStock) && (!hasCustomStock(item) || stockNumber(item) > 0);
const stockText = (item) => isAvailable(item) ? (hasCustomStock(item) ? `${stockNumber(item)} in stock` : "In Stock") : "Stock Out";
const isBlank = (value) => value === "" || value === null || value === undefined;
const availableVariations = (product) => product?.variations?.filter((variation) => isAvailable(variation)) || [];
const hasAvailableVariation = (product) => availableVariations(product).length > 0;
const lowestVariation = (product) => {
  const variations = product?.variations?.filter((variation) => !isBlank(variation.price)) || [];
  return variations.sort((a, b) => Number(a.price) - Number(b.price))[0];
};
const productStockText = (product) => hasAvailableVariation(product) ? "In Stock" : "Stock Out";
const whatsappGroupUrl = (settings) => settings.whatsappGroupLink?.trim();
const twoDigits = (value) => String(value).padStart(2, "0");
const formatOfferTimer = (seconds) => `${twoDigits(Math.floor(seconds / 3600))}:${twoDigits(Math.floor((seconds % 3600) / 60))}:${twoDigits(seconds % 60)}`;
const setSavedStore = (data) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Uploaded images can exceed browser storage; database saving should still continue.
  }
};

function loadStore() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) return seedData;
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.products) || !Array.isArray(parsed.offers)) return seedData;
    return { ...seedData, ...parsed, settings: { ...seedData.settings, ...parsed.settings } };
  } catch {
    return seedData;
  }
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
  const [orderProductId, setOrderProductId] = useState("");
  const [timerTick, setTimerTick] = useState(() => Date.now());
  const isCatalogLoading = dataStatus === "Loading catalog..." && (!store?.products?.length || !store?.offers?.length);

  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog API failed")))
      .then((data) => {
        setStore(data);
        setSavedStore(data);
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
  useEffect(() => {
    const timer = setInterval(() => setTimerTick(Date.now()), 1000);
    return () => clearInterval(timer);
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
    const previous = store;
    const updated = typeof next === "function" ? next(store) : next;
    setSaveStatus("Saving...");
    setStore(updated);
    setSavedStore(updated);
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
      setSavedStore(saved);
      setSaveStatus(successMessage);
    } catch {
      setStore(previous);
      setSavedStore(previous);
      setSaveStatus(errorMessage);
    }
  };
  const addToCart = (productId, variationId, quantity = 1, unitPrice) => {
    const product = ctx.productById[productId];
    const variation = product?.variations.find((item) => item.id === variationId);
    if (!product?.active || !isAvailable(variation)) return false;
    const maxStock = stockLimit(variation);
    const price = unitPrice === undefined ? variation.price : Number(unitPrice);
    setCart((items) => {
      const found = items.find((item) => item.productId === productId && item.variationId === variationId);
      if (found) return items.map((item) => item === found ? { ...item, quantity: Math.min(maxStock, item.quantity + quantity), unitPrice: unitPrice === undefined ? item.unitPrice : price } : item);
      return [...items, { productId, variationId, quantity: Math.min(maxStock, Math.max(1, quantity)), unitPrice: price }];
    });
    setNotice(`${product.name} (${variation.name}) added to cart`);
    return true;
  };
  const orderNow = (productId) => {
    const product = ctx.productById[productId];
    const available = availableVariations(product);
    if (!product?.active || !available.length) return;
    if (available.length === 1) {
      if (addToCart(product.id, available[0].id)) navigate("/cart");
      return;
    }
    setOrderProductId(product.id);
  };
  const addVariationAndCart = (productId, variationId) => {
    if (addToCart(productId, variationId)) {
      setOrderProductId("");
      navigate("/cart");
    }
  };

  const props = { store, ctx, cartLines, cart, setCart, addToCart, orderNow, navigate, updateStore, adminAuthed, setAdminAuthed, dataStatus, saveStatus, setSaveStatus, setDataStatus, timerTick, isCatalogLoading };
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
          {!(["/", "/products", "/categories", "/offers", "/cart"].includes(route) || route.startsWith("/products/") || route.startsWith("/categories/") || route.startsWith("/admin")) && <Empty title="Page not found" action={() => navigate("/")} />}
        </RouteErrorBoundary>
      </main>
      {orderProductId && <OrderSheet product={ctx.productById[orderProductId]} settings={store.settings} onClose={() => setOrderProductId("")} onOrder={addVariationAndCart} navigate={navigate} />}
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
    const unitPrice = Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : Number(variation.price);
    const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), stockLimit(variation));
    return { ...item, quantity, unitPrice, product, variation, lineTotal: unitPrice * quantity, purchasable: product.active && isAvailable(variation) && quantity <= stockLimit(variation) };
  }).filter(Boolean);
}

function Header({ settings, cartCount, navigate, route }) {
  const isAdminRoute = route.startsWith("/admin");
  const go = (path) => {
    navigate(path);
  };
  const nav = <NavButtons cartCount={cartCount} route={route} go={go} />;
  return (
    <>
      <header className="site-header">
        <button className="brand" onClick={() => go("/")}>
          {settings.logoImage ? <img className="brand-logo" src={settings.logoImage} alt={`${settings.siteName} logo`} /> : <span className="brand-mark">PH</span>}
          <span>{settings.siteName}</span>
        </button>
        {!isAdminRoute && (
          <nav className="site-nav desktop-only">{nav}</nav>
        )}
      </header>
      {!isAdminRoute && (
        <nav className="site-nav mobile-only">{nav}</nav>
      )}
    </>
  );
}

function NavButtons({ cartCount, route, go }) {
  return (
    <>
      {["Home", "Categories", "Offers", "Products"].map((label) => {
        const path = label === "Home" ? "/" : `/${label.toLowerCase()}`;
        const active = path === "/" ? route === "/" : route.startsWith(path);
        return <button className={active ? "active" : ""} key={label} onClick={() => go(path)}>{label}</button>;
      })}
      <button className={route.startsWith("/cart") ? "cart-link active" : "cart-link"} onClick={() => go("/cart")}>Cart <b>{cartCount}</b></button>
    </>
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

function Home({ store, ctx, addToCart, orderNow, navigate, timerTick, isCatalogLoading }) {
  const featured = ctx.products.filter((p) => p.featured).slice(0, 6);
  const heroPicks = (featured.length ? featured : ctx.products).slice(0, 3);
  const [openTrendingId, setOpenTrendingId] = useState("");
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Digital subscription store</p>
          <h1>{store.settings.tagline}</h1>
          <p>Browse trusted OTT, AI, music and editing plans. Pick a variation, review your cart, and place the order on WhatsApp in one tap.</p>
          <div className="actions"><button onClick={() => navigate("/products")}>View All Products</button><button className="ghost" onClick={() => navigate("/offers")}>See Offers</button></div>
          <div className="quick-nav" aria-label="Quick store navigation">
            <button onClick={() => navigate("/products")}>Products</button>
            <button onClick={() => navigate("/categories")}>Categories</button>
            <button onClick={() => navigate("/offers")}>Offers</button>
            <a href={`https://wa.me/${store.settings.whatsappNumber}`} target="_blank">WhatsApp</a>
          </div>
        </div>
        <div className="hero-panel">
          <span className="panel-kicker">Trending now</span>
          <div className="hero-product-stack">
            {heroPicks.map((product) => {
              const first = lowestVariation(product);
              const open = openTrendingId === product.id;
              return (
                <div className={open ? "hero-product-wrap open" : "hero-product-wrap"} key={product.id}>
                  <button className="hero-product" onClick={() => setOpenTrendingId(open ? "" : product.id)}>
                    <img src={product.image} alt={`${product.name} logo`} />
                    <span>
                      <b>{product.name}</b>
                      <small>{first ? `From ${money(first.price, store.settings.currency)}` : `From ${money(0, store.settings.currency)}`}</small>
                    </span>
                  </button>
                  {open && (
                    <div className="hero-plan-picker">
                      {product.variations.map((variation) => {
                        const stocked = isAvailable(variation);
                        return (
                          <div className={stocked ? "card-plan-row" : "card-plan-row out"} key={variation.id}>
                            <div>
                              <b>{variation.name}</b>
                              {variation.shortDescription && <span>{variation.shortDescription}</span>}
                              <small>{money(variation.price, store.settings.currency)}</small>
                            </div>
                            {stocked ? <button onClick={() => addToCart(product.id, variation.id)}>Add</button> : <em>Stock Out</em>}
                          </div>
                        );
                      })}
                      <button className="text-btn" onClick={() => navigate(`/products/${product.slug}`)}>View Details</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hero-panel-foot">
            <span><b>{ctx.products.length}</b> products</span>
            <span><b>{ctx.activeOffers.length}</b> offers</span>
          </div>
        </div>
      </section>
      <Section title="Featured Categories" action="View categories" onAction={() => navigate("/categories")}>
        <CategoryGrid categories={ctx.categories.filter((c) => c.featured).slice(0, 4)} navigate={navigate} />
      </Section>
      <Section title="Offers / Deals" action="All offers" onAction={() => navigate("/offers")}>
        <OfferGrid offers={ctx.activeOffers.slice(0, 3)} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} timerTick={timerTick} />
      </Section>
      <Section title="Featured Products" action="View all" onAction={() => navigate("/products")}>
        {isCatalogLoading ? <ProductSkeletonGrid /> : <ProductGrid products={featured} ctx={ctx} settings={store.settings} addToCart={addToCart} orderNow={orderNow} navigate={navigate} />}
      </Section>
      <section className="contact-cta">
        <h2>Need a custom plan?</h2><p>Message Premium Hub directly and we will confirm availability, payment and activation steps.</p>
        <div className="contact-links">
          <a href={`https://wa.me/${store.settings.whatsappNumber}`} target="_blank">Contact on WhatsApp</a>
          {whatsappGroupUrl(store.settings) && <a href={whatsappGroupUrl(store.settings)} target="_blank">Join WhatsApp Group</a>}
        </div>
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

function ProductGrid({ products, ctx, settings, addToCart, orderNow, navigate }) {
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} category={ctx.categoryById[product.categoryId]} settings={settings} addToCart={addToCart} orderNow={orderNow} navigate={navigate} />)}</div>;
}

function ProductCard({ product, category, settings, orderNow, navigate }) {
  const available = availableVariations(product);
  const first = available[0];
  const priceFrom = lowestVariation(product);
  const disabled = !product.active || !first;
  return (
    <article className="product-card">
      <div className="image-wrap">
        <img src={product.image} alt={`${product.name} logo`} />
        {disabled && <span className="stock-badge">Stock Out</span>}
      </div>
      <div><span className="pill">{category?.name}</span><h3>{product.name}</h3><p>{product.shortDescription}</p></div>
      <div className="card-foot"><strong>{priceFrom ? `From ${money(priceFrom.price, settings.currency)}` : `From ${money(0, settings.currency)}`}</strong><span className={disabled ? "stock out" : "stock"}>{productStockText(product)}</span></div>
      <div className="card-actions"><button className="ghost" onClick={() => navigate(`/products/${product.slug}`)}>View Details</button><button disabled={disabled} onClick={() => orderNow(product.id)}>Order Now</button></div>
    </article>
  );
}

function OrderSheet({ product, settings, onClose, onOrder, navigate }) {
  if (!product) return null;
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="order-sheet" role="dialog" aria-modal="true" aria-label={`Choose ${product.name} plan`} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <span className="pill">Choose plan</span>
            <h2>{product.name}</h2>
          </div>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
        <div className="sheet-plans">
          {product.variations.map((variation) => {
            const stocked = isAvailable(variation);
            return (
              <div className={stocked ? "sheet-plan" : "sheet-plan out"} key={variation.id}>
                <div>
                  <b>{variation.name}</b>
                  {variation.shortDescription && <small>{variation.shortDescription}</small>}
                  {!variation.shortDescription && <small>{stockText(variation)}</small>}
                </div>
                <strong>{money(variation.price, settings.currency)}</strong>
                {stocked ? <button onClick={() => onOrder(product.id, variation.id)}>Order Now</button> : <em>Stock Out</em>}
              </div>
            );
          })}
        </div>
        <button className="text-btn" onClick={() => { onClose(); navigate(`/products/${product.slug}`); }}>View full details</button>
      </section>
    </div>
  );
}

function Products({ store, ctx, slug, addToCart, orderNow, navigate, isCatalogLoading }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  if (slug) return <ProductDetails product={ctx.products.find((p) => p.slug === slug)} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} />;
  const filtered = ctx.products.filter((p) => (category === "all" || p.categoryId === category) && p.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="section page-top">
      <div className="section-head"><h1>Products</h1></div>
      <div className="filters"><input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{ctx.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      {isCatalogLoading ? <ProductSkeletonGrid /> : <ProductGrid products={filtered} ctx={ctx} settings={store.settings} addToCart={addToCart} orderNow={orderNow} navigate={navigate} />}
    </section>
  );
}

function ProductDetails({ product, ctx, settings, addToCart, navigate }) {
  const [variationId, setVariationId] = useState(product?.variations.find((v) => isAvailable(v))?.id || product?.variations[0]?.id);
  const [quantity, setQuantity] = useState(1);
  if (!product) return <Empty title="Product not found" action={() => navigate("/products")} />;
  const selected = product.variations.find((v) => v.id === variationId);
  const canBuy = product.active && isAvailable(selected);
  const maxQuantity = stockLimit(selected);
  const buy = () => { if (addToCart(product.id, selected.id, quantity)) navigate("/cart"); };
  return (
    <section className="detail page-top">
      <div className="detail-image image-wrap">
        <img src={product.image} alt={`${product.name} logo`} />
        {!hasAvailableVariation(product) && <span className="stock-badge">Stock Out</span>}
      </div>
      <div>
        <span className="pill">{ctx.categoryById[product.categoryId]?.name}</span><h1>{product.name}</h1><p>{product.description}</p>
        <span className={hasAvailableVariation(product) ? "stock detail-stock" : "stock out detail-stock"}>{productStockText(product)}</span>
        <div className="feature-list">{product.features.map((f) => <span key={f}>{f}</span>)}</div>
        <h2>Choose a plan</h2>
        <div className="plans">{product.variations.map((v) => {
          const stocked = isAvailable(v);
          return <button disabled={!stocked} className={variationId === v.id ? "plan active" : "plan"} key={v.id} onClick={() => stocked && setVariationId(v.id)}><span>{v.name}</span><strong>{money(v.price, settings.currency)}</strong><small className={stocked ? "" : "danger"}>{v.shortDescription || stockText(v)}</small>{v.shortDescription && <small className={stocked ? "" : "danger"}>{stockText(v)}</small>}</button>;
        })}</div>
        <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button><b>{quantity}</b><button disabled={quantity >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}>+</button></div>
        <div className="actions"><button disabled={!canBuy} onClick={() => addToCart(product.id, selected.id, quantity)}>Add to Cart</button><button disabled={!canBuy} className="ghost" onClick={buy}>Buy Now</button></div>
      </div>
    </section>
  );
}

function Categories({ ctx, slug, navigate, store, addToCart, orderNow, isCatalogLoading }) {
  const category = slug ? ctx.categories.find((c) => c.slug === slug) : null;
  if (category) return <section className="section page-top category-page"><div className="category-hero"><img src={category.image} alt={`${category.name} logo`} /><div><h1>{category.name}</h1><p>{category.description}</p></div></div>{isCatalogLoading ? <ProductSkeletonGrid /> : <ProductGrid products={ctx.products.filter((p) => p.categoryId === category.id)} ctx={ctx} settings={store.settings} addToCart={addToCart} orderNow={orderNow} navigate={navigate} />}</section>;
  return <section className="section page-top"><h1>Categories</h1><CategoryGrid categories={ctx.categories} navigate={navigate} /></section>;
}

function Offers({ ctx, store, addToCart, navigate, timerTick, isCatalogLoading }) {
  return <section className="section page-top"><h1>Offers</h1>{isCatalogLoading ? <ProductSkeletonGrid /> : <OfferGrid offers={ctx.activeOffers} ctx={ctx} settings={store.settings} addToCart={addToCart} navigate={navigate} timerTick={timerTick} />}</section>;
}

function ProductSkeletonGrid() {
  return <div className="product-grid skeleton-grid" aria-label="Loading products">{Array.from({ length: 4 }).map((_, index) => <article className="product-card skeleton-card" key={index}><span className="skeleton-img" /><span className="skeleton-line wide" /><span className="skeleton-line" /><span className="skeleton-line short" /><span className="skeleton-button" /></article>)}</div>;
}

function OfferGrid({ offers, ctx, settings, addToCart, navigate, timerTick }) {
  if (!offers.length) return <p className="muted">No active offers right now.</p>;
  const duration = Math.max(0, Number(settings.offerTimerMinutes || 0)) * 60;
  const secondsLeft = (offer) => {
    if (!offer.endDate) return duration ? duration - (Math.floor(timerTick / 1000) % duration) : 0;
    const targetStr = offer.endDate.includes("T") ? offer.endDate : `${offer.endDate}T23:59:59`;
    const time = new Date(targetStr).getTime();
    return Number.isNaN(time) ? 0 : Math.max(0, Math.ceil((time - timerTick) / 1000));
  };
  return <div className="offer-grid">{offers.map((offer) => {
    const product = ctx.productById[offer.productId];
    const variation = product?.variations?.find((v) => v.id === offer.variationId);
    const canBuy = Boolean(product?.active && variation && isAvailable(variation));
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
          {(offer.endDate || duration) && <span className="offer-timer">Ends in <b>{formatOfferTimer(secondsLeft(offer))}</b></span>}
          <strong>{money(offer.price, settings.currency)} <s>{offer.originalPrice ? money(offer.originalPrice, settings.currency) : ""}</s></strong>
          {(!product || !variation) && <small className="danger">Offer product is not configured</small>}
          <div className="card-actions">
            <button disabled={!product} onClick={() => product && navigate(`/products/${product.slug}`)}>View</button>
            <button disabled={!canBuy} className="ghost" onClick={() => addToCart(product.id, variation.id, 1, offer.price)}>Add</button>
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
      {!cartLines.length ? <Empty title="Your cart is empty" /> : cartLines.map((item) => <div className="cart-row" key={`${item.productId}-${item.variationId}`}><img src={item.product.image} alt={item.product.name} /><div><strong>{item.product.name}</strong><span>{item.variation.name}</span>{item.variation.shortDescription && <small>{item.variation.shortDescription}</small>}{!item.purchasable && <small className="danger">Currently out of stock</small>}</div><b>{money(item.unitPrice, store.settings.currency)}</b><input type="number" min="1" max={Number.isFinite(stockLimit(item.variation)) ? stockLimit(item.variation) : undefined} value={item.quantity} onChange={(e) => setCart((cart) => cart.map((c) => c.productId === item.productId && c.variationId === item.variationId ? { ...c, quantity: Math.min(Math.max(1, Number(e.target.value) || 1), stockLimit(item.variation)) } : c))} /><strong>{money(item.lineTotal, store.settings.currency)}</strong><button className="text-btn" onClick={() => setCart((cart) => cart.filter((c) => !(c.productId === item.productId && c.variationId === item.variationId)))}>Remove</button></div>)}
      {!!cartLines.length && <aside className="summary"><span>Subtotal</span><strong>{money(total, store.settings.currency)}</strong><span>Total</span><strong>{money(total, store.settings.currency)}</strong><a className={cartLines.every((i) => i.purchasable) ? "order-btn" : "order-btn disabled"} href={`https://wa.me/${store.settings.whatsappNumber}?text=${encodeURIComponent(message)}`} target="_blank">Order Now</a></aside>}
    </section>
  );
}

function Admin({ store, updateStore, adminAuthed, setAdminAuthed, saveStatus, setSaveStatus }) {
  const [tab, setTab] = useState("products");
  if (!adminAuthed) return <Login onLogin={() => setAdminAuthed(true)} />;
  const stats = { products: store.products.length, categories: store.categories.length, offers: store.offers.filter((o) => o.active).length, out: store.products.filter((p) => !hasAvailableVariation(p)).length };
  return (
    <section className="admin page-top">
      <div className="admin-head">
        <div><h1>Admin Dashboard</h1></div>
        <button className="ghost" onClick={async () => { await fetch("/api/logout", { method: "POST", credentials: "include" }); setAdminAuthed(false); }}>Logout</button>
      </div>
      <div className="stats">{Object.entries(stats).map(([k, v]) => <div key={k}><strong>{v}</strong><span>{k}</span></div>)}</div>
      <div className="tabs">{["products", "categories", "offers", "settings"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
      <AdminStatusMessage message={saveStatus} />
      {tab === "products" && <ProductAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} setSaveStatus={setSaveStatus} />}
      {tab === "categories" && <CategoryAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} setSaveStatus={setSaveStatus} />}
      {tab === "offers" && <OfferAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} setSaveStatus={setSaveStatus} />}
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

function ProductAdmin({ store, updateStore, saveStatus, setSaveStatus }) {
  const blank = { id: uid("product"), name: "", slug: "", categoryId: store.categories[0]?.id || "", image: logo("NEW", "#334155"), shortDescription: "", description: "", features: [], active: true, inStock: true, stock: 10, featured: false, order: store.products.length + 1, variations: [] };
  const [draft, setDraft] = useState(blank);
  const save = () => {
    if (isBlank(draft.order)) {
      setSaveStatus("Display order is required.");
      return;
    }
    const missingPrice = draft.variations.some((variation) => isBlank(variation.price));
    if (missingPrice) {
      setSaveStatus("Price is required.");
      return;
    }
    const missingVariationStock = draft.variations.some((variation) => isBlank(variation.stock));
    if (missingVariationStock) {
      setSaveStatus("Current stock is required.");
      return;
    }
    const variations = draft.variations.map((variation) => {
      const variationStock = Math.max(0, Number(variation.stock));
      const originalPrice = variation.originalPrice === "" || variation.originalPrice === null || variation.originalPrice === undefined ? "" : Number(variation.originalPrice);
      return { ...variation, price: Number(variation.price), originalPrice, stock: variationStock, inStock: variationStock > 0 };
    });
    const stock = variations.reduce((sum, variation) => sum + stockNumber(variation), 0);
    updateStore(
      (s) => ({ ...s, products: [...s.products.filter((p) => p.id !== draft.id), { ...draft, slug: draft.slug || slugify(draft.name), features: textToList(draft.features), stock, order: Number(draft.order), inStock: stock > 0, variations }] }),
      "✓ Product saved successfully",
      "✕ Failed to save product. Please try again."
    );
  };
  return <Editor title="Product Management" onNew={() => setDraft({ ...blank, id: uid("product") })} list={store.products} pick={setDraft} activeId={draft.id} draft={<ProductForm draft={draft} setDraft={setDraft} categories={store.categories} currency={store.settings.currency} />} save={save} remove={() => updateStore((s) => ({ ...s, products: s.products.filter((p) => p.id !== draft.id) }), "✓ Product deleted successfully", "✕ Failed to delete product. Please try again.")} saveStatus={saveStatus} />;
}

function ProductForm({ draft, setDraft, categories, currency }) {
  const patch = (key, value) => setDraft({ ...draft, [key]: value });
  return (
    <div className="form-grid product-form">
      <section className="form-section">
        <div className="form-section-head">
          <span>01</span>
          <div>
            <h3>Basic Information</h3>
            <p>Product identity, image and customer-facing copy.</p>
          </div>
        </div>
        <div className="form-section-grid">
          <label>Product name<input value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder="Product name" /></label>
          <label>Category<select value={draft.categoryId} onChange={(e) => patch("categoryId", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="image-field">Product image URL<input value={draft.image} onChange={(e) => patch("image", e.target.value)} placeholder="Paste image URL or upload below" /></label>
          <label className="image-field">Upload product image<input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files?.[0], (image) => patch("image", image))} /></label>
          <div className="image-preview"><img src={draft.image} alt="Product preview" /></div>
          <label>Short description<textarea value={draft.shortDescription} onChange={(e) => patch("shortDescription", e.target.value)} placeholder="Short description shown on product cards" /></label>
          <label>Full description<textarea value={draft.description} onChange={(e) => patch("description", e.target.value)} placeholder="Full description shown on product details" /></label>
          <label>Features<textarea value={Array.isArray(draft.features) ? draft.features.join("\n") : draft.features} onChange={(e) => patch("features", e.target.value)} placeholder="Features, one per line" /></label>
        </div>
      </section>
      <section className="form-section">
        <div className="form-section-head">
          <span>02</span>
          <div>
            <h3>Pricing & Variations</h3>
            <p>Plans, prices, and stock availability.</p>
          </div>
        </div>
        <VariationEditor variations={draft.variations} setVariations={(variations) => patch("variations", variations)} productId={draft.id} currency={currency} />
      </section>
      <section className="form-section">
        <div className="form-section-head">
          <span>03</span>
          <div>
            <h3>Store Placement</h3>
            <p>Catalog placement. Stock is calculated from variations.</p>
          </div>
        </div>
        <div className="form-section-grid compact">
          <label>Display order<input type="number" value={draft.order ?? ""} onChange={(e) => patch("order", e.target.value)} /></label>
          <div className="toggle-row">
            <label><input type="checkbox" checked={draft.active} onChange={(e) => patch("active", e.target.checked)} /> Active</label>
            <label><input type="checkbox" checked={draft.featured} onChange={(e) => patch("featured", e.target.checked)} /> Featured</label>
          </div>
        </div>
      </section>
    </div>
  );
}

function VariationEditor({ variations, setVariations, productId, currency }) {
  const set = (id, key, value) => setVariations(variations.map((v) => v.id === id ? { ...v, [key]: value } : v));
  const setStock = (id, value) => {
    setVariations(variations.map((v) => v.id === id ? { ...v, stock: value, inStock: value !== "" && Number(value) > 0 } : v));
  };
  return (
    <div className="variation-editor">
      <div className="variation-title">
        <h4>Plan Variations</h4>
        <button className="ghost" onClick={() => setVariations([...variations, { id: uid(productId), name: "1 Month", price: "", originalPrice: "", shortDescription: "", stock: 10, inStock: true, sku: "", order: variations.length + 1 }])}>+ Add Variation</button>
      </div>
      {variations.map((v) => (
        <details className="variation-card" key={v.id} open={!v.name}>
          <summary>
            <span className="variation-name">{v.name || "New variation"}</span>
            <span>Price: {isBlank(v.price) ? "Required" : `${currency}${v.price}`}</span>
            <span>Original: {isBlank(v.originalPrice) ? "None" : `${currency}${v.originalPrice}`}</span>
            <span className={isAvailable(v) ? "stock-dot" : "stock-dot out"}>{isAvailable(v) ? "In Stock" : "Stock Out"}</span>
          </summary>
          <div className="variation-row">
            <label>Plan name<input value={v.name} onChange={(e) => set(v.id, "name", e.target.value)} placeholder="1 Month" /></label>
            <label>Selling price<input type="number" value={v.price ?? ""} onChange={(e) => set(v.id, "price", e.target.value)} placeholder="Current price" /></label>
            <label>Original price<input type="number" value={v.originalPrice ?? ""} onChange={(e) => set(v.id, "originalPrice", e.target.value)} placeholder="Old price" /></label>
            <label>Short description<input value={v.shortDescription || ""} onChange={(e) => set(v.id, "shortDescription", e.target.value)} placeholder="4K • 30 days" /></label>
            <label>Current stock<input type="number" min="0" value={v.stock ?? (v.inStock ? 10 : 0)} onChange={(e) => setStock(v.id, e.target.value)} placeholder="Stock" /></label>
            <label className="variation-stock-toggle"><input type="checkbox" checked={isAvailable(v)} onChange={(e) => setStock(v.id, e.target.checked ? Math.max(1, stockNumber(v) || 10) : 0)} /> In stock</label>
            <button className="text-btn danger-btn" onClick={() => setVariations(variations.filter((item) => item.id !== v.id))}>Delete</button>
          </div>
        </details>
      ))}
    </div>
  );
}

function CategoryAdmin({ store, updateStore, saveStatus, setSaveStatus }) {
  const blank = { id: uid("category"), name: "", slug: "", description: "", active: true, featured: false, order: store.categories.length + 1, image: logo("CAT", "#475569") };
  const [draft, setDraft] = useState(blank);
  const save = () => {
    if (isBlank(draft.order)) {
      setSaveStatus("Display order is required.");
      return;
    }
    updateStore((s) => ({ ...s, categories: [...s.categories.filter((c) => c.id !== draft.id), { ...draft, order: Number(draft.order), slug: draft.slug || slugify(draft.name) }] }), "✓ Category saved successfully", "✕ Failed to save category. Please try again.");
  };
  const form = (
    <div className="form-grid">
      <label>Category name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Category name" /></label>
      <label className="image-field">Category image URL<input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Paste image URL or upload below" /></label>
      <label className="image-field">Upload category image<input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files?.[0], (image) => setDraft({ ...draft, image }))} /></label>
      {draft.image && <div className="image-preview"><img src={draft.image} alt="Category preview" /></div>}
      <label>Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" /></label>
      <label>Display order<input type="number" value={draft.order ?? ""} onChange={(e) => setDraft({ ...draft, order: e.target.value })} /></label>
      <label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
      <label><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Featured</label>
    </div>
  );
  return <Editor title="Category Management" onNew={() => setDraft({ ...blank, id: uid("category") })} list={store.categories} pick={setDraft} activeId={draft.id} draft={form} save={save} remove={() => updateStore((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== draft.id) }), "✓ Category deleted successfully", "✕ Failed to delete category. Please try again.")} saveStatus={saveStatus} />;
}

function OfferAdmin({ store, updateStore, saveStatus, setSaveStatus }) {
  const first = store.products[0];
  const blank = { id: uid("offer"), title: "", productId: first?.id || "", variationId: first?.variations[0]?.id || "", price: "", originalPrice: "", description: "", startDate: "", endDate: "", active: true, image: "" };
  const [draft, setDraft] = useState(blank);
  const product = store.products.find((p) => p.id === draft.productId);
  const save = () => {
    if (draft.price === "" || draft.price === null || draft.price === undefined) {
      setSaveStatus("Price is required.");
      return;
    }
    const offer = {
      ...draft,
      price: Number(draft.price),
      originalPrice: draft.originalPrice === "" || draft.originalPrice === null || draft.originalPrice === undefined ? "" : Number(draft.originalPrice),
    };
    updateStore((s) => ({ ...s, offers: [...s.offers.filter((o) => o.id !== draft.id), offer] }), "✓ Offer saved successfully", "✕ Failed to save offer. Please try again.");
  };
  const form = (
    <div className="form-grid">
      <label>Offer title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Offer title" /></label>
      <label>Product<select value={draft.productId} onChange={(e) => { const p = store.products.find((item) => item.id === e.target.value); setDraft({ ...draft, productId: e.target.value, variationId: p?.variations[0]?.id || "" }); }}>{store.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Variation<select value={draft.variationId} onChange={(e) => setDraft({ ...draft, variationId: e.target.value })}>{product?.variations.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <label>Selling price<input type="number" value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
      <label>Original price<input type="number" value={draft.originalPrice ?? ""} onChange={(e) => setDraft({ ...draft, originalPrice: e.target.value })} /></label>
      <label>Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" /></label>
      <label>Start date<input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
      <label>End date<input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></label>
      <label className="image-field">Offer image URL<input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Paste image URL or upload below" /></label>
      <label className="image-field">Upload offer image<input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files?.[0], (image) => setDraft({ ...draft, image }))} /></label>
      {draft.image && <div className="image-preview"><img src={draft.image} alt="Offer preview" /></div>}
      <label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
    </div>
  );
  return <Editor title="Offer Management" onNew={() => setDraft({ ...blank, id: uid("offer") })} list={store.offers} pick={setDraft} activeId={draft.id} draft={form} save={save} remove={() => updateStore((s) => ({ ...s, offers: s.offers.filter((o) => o.id !== draft.id) }), "✓ Offer deleted successfully", "✕ Failed to delete offer. Please try again.")} saveStatus={saveStatus} />;
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
        <Field label="WhatsApp group link" value={draft.whatsappGroupLink} onChange={(whatsappGroupLink) => setDraft({ ...draft, whatsappGroupLink })} />
        <Field label="Offer timer minutes" value={draft.offerTimerMinutes} onChange={(offerTimerMinutes) => setDraft({ ...draft, offerTimerMinutes })} />
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
      <div className="actions editor-actions"><AdminStatusMessage message={saveStatus} /><button onClick={save}>Save Settings</button></div>
    </section>
  );
}

function Field({ label, value, onChange }) {
  return <label>{label}<input value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Editor({ title, list, pick, activeId, draft, save, remove, onNew, saveStatus }) {
  return <section className="admin-editor"><div className="section-head"><h2>{title}</h2><button onClick={onNew}>New</button></div><div className="editor-layout"><div className="admin-list">{list.map((item) => <button className={item.id === activeId ? "selected" : ""} key={item.id} onClick={() => pick(structuredClone(item))}>{item.name || item.title}<small>{item.active === false ? "Disabled" : "Active"}</small></button>)}</div><div className="editor-workspace">{draft}<div className="actions editor-actions"><AdminStatusMessage message={saveStatus} /><button onClick={save}>Save</button><button className="ghost delete-action" onClick={remove}>Delete</button></div></div></div></section>;
}

function AdminStatusMessage({ message }) {
  if (!message) return null;
  const normalized = message.toLowerCase();
  const kind = normalized.includes("failed") || normalized.includes("required") ? "error" : normalized.includes("saving") ? "saving" : "active";
  return <div className={`admin-status ${kind}`} role="status">{message}</div>;
}

function textToList(value) {
  return Array.isArray(value) ? value : value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function readImageFile(file, done) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxSize = 720;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      done(canvas.toDataURL("image/webp", 0.82));
    };
    image.onerror = () => done(reader.result);
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function Footer({ settings }) {
  return <footer><strong>{settings.siteName}</strong><span>{settings.footerText}</span><span>{settings.contact}</span><a href={settings.instagram}>Instagram</a>{whatsappGroupUrl(settings) && <a href={whatsappGroupUrl(settings)} target="_blank">WhatsApp Group</a>}</footer>;
}

function Empty({ title, action }) {
  return <div className="empty"><h2>{title}</h2>{action && <button onClick={action}>Back to products</button>}</div>;
}

export default App;
