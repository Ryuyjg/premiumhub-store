import { Component, useEffect, useMemo, useState } from "react";
import { logo, seedData } from "./storeData";
import "./App.css";
import "./upi.css";
import QRCode from "qrcode";
import { PhonePeLogo, GPayLogo, PaytmLogo, UpiLogo } from "./UpiLogos";
import { Catalog, Icon, StoreHeader, StoreHome, StoreOffers, StoreProductCard } from "./Storefront";
import { money, stockNumber, stockLimit, isAvailable, stockText, hasAvailableVariation, whatsappUrl } from "./storefrontUtils";

const STORE_KEY = "premium-hub-store-v2";
const CART_KEY = "premium-hub-cart-v1";

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isBlank = (value) => value === "" || value === null || value === undefined;
const productStockText = (product) => hasAvailableVariation(product) ? "In Stock" : "Stock Out";
const whatsappGroupUrl = (settings) => settings.whatsappGroupLink?.trim();
const setSavedStore = (data) => {
  try {
    // Store with a timestamp so we know when admin last saved locally
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...data, _savedAt: Date.now() }));
  } catch {
    // Uploaded images can exceed browser storage; database saving should still continue.
  }
};

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(item => item && typeof item.productId === "string" && typeof item.variationId === "string" && Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 1).map(item => ({ ...item, quantity: Math.floor(Number(item.quantity)) })) : [];
  } catch {
    return [];
  }
}

function loadStore() {
  try {
    localStorage.removeItem("premium-hub-store-v1");
  } catch {}
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (!saved) return seedData;
    const { _savedAt, ...parsed } = JSON.parse(saved);
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.products) || !Array.isArray(parsed.offers)) return seedData;
    const settings = { ...seedData.settings, ...parsed.settings };
    if (!settings.logoImage || settings.logoImage.startsWith("data:image")) {
      settings.logoImage = "/logo-icon.png";
    }
    return { ...seedData, ...parsed, settings };
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
  const hasLocalStore = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed?.products) && parsed.products.length > 0;
    } catch {
      return false;
    }
  }, []);

  const [store, setStore] = useState(loadStore);
  const [cart, setCart] = useState(loadCart);
  const [route, setRoute] = useState(currentRoute);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [dataStatus, setDataStatus] = useState(() => hasLocalStore ? "Refreshing catalog..." : "Loading catalog...");
  const [saveStatus, setSaveStatus] = useState("");
  const [timerTick, setTimerTick] = useState(() => Date.now());
  const isCatalogLoading = dataStatus === "Loading catalog...";

  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => {
    let active = true;
    const fetchFreshCatalog = () => {
      fetch(`/api/catalog?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Catalog API failed"))))
        .then((data) => {
          if (!active) return;
          if (data && Array.isArray(data.products)) {
            if (!data.settings?.logoImage || data.settings.logoImage.startsWith("data:image")) {
              data.settings = { ...data.settings, logoImage: "/logo-icon.png" };
            }
            setStore(data);
            setSavedStore(data);
          }
          setDataStatus("Database connected");
        })
        .catch(() => {
          if (active) setDataStatus("Using local data");
        });
    };

    fetchFreshCatalog();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchFreshCatalog();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, []);
  useEffect(() => {
    fetch("/api/session")
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((data) => setAdminAuthed(Boolean(data.authenticated)))
      .catch(() => setAdminAuthed(false));
  }, []);
  useEffect(() => {
    if (!saveStatus) return undefined;
    const timer = setTimeout(() => setSaveStatus(""), 2600);
    return () => clearTimeout(timer);
  }, [saveStatus]);
  useEffect(() => {
    const onPop = () => {
      setRoute(currentRoute());
      const position = history.state?.shopScroll || 0;
      requestAnimationFrame(() => requestAnimationFrame(() => scrollTo({ top: position, behavior: "instant" })));
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setTimerTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("premium-hub-currency-v1");
    } catch {}
  }, []);

  const ctx = useMemo(() => buildContext(store, timerTick), [store, timerTick]);
  const cartLines = useMemo(() => hydrateCart(cart, ctx), [cart, ctx]);
  const cartCount = cartLines.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
  const showStickyCart = cartCount > 0 && !route.startsWith("/cart") && !route.startsWith("/admin");
  const navigate = (path) => {
    if (path === route) { scrollTo({ top: 0, behavior: "instant" }); return; }
    history.replaceState({ ...history.state, shopScroll: window.scrollY }, "");
    history.pushState({ shopNavigation: true, shopScroll: 0 }, "", path);
    setRoute(path);
    scrollTo({ top: 0, behavior: "instant" });
  };
  const goBack = () => {
    if (history.state?.shopNavigation) history.back();
    else navigate("/");
  };
  const updateStore = async (next, successMessage = "✓ Changes saved successfully", _errorMessage = "✕ Failed to save changes. Please try again.") => {
    const updated = typeof next === "function" ? next(store) : next;
    setSaveStatus("Saving...");
    // Apply changes locally first so admin edits are not lost if the network drops.
    setStore(updated);
    setSavedStore(updated);
    try {
      const response = await fetch("/api/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updated),
      });
      if (!response.ok) {
        const error = new Error("Save failed");
        error.status = response.status;
        throw error;
      }
      const saved = await response.json();
      setStore(saved);
      setSavedStore(saved);
      setSaveStatus(successMessage);
    } catch (error) {
      // Keep the local changes, but make it clear that Vercel/catalog sync did not finish.
      setSaveStatus(error?.status === 401 || error?.status === 403
        ? "Admin session expired. Log in again, then press Save once more."
        : "Saved on this device only. Cloud save failed — press Save again to retry."
      );
    }
  };
  const addToCart = (productId, variationId, quantity = 1, unitPrice) => {
    const product = ctx.productById[productId];
    const variation = product?.variations.find((item) => item.id === variationId);
    if (!product?.active || !isAvailable(variation)) return false;
    const maxStock = stockLimit(variation);
    const currentQuantity = cart.find(item => item.productId === productId && item.variationId === variationId)?.quantity || 0;
    if (currentQuantity >= maxStock) return false;
    const price = unitPrice === undefined ? variation.price : Number(unitPrice);
    setCart((items) => {
      const found = items.find((item) => item.productId === productId && item.variationId === variationId);
      if (found) return items.map((item) => item === found ? { ...item, quantity: Math.min(maxStock, item.quantity + quantity), unitPrice: unitPrice === undefined ? item.unitPrice : price } : item);
      return [...items, { productId, variationId, quantity: Math.min(maxStock, Math.max(1, quantity)), unitPrice: price }];
    });
    return true;
  };
  const props = { store, ctx, cartLines, cart, setCart, addToCart, navigate, goBack, updateStore, adminAuthed, setAdminAuthed, dataStatus, saveStatus, setSaveStatus, setDataStatus, timerTick, isCatalogLoading };
  return (
    <div className={route.startsWith("/admin") ? "admin-app" : "storefront"}>
      <Header settings={store.settings} cartCount={cartCount} navigate={navigate} goBack={goBack} route={route} />
      <main className={showStickyCart ? "with-sticky-cart" : ""}>
        <RouteErrorBoundary route={route}>
          <div hidden={route !== "/"}><Home {...props} /></div>
          <div hidden={route !== "/products"}><Products {...props} /></div>
          {route.startsWith("/products/") && <Products {...props} slug={route.split("/")[2]} />}
          {route.startsWith("/categories") && <Categories {...props} slug={route.split("/")[2]} />}
          {route === "/offers" && <Offers {...props} />}
          {route === "/cart" && <Cart {...props} />}
          {route.startsWith("/admin") && <Admin {...props} />}
          {!(["/", "/products", "/categories", "/offers", "/cart"].includes(route) || route.startsWith("/products/") || route.startsWith("/categories/") || route.startsWith("/admin")) && <Empty title="Page not found" action={() => navigate("/")} />}
        </RouteErrorBoundary>
      </main>
      {showStickyCart && (
        <StickyCartButton count={cartCount} total={cartTotal} settings={store.settings} navigate={navigate} />
      )}
      {!route.startsWith("/admin") && <Footer settings={store.settings} />}
    </div>
  );
}

class RouteErrorBoundary extends Component {
  state = { failed: false, route: null };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props, state) {
    return props.route !== state.route ? { failed: false, route: props.route } : null;
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

function parseDateBoundary(dateStr, isEnd = false) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(trimmed + (isEnd ? "T23:59:59.999" : "T00:00:00.000"));
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function buildContext(store, timestamp) {
  const now = new Date(timestamp);
  const categories = [...store.categories].filter((c) => c.active).sort((a, b) => a.order - b.order);
  const products = [...store.products]
    .filter((p) => p.active && categories.some((c) => c.id === p.categoryId))
    .sort((a, b) => {
      const aInStock = hasAvailableVariation(a);
      const bInStock = hasAvailableVariation(b);
      if (aInStock !== bInStock) return aInStock ? -1 : 1;
      return (a.order || 0) - (b.order || 0);
    });

  const activeOffers = store.offers.filter((offer) => {
    if (!offer.active) return false;
    const start = parseDateBoundary(offer.startDate, false);
    const end = parseDateBoundary(offer.endDate, true);
    if (start && start > now) return false;
    if (end && end < now) return false;
    return true;
  });

  return {
    categories,
    products,
    activeOffers,
    categoryById: Object.fromEntries(categories.map((c) => [c.id, c])),
    productById: Object.fromEntries(products.map((p) => [p.id, p])),
  };
}

function hydrateCart(cart, ctx) {
  return cart.map((item) => {
    const product = ctx.productById[item.productId];
    const variation = product?.variations.find((v) => v.id === item.variationId);
    if (!product || !variation) return null;
    const savedPrice = Number(item.unitPrice);
    const unitPrice = Number.isFinite(savedPrice) && savedPrice >= 0 ? savedPrice : Number(variation.price);
    const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), stockLimit(variation));
    return {
      ...item,
      quantity,
      unitPrice,
      product,
      variation,
      lineTotal: unitPrice * quantity,
      purchasable: product.active && isAvailable(variation) && quantity <= stockLimit(variation)
    };
  }).filter(Boolean);
}

function Header(props) {
  if (!props.route.startsWith("/admin")) return <StoreHeader {...props} />;
  return <header className="site-header"><button className="brand" onClick={() => props.navigate("/")}>{props.settings.siteName}</button></header>;
}

function StickyCartButton({ count, total, navigate }) {
  return <button className="sticky-cart-cta" onClick={() => navigate("/cart")}><span>View cart ({count}) <Icon name="arrow" size={17} /></span><strong>{money(total)}</strong></button>;
}

function Home(props) {
  return <StoreHome {...props} />;
}

function CategoryGrid({ categories, navigate }) {
  return <div className="category-grid">{categories.map((category) => <button className="category-card" key={category.id} onClick={() => navigate(`/categories/${category.slug}`)}><img src={category.image} alt={category.name} loading="lazy" decoding="async" /><strong>{category.name}</strong><span>{category.description}</span></button>)}</div>;
}

function ProductGrid({ products, ctx, addToCart, cart, navigate }) {
  return <div className="shop-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} category={ctx.categoryById[product.categoryId]} addToCart={addToCart} cart={cart} navigate={navigate} />)}</div>;
}

function ProductCard(props) {
  return <StoreProductCard {...props} />;
}

function Products({ store, ctx, slug, addToCart, cart, navigate, isCatalogLoading }) {
  if (slug) return isCatalogLoading ? <section className="section page-top"><ProductSkeletonGrid /></section> : <ProductDetails key={slug} product={ctx.products.find((p) => p.slug === slug)} ctx={ctx} addToCart={addToCart} cart={cart} navigate={navigate} />;
  return <Catalog page ctx={ctx} settings={store.settings} addToCart={addToCart} cart={cart} navigate={navigate} isCatalogLoading={isCatalogLoading} />;
}

function ProductDetails({ product, ctx, addToCart, cart = [], navigate }) {
  const [variationId, setVariationId] = useState(product?.variations.find((v) => isAvailable(v))?.id || product?.variations[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  if (!product) return <Empty title="Product not found" action={() => navigate("/products")} />;
  const selected = product.variations.find((v) => v.id === variationId);
  const inCart = cart.find(item => item.productId === product.id && item.variationId === selected?.id)?.quantity || 0;
  const maxQuantity = Math.max(0, stockLimit(selected) - inCart);
  const canBuy = product.active && isAvailable(selected) && maxQuantity > 0;
  return (
    <section className="detail page-top">
      <div className="detail-image image-wrap">
        <img src={product.image} alt={`${product.name} logo`} decoding="async" fetchPriority="high" />
        {!hasAvailableVariation(product) && <span className="stock-badge">Stock Out</span>}
      </div>
      <div>
        <span className="pill">{ctx.categoryById[product.categoryId]?.name}</span><h1>{product.name}</h1><p>{product.description}</p>
        <span className={hasAvailableVariation(product) ? "stock detail-stock" : "stock out detail-stock"}>{productStockText(product)}</span>
        <div className="feature-list">{product.features.map((f) => <span key={f}>{f}</span>)}</div>
        <h2>Choose a plan</h2>
        <div className="plans">{product.variations.map((v) => {
          const stocked = isAvailable(v);
          const isSelected = variationId === v.id;
          return (
            <button disabled={!stocked} className={isSelected ? "plan active" : "plan"} key={v.id} onClick={() => stocked && setVariationId(v.id)}>
              <span className="plan-radio" aria-hidden="true" />
              <div className="plan-meta">
                <span className="plan-name">{v.name}</span>
                {v.shortDescription && <small className="plan-desc">{v.shortDescription}</small>}
              </div>
              <div className="plan-pricing">
                <strong>{money(v.price)}</strong>
                <span className={stocked ? "plan-stock" : "plan-stock out"}>{stockText(v)}</span>
              </div>
            </button>
          );
        })}</div>
        <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button><b>{quantity}</b><button disabled={quantity >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}>+</button></div>
        <div className="actions"><button disabled={!canBuy} onClick={() => { if (addToCart(product.id, selected.id, quantity)) setAdded(true); }}>Add to cart</button>{cart.length > 0 && <button className="ghost" onClick={() => navigate("/cart")}>View cart</button>}</div>
        {added && <p className="detail-added" role="status">Added to cart. You can keep shopping or open your cart.</p>}
      </div>
    </section>
  );
}

function Categories({ ctx, slug, navigate, store, addToCart, cart, isCatalogLoading }) {
  const category = slug ? ctx.categories.find((c) => c.slug === slug) : null;
  if (category) return <section className="section page-top category-page"><div className="category-hero"><img src={category.image} alt={`${category.name} logo`} /><div><h1>{category.name}</h1><p>{category.description}</p></div></div>{isCatalogLoading ? <ProductSkeletonGrid /> : <ProductGrid products={ctx.products.filter((p) => p.categoryId === category.id)} ctx={ctx} settings={store.settings} addToCart={addToCart} cart={cart} navigate={navigate} />}</section>;
  return <section className="section page-top"><h1>Categories</h1><CategoryGrid categories={ctx.categories} navigate={navigate} /></section>;
}

function Offers({ ctx, store, timerTick, isCatalogLoading }) {
  return (
    <section className="section page-top offers-page">
      <div className="offers-hero">
        <div>
          <span>Limited deals</span>
          <h1>Today&apos;s best offers</h1>
          <p>Special bundles and discounted plans ready to order on WhatsApp.</p>
        </div>
        <strong>{ctx.activeOffers.length} live {ctx.activeOffers.length === 1 ? "offer" : "offers"}</strong>
      </div>
      {isCatalogLoading ? <ProductSkeletonGrid /> : <OfferGrid offers={ctx.activeOffers} settings={store.settings} timerTick={timerTick} />}
    </section>
  );
}

function ProductSkeletonGrid() {
  return <div className="shop-product-grid" aria-label="Loading products">{Array.from({ length: 6 }).map((_, index) => <div className="shop-product-skeleton" key={index} />)}</div>;
}

function OfferGrid({ offers, settings }) {
  if (!offers.length) return <Empty title="New deals are on the way" />;
  return <StoreOffers offers={offers} settings={settings} />;
}

const UPI_ID = "anshidop@upi";
const MERCHANT_NAME = "Premium Hub";
const SUPPORT_PHONE = "+917012958322";
const SUPPORT_PHONE_CLEAN = "917012958322";

function getUpiLink(app, amount) {
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const amt = Number(amount).toFixed(2);
  const base = `pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodeURIComponent(amt)}&cu=INR&tn=Order`;

  if (isAndroid) {
    if (app === "phonepe") {
      return `intent://pay?${base}#Intent;scheme=upi;package=com.phonepe.app;end`;
    }
    if (app === "gpay") {
      return `intent://pay?${base}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    }
    if (app === "paytm") {
      return `intent://pay?${base}#Intent;scheme=upi;package=net.one97.paytm;end`;
    }
    return `upi://pay?${base}`;
  }

  if (isIOS) {
    if (app === "phonepe") return `phonepe://pay?${base}`;
    if (app === "gpay") return `gpay://upi/pay?${base}`;
    if (app === "paytm") return `paytmmp://pay?${base}`;
    return `upi://pay?${base}`;
  }

  if (app === "phonepe") return `phonepe://pay?${base}`;
  if (app === "gpay") return `tez://upi/pay?${base}`;
  if (app === "paytm") return `paytmmp://pay?${base}`;
  return `upi://pay?${base}`;
}

function OrderCompletedClaimScreen({ orderId, items, total, onBackToStore }) {
  const itemsList = Array.isArray(items) ? items : [];
  const itemsText = itemsList
    .map(
      (i) =>
        `- ${i.product?.name || i.name} (${i.variation?.name || i.variation || "Plan"}) x ${i.quantity || i.qty || 1} - ${money(i.lineTotal || i.price)}`
    )
    .join("\n");

  const waMessage = `Hello Premium Hub! 🚀\nI have completed my payment on your store.\n\n📦 Order ID: ${orderId || "PAID"}\n🛍️ Items:\n${itemsText}\n💰 Total Paid: ${money(total)} (Payment Verified)\n\nPlease share my subscription login credentials here. Thank you!`;

  const waUrl = `https://wa.me/${SUPPORT_PHONE_CLEAN}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="claim-card">
      <span className="claim-icon">🎉</span>
      <h2 className="claim-title">Payment Confirmed & Verified!</h2>
      <p className="claim-subtitle">
        Your payment was received. Tap the button below to message us on WhatsApp and receive your subscription credentials immediately.
      </p>

      <div className="claim-details-box">
        <div className="claim-order-header">
          <span className="claim-order-id">Order Ref: {orderId || "Verified"}</span>
          <span className="claim-verified-pill">PAID ✅</span>
        </div>

        {itemsList.map((item, idx) => (
          <div key={idx} className="claim-item-row">
            <span>
              <strong>{item.product?.name || item.name}</strong> &middot; {item.variation?.name || item.variation} x {item.quantity || item.qty || 1}
            </span>
            <strong>{money(item.lineTotal || item.price)}</strong>
          </div>
        ))}

        <div className="claim-total-row">
          <span>Total Paid</span>
          <span>{money(total)}</span>
        </div>
      </div>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="claim-wa-btn"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        <span>Chat on WhatsApp to Receive Credentials</span>
      </a>

      <div className="claim-support-note">
        Support Number: <strong className="claim-support-phone">{SUPPORT_PHONE}</strong>
        <br />
        Your order ID, products, and verified payment total will be sent automatically.
      </div>

      {onBackToStore && (
        <button
          type="button"
          onClick={onBackToStore}
          className="ghost"
          style={{ marginTop: 20, fontSize: "0.88rem" }}
        >
          &larr; Continue Shopping
        </button>
      )}
    </div>
  );
}

function UpiPaymentCheckout({ cartLines, total, onSuccess, onCancel }) {
  const [step, setStep] = useState("active");
  const [orderId, setOrderId] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [showQrOnMobile, setShowQrOnMobile] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(480);

  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Register order session immediately
  useEffect(() => {
    let active = true;
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartLines.map((i) => ({
          name: i.product.name,
          variation: i.variation.name,
          qty: i.quantity,
          price: i.lineTotal,
        })),
        total,
        upiApp: isMobile ? "mobile_upi" : "qr_scan",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (active && data.id) setOrderId(data.id);
      })
      .catch((err) => console.error("Auto order creation error:", err));

    return () => {
      active = false;
    };
  }, []);

  // Generate dynamic QR code
  useEffect(() => {
    const uri = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodeURIComponent(Number(total).toFixed(2))}&cu=INR&tn=Order`;
    QRCode.toDataURL(uri, {
      width: 260,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setQrCodeDataUrl)
      .catch((err) => console.error("QR Code Error:", err));
  }, [total]);

  // Session timer
  useEffect(() => {
    if (step !== "active" || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  // Background poller
  useEffect(() => {
    if (step !== "active" || !orderId) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (data.status === "confirmed") {
          setStep("done");
          onSuccess({ id: orderId, items: cartLines, total });
        } else if (data.status === "rejected") {
          setStep("failed");
          setStatusMsg("Payment was declined or timed out. Please contact us on WhatsApp.");
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [step, orderId, onSuccess]);

  const handleAppClick = (app) => {
    const link = getUpiLink(app, total);
    window.location.href = link;
  };

  const copyVpa = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(UPI_ID);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (step === "done") {
    return (
      <OrderCompletedClaimScreen
        orderId={orderId}
        items={cartLines}
        total={total}
        onBackToStore={onCancel}
      />
    );
  }

  if (step === "failed") {
    return (
      <div className="upi-result upi-failed">
        <span className="upi-result-icon">&#x274C;</span>
        <h3>Payment Declined</h3>
        <p>{statusMsg || "We could not verify your payment. Please try again or reach out on WhatsApp."}</p>
        <button type="button" className="upi-toggle-btn" onClick={onCancel} style={{ marginTop: 12 }}>
          &larr; Return to Cart
        </button>
      </div>
    );
  }

  const shouldShowQr = !isMobile || showQrOnMobile;

  return (
    <div className="upi-checkout">
      <div className="upi-checkout-header">
        <h3>Fast UPI Payment</h3>
        <p>Auto-detecting payment &middot; Zero transaction fee</p>
        <div className="upi-amount-pill">
          <span>Amount:</span>
          <strong>{money(total)}</strong>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div className="upi-live-status">
          <span className="upi-pulse-dot" />
          <span>Waiting for payment...</span>
        </div>
        <div className="upi-timer-badge">
          Session expires in <strong>{formatTimer(secondsLeft)}</strong>
        </div>
      </div>

      {shouldShowQr && (
        <div className="upi-qr-card">
          <div className="upi-qr-image-wrap">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="UPI QR Code" className="upi-qr-img" />
            ) : (
              <div style={{ width: 210, height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span>Generating secure QR...</span>
              </div>
            )}
            <span className="upi-qr-badge">{money(total)}</span>
          </div>

          <p className="upi-qr-hint">Scan with any UPI app to pay</p>
          <p className="upi-qr-subtext">PhonePe, Google Pay, Paytm, CRED or BHIM</p>

          <div className="upi-vpa-copy-row">
            <span>UPI ID: <strong>{UPI_ID}</strong></span>
            <button type="button" className="upi-vpa-copy-btn" onClick={copyVpa}>
              {copiedVpa ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="upi-apps-label">
          {isMobile ? "Tap to Pay with UPI App" : "Or Pay Directly on this Device"}
        </div>
        <div className="upi-apps-grid">
          <button
            type="button"
            className="upi-app-btn"
            onClick={() => handleAppClick("phonepe")}
          >
            <PhonePeLogo size={32} />
            <span>PhonePe</span>
          </button>

          <button
            type="button"
            className="upi-app-btn"
            onClick={() => handleAppClick("gpay")}
          >
            <GPayLogo size={32} />
            <span>GPay</span>
          </button>

          <button
            type="button"
            className="upi-app-btn"
            onClick={() => handleAppClick("paytm")}
          >
            <PaytmLogo size={32} />
            <span>Paytm</span>
          </button>

          <button
            type="button"
            className="upi-app-btn"
            onClick={() => handleAppClick("upi")}
          >
            <UpiLogo size={32} />
            <span>Any UPI</span>
          </button>
        </div>
      </div>

      {isMobile && (
        <button
          type="button"
          className="upi-toggle-btn"
          onClick={() => setShowQrOnMobile(!showQrOnMobile)}
        >
          {showQrOnMobile ? "Hide QR Code" : "📷 Show QR Code to scan from another phone"}
        </button>
      )}

      <p className="upi-auto-hint">
        Do not refresh or close this tab. Once paid, the screen confirms automatically.
      </p>

      {orderId && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <small className="upi-order-ref">Session: {orderId}</small>
        </div>
      )}

      <button type="button" className="upi-cancel-btn" onClick={onCancel}>
        &larr; Cancel and return to cart
      </button>
    </div>
  );
}

function Cart({ cartLines, setCart, store, goBack }) {
  const total = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
  const orderReady = cartLines.length > 0 && cartLines.every((item) => item.purchasable);
  const [showUpi, setShowUpi] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const message = `${store.settings.whatsappMessage}\n\nOrder Details:\n${cartLines.map((item, i) => `${i + 1}. ${item.product.name} - ${item.variation.name} x ${item.quantity} - ${money(item.lineTotal)}`).join("\n")}\n\nTotal: ${money(total)}\n\nPlease let me know the payment details and next steps.`;

  const updateQty = (productId, variationId, nextQty, maxStock) => {
    const validQty = Math.max(1, Math.min(Number.isFinite(maxStock) ? maxStock : Infinity, nextQty));
    setCart((cart) => cart.map((c) => c.productId === productId && c.variationId === variationId ? { ...c, quantity: validQty } : c));
  };

  const removeItem = (productId, variationId) => {
    setCart((cart) => cart.filter((c) => !(c.productId === productId && c.variationId === variationId)));
  };

  if (completedOrder) {
    return (
      <section className="section page-top cart-page">
        <OrderCompletedClaimScreen
          orderId={completedOrder.id}
          items={completedOrder.items}
          total={completedOrder.total}
          onBackToStore={() => {
            setCompletedOrder(null);
            goBack();
          }}
        />
      </section>
    );
  }

  if (showUpi && orderReady) {
    return (
      <section className="section page-top cart-page">
        <div className="section-head"><h1>Complete Payment</h1></div>
        <div className="upi-checkout-wrap">
          <UpiPaymentCheckout
            cartLines={cartLines}
            total={total}
            store={store}
            onSuccess={(orderData) => {
              setCart([]);
              setCompletedOrder(orderData);
              setShowUpi(false);
            }}
            onCancel={() => setShowUpi(false)}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="section page-top cart-page">
      <div className="section-head"><h1>Your Cart</h1></div>
      {!cartLines.length ? (
        <Empty title="Your cart is empty" action={goBack} />
      ) : (
        <div className="cart-layout">
          <div className="cart-items-list">
            {cartLines.map((item) => {
              const maxStock = stockLimit(item.variation);
              return (
                <div className="cart-row" key={`${item.productId}-${item.variationId}`}>
                  <img src={item.product.image} alt={item.product.name} />
                  <div className="cart-item-info">
                    <strong>{item.product.name}</strong>
                    <span className="cart-item-variation">{item.variation.name}</span>
                    {item.variation.shortDescription && <small>{item.variation.shortDescription}</small>}
                    {!item.purchasable && <small className="danger">Currently out of stock</small>}
                  </div>
                  <div className="cart-qty-control">
                    <button type="button" className="qty-btn" disabled={item.quantity <= 1} onClick={() => updateQty(item.productId, item.variationId, item.quantity - 1, maxStock)}>-</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button type="button" className="qty-btn" disabled={Number.isFinite(maxStock) && item.quantity >= maxStock} onClick={() => updateQty(item.productId, item.variationId, item.quantity + 1, maxStock)}>+</button>
                  </div>
                  <div className="cart-item-pricing">
                    <strong className="cart-item-total">{money(item.lineTotal)}</strong>
                    {item.quantity > 1 && <small className="cart-unit-hint">({money(item.unitPrice)} each)</small>}
                  </div>
                  <button type="button" className="cart-remove-btn" title="Remove item" onClick={() => removeItem(item.productId, item.variationId)}>x</button>
                </div>
              );
            })}
          </div>
          <aside className="summary cart-summary-card">
            <h3>Order Summary</h3>
            <div className="summary-line">
              <span>Items ({cartLines.reduce((s, i) => s + i.quantity, 0)})</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-line"><span>Delivery</span><span className="free-badge">Instant Digital</span></div>
            <hr className="summary-divider" />
            <div className="summary-line total-line"><span>Total</span><strong>{money(total)}</strong></div>
            {store.settings?.enableUpiPayment !== false ? (
              <>
                <button
                  className={orderReady ? "order-btn full-btn" : "order-btn full-btn disabled"}
                  disabled={!orderReady}
                  onClick={() => orderReady && setShowUpi(true)}
                  style={{ background: "linear-gradient(135deg, #5f259f 0%, #4285F4 100%)", border: "none" }}
                >
                  💳 Pay with UPI
                </button>
                <a
                  className={orderReady ? "order-btn full-btn ghost" : "order-btn full-btn ghost disabled"}
                  href={orderReady ? whatsappUrl(store.settings, message) : undefined}
                  aria-disabled={!orderReady}
                  tabIndex={orderReady ? 0 : -1}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => { if (!orderReady) { event.preventDefault(); return; } setCart([]); }}
                  style={{ marginTop: 8, textAlign: "center" }}
                >
                  Order on WhatsApp 💬
                </a>
              </>
            ) : (
              <a
                className={orderReady ? "order-btn full-btn" : "order-btn full-btn disabled"}
                href={orderReady ? whatsappUrl(store.settings, message) : undefined}
                aria-disabled={!orderReady}
                tabIndex={orderReady ? 0 : -1}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => { if (!orderReady) { event.preventDefault(); return; } setCart([]); }}
                style={{ textAlign: "center" }}
              >
                Order on WhatsApp 💬
              </a>
            )}
            <button className="continue-shopping" onClick={goBack}><Icon name="back" size={17} /> Continue shopping</button>
            <p className="summary-guarantee">
              {store.settings?.enableUpiPayment !== false
                ? "Secure UPI payment · Zero fees · Instant delivery"
                : "Review your plan with us on WhatsApp before payment."}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
function Admin({ store, updateStore, adminAuthed, setAdminAuthed, saveStatus, setSaveStatus }) {
  const [tab, setTab] = useState("orders");
  const [pendingCount, setPendingCount] = useState(0);

  if (!adminAuthed) return <Login onLogin={() => setAdminAuthed(true)} />;

  const stats = {
    pending_orders: pendingCount,
    products: store.products.length,
    categories: store.categories.length,
    offers: store.offers.filter((o) => o.active).length,
    out_of_stock: store.products.filter((p) => !hasAvailableVariation(p)).length,
  };

  return (
    <section className="admin page-top">
      <div className="admin-head">
        <div><h1>Admin Dashboard</h1></div>
        <div className="admin-head-actions">
          <button className="ghost" type="button" onClick={() => optimizeAllStoreImages(store, updateStore, setSaveStatus)}>⚡ Speed Boost</button>
          <button className="ghost" onClick={async () => { await fetch("/api/logout", { method: "POST", credentials: "include" }); setAdminAuthed(false); }}>Logout</button>
        </div>
      </div>
      <div className="stats">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} style={k === "pending_orders" && v > 0 ? { border: "1.5px solid #f59e0b", background: "#fef3c7" } : {}}>
            <strong style={k === "pending_orders" && v > 0 ? { color: "#b45309" } : {}}>{v}</strong>
            <span>{k.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
      <div className="tabs">
        {["orders", "products", "categories", "offers", "settings"].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
            style={item === "orders" && pendingCount > 0 ? { position: "relative", fontWeight: 800 } : {}}
          >
            {item === "orders" ? `Orders ${pendingCount > 0 ? `(${pendingCount})` : ""}` : item}
          </button>
        ))}
      </div>
      <AdminStatusMessage message={saveStatus} />
      {tab === "orders" && <OrdersAdmin store={store} updateStore={updateStore} onPendingCountChange={setPendingCount} />}
      {tab === "products" && <ProductAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} setSaveStatus={setSaveStatus} />}
      {tab === "categories" && <CategoryAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} setSaveStatus={setSaveStatus} />}
      {tab === "offers" && <OfferAdmin store={store} updateStore={updateStore} saveStatus={saveStatus} setSaveStatus={setSaveStatus} />}
      {tab === "settings" && <SettingsAdmin key={JSON.stringify(store.settings)} store={store} updateStore={updateStore} saveStatus={saveStatus} />}
    </section>
  );
}

function OrdersAdmin({ store, updateStore, onPendingCountChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionMsg, setActionMsg] = useState("");

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
        const pCount = data.filter((o) => o.status === "pending").length;
        if (onPendingCountChange) onPendingCountChange(pCount);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load initially + auto-refresh every 5 seconds so admin sees new payments live!
  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (id, status) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setActionMsg(status === "confirmed" ? "✅ Payment confirmed! Customer screen updated." : "❌ Order marked as rejected.");
        setTimeout(() => setActionMsg(""), 3500);
        loadOrders();
      }
    } catch {
      setActionMsg("Failed to update order status. Please retry.");
    }
  };

  const pendingList = orders.filter((o) => o.status === "pending");
  const shownOrders = orders.filter((o) => filter === "all" || o.status === filter);

  return (
    <section className="admin-editor">
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2>Payment Verification</h2>
          <button
            type="button"
            className={store.settings?.enableUpiPayment !== false ? "upi-status-pill online" : "upi-status-pill offline"}
            onClick={() => {
              const current = store.settings?.enableUpiPayment !== false;
              updateStore(
                (s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    enableUpiPayment: !current,
                  },
                }),
                `UPI Gateway turned ${!current ? "ON" : "OFF"}`
              );
            }}
            title={store.settings?.enableUpiPayment !== false ? "Click to turn OFF UPI and use WhatsApp orders only" : "Click to turn ON UPI payment gateway"}
          >
            {store.settings?.enableUpiPayment !== false ? "🟢 UPI Gateway: ONLINE (Tap to turn OFF)" : "🔴 UPI Gateway: OFFLINE (Tap to turn ON)"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className={filter === "pending" ? "active" : "ghost"}
            onClick={() => setFilter("pending")}
            style={{ fontSize: 13, padding: "5px 12px" }}
          >
            Pending ({pendingList.length})
          </button>
          <button
            type="button"
            className={filter === "confirmed" ? "active" : "ghost"}
            onClick={() => setFilter("confirmed")}
            style={{ fontSize: 13, padding: "5px 12px" }}
          >
            Confirmed
          </button>
          <button
            type="button"
            className={filter === "rejected" ? "active" : "ghost"}
            onClick={() => setFilter("rejected")}
            style={{ fontSize: 13, padding: "5px 12px" }}
          >
            Rejected
          </button>
          <button
            type="button"
            className={filter === "all" ? "active" : "ghost"}
            onClick={() => setFilter("all")}
            style={{ fontSize: 13, padding: "5px 12px" }}
          >
            All ({orders.length})
          </button>
          <button type="button" className="ghost" onClick={loadOrders} style={{ fontSize: 13, padding: "5px 12px" }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {actionMsg && <div className="admin-status active" style={{ marginBottom: 16 }}>{actionMsg}</div>}

      {loading && orders.length === 0 ? (
        <p style={{ padding: 24, textAlign: "center" }}>Checking incoming orders...</p>
      ) : shownOrders.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", borderRadius: 16, border: "1.5px dashed #cbd5e1" }}>
          <p style={{ margin: 0, fontSize: "1rem", color: "#64748b", fontWeight: 600 }}>
            No {filter} payment sessions found.
          </p>
          <small style={{ color: "#94a3b8" }}>When a customer opens UPI checkout, their session appears here in real time.</small>
        </div>
      ) : (
        <div className="orders-list">
          {shownOrders.map((order) => {
            const items = (() => {
              try {
                return typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
              } catch {
                return [];
              }
            })();

            const createdTime = new Date(order.created_at);
            const minutesAgo = Math.round((Date.now() - createdTime.getTime()) / 60000);
            const timeFormatted = isNaN(createdTime.getTime())
              ? "Just now"
              : minutesAgo < 1
              ? "Just now"
              : minutesAgo < 60
              ? `${minutesAgo}m ago`
              : `${Math.round(minutesAgo / 60)}h ago`;

            return (
              <div key={order.id} className={`order-card order-${order.status}`}>
                <div className="order-card-top">
                  <div>
                    <strong className="order-id">{order.id}</strong>
                    <span className="order-meta">
                      Method: <strong>{order.upi_app || "UPI"}</strong> &middot; {timeFormatted}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <strong className="order-total">{money(order.total)}</strong>
                    <span className={`order-status-badge order-status-${order.status}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="order-items">
                  {items.map((item, idx) => (
                    <span key={idx} className="order-item-pill">
                      {item.name} &middot; {item.variation} {item.qty > 1 ? `x${item.qty}` : ""} ({money(item.price)})
                    </span>
                  ))}
                </div>

                {order.status === "pending" && (
                  <div className="order-actions">
                    <button
                      type="button"
                      className="order-confirm-btn"
                      onClick={() => handleAction(order.id, "confirmed")}
                    >
                      ✅ Confirm Payment
                    </button>
                    <button
                      type="button"
                      className="order-reject-btn"
                      onClick={() => handleAction(order.id, "rejected")}
                    >
                      ❌ Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  const makeDefaultVar = (pid = "var") => ({ id: uid(pid), name: "1 Month", price: "", originalPrice: "", shortDescription: "", stock: 10, inStock: true, sku: "", order: 1 });
  const blank = { id: uid("product"), name: "", slug: "", categoryId: store.categories[0]?.id || "", image: logo("NEW", "#334155"), shortDescription: "", description: "", features: [], active: true, inStock: true, stock: 10, featured: false, order: store.products.length + 1, variations: [makeDefaultVar()] };
  const [draft, setDraft] = useState(blank);

  const pickProduct = (item) => {
    const cloned = structuredClone(item);
    if (!cloned.variations || cloned.variations.length === 0) {
      cloned.variations = [makeDefaultVar(cloned.id)];
    }
    setDraft(cloned);
  };

  const save = () => {
    if (!draft.name || !draft.name.trim()) {
      setSaveStatus("Product name is required.");
      return;
    }
    if (isBlank(draft.order)) {
      setSaveStatus("Display order is required.");
      return;
    }
    if (!draft.variations || draft.variations.length === 0) {
      setSaveStatus("⚠️ Please add at least one plan variation with a selling price (e.g. 1 Month).");
      return;
    }
    const missingPrice = draft.variations.some((v) => isBlank(v.price) || Number(v.price) <= 0);
    if (missingPrice) {
      setSaveStatus("⚠️ Selling price (₹ INR) is required for all plans.");
      return;
    }
    const variations = draft.variations.map((variation, index) => {
      const hasStockValue = !(variation.stock === "" || variation.stock === null || variation.stock === undefined);
      const rawStock = hasStockValue ? Number(variation.stock) : (variation.inStock !== false ? 10 : 0);
      const variationStock = Math.max(0, Number.isFinite(rawStock) ? rawStock : 0);
      const originalPrice = variation.originalPrice === "" || variation.originalPrice === null || variation.originalPrice === undefined ? "" : Number(variation.originalPrice);
      return {
        ...variation,
        name: variation.name || `Plan ${index + 1}`,
        price: Number(variation.price),
        originalPrice,
        stock: variationStock,
        inStock: variation.inStock !== false && variationStock > 0,
      };
    });
    const stock = variations.reduce((sum, v) => sum + (v.inStock ? stockNumber(v) : 0), 0);
    const inStock = variations.some((v) => v.inStock && stockNumber(v) > 0);
    updateStore(
      (s) => ({
        ...s,
        products: [
          ...s.products.filter((p) => p.id !== draft.id),
          {
            ...draft,
            slug: draft.slug || slugify(draft.name),
            features: textToList(draft.features),
            stock,
            order: Number(draft.order),
            inStock,
            variations,
          },
        ],
      }),
      "✓ Product saved successfully",
      "✕ Failed to save product. Please try again."
    );
  };
  return <Editor title="Product Management" onNew={() => setDraft({ ...blank, id: uid("product"), variations: [makeDefaultVar()] })} list={store.products} pick={pickProduct} activeId={draft.id} draft={<ProductForm draft={draft} setDraft={setDraft} categories={store.categories} />} save={save} remove={() => updateStore((s) => ({ ...s, products: s.products.filter((p) => p.id !== draft.id) }), "✓ Product deleted successfully", "✕ Failed to delete product. Please try again.")} saveStatus={saveStatus} />;
}

function ProductForm({ draft, setDraft, categories }) {
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
          <label className="image-field">Upload product image<input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files?.[0], (image) => patch("image", image), 400, 0.75)} /></label>
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
            <p>Set selling price, MRP, and stock availability for each plan.</p>
          </div>
        </div>
        <VariationEditor variations={draft.variations} setVariations={(variations) => patch("variations", variations)} productId={draft.id} />
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

function VariationEditor({ variations, setVariations, productId }) {
  const set = (id, key, value) => setVariations(variations.map((v) => (v.id === id ? { ...v, [key]: value } : v)));
  const setStock = (id, value) => {
    setVariations(variations.map((v) => {
      if (v.id !== id) return v;
      const quantity = Number(value);
      return { ...v, stock: value, inStock: value !== "" && Number.isFinite(quantity) && quantity > 0 };
    }));
  };
  const markStock = (id, stocked) => {
    setVariations(variations.map((v) => {
      if (v.id !== id) return v;
      return { ...v, stock: stocked ? Math.max(1, stockNumber(v) || 10) : 0, inStock: stocked };
    }));
  };
  const addVar = () => {
    setVariations([
      ...variations,
      {
        id: uid(productId || "var"),
        name: variations.length === 0 ? "1 Month" : `${variations.length + 1} Months`,
        price: "",
        originalPrice: "",
        shortDescription: "",
        stock: 10,
        inStock: true,
        sku: "",
        order: variations.length + 1,
      },
    ]);
  };
  return (
    <div className="variation-editor">
      <div className="variation-title">
        <div>
          <h4>Plan Variations & Pricing</h4>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghost"
            style={{ fontSize: "12px", padding: "4px 10px", fontWeight: 700 }}
            onClick={() => setVariations(variations.map((v) => ({ ...v, inStock: true, stock: Math.max(1, stockNumber(v) || 10) })))}
            title="Mark all plans in stock"
          >
            ✓ All In Stock
          </button>
          <button
            type="button"
            className="ghost"
            style={{ fontSize: "12px", padding: "4px 10px", fontWeight: 700, color: "#ef4444", borderColor: "#fca5a5" }}
            onClick={() => setVariations(variations.map((v) => ({ ...v, inStock: false, stock: 0 })))}
            title="Mark all plans stock out"
          >
            ✕ All Stock Out
          </button>
          <button type="button" className="ghost" onClick={addVar}>+ Add Another Plan</button>
        </div>
      </div>
      {!variations.length && (
        <div style={{ padding: "16px", background: "rgba(255, 107, 107, 0.12)", border: "1px solid rgba(255, 107, 107, 0.3)", borderRadius: "14px", textAlign: "center" }}>
          <p style={{ margin: "0 0 10px 0", color: "#FF6B6B", fontWeight: "bold" }}>⚠️ No pricing plan added! Add at least one plan so customers can order.</p>
          <button type="button" onClick={addVar}>+ Add Plan & Price</button>
        </div>
      )}
      {variations.map((v, index) => (
        <details className="variation-card" key={v.id} open>
          <summary>
            <span className="variation-name">Plan #{index + 1}: {v.name || "New plan"}</span>
            <span style={{ color: isBlank(v.price) ? "#FF6B6B" : "inherit" }}>₹: {isBlank(v.price) ? "⚠️ Required" : `₹${v.price}`}</span>
            <span className={isAvailable(v) ? "stock-dot" : "stock-dot out"}>{isAvailable(v) ? `In Stock (${stockNumber(v)})` : "Stock Out"}</span>
          </summary>
          <div className="variation-row">
            <label>Plan duration / name *<input value={v.name} onChange={(e) => set(v.id, "name", e.target.value)} placeholder="e.g. 1 Month, 1 Year" required /></label>
            <label>Selling price (₹ INR) *<input type="number" min="0" value={v.price ?? ""} onChange={(e) => set(v.id, "price", e.target.value)} placeholder="e.g. 199" required /></label>
            <label>Original / MRP price (₹ INR)<input type="number" min="0" value={v.originalPrice ?? ""} onChange={(e) => set(v.id, "originalPrice", e.target.value)} placeholder="e.g. 399" /></label>
            <label>Plan note<input value={v.shortDescription || ""} onChange={(e) => set(v.id, "shortDescription", e.target.value)} placeholder="e.g. Private account • 25 days" /></label>
            <label>Stock qty<input type="number" min="0" value={v.stock ?? (v.inStock ? 10 : 0)} onChange={(e) => setStock(v.id, e.target.value)} placeholder="10" /></label>
            <div className="stock-actions" aria-label="Stock status">
              <button type="button" className={isAvailable(v) ? "active" : ""} onClick={() => markStock(v.id, true)}>In stock</button>
              <button type="button" className={!isAvailable(v) ? "danger active" : "danger"} onClick={() => markStock(v.id, false)}>Stock out</button>
            </div>
            <button type="button" className="text-btn danger-btn" onClick={() => setVariations(variations.filter((item) => item.id !== v.id))}>Delete plan</button>
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
    if (!draft.name || !draft.name.trim()) {
      setSaveStatus("Category name is required.");
      return;
    }
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
      <label className="image-field">Upload category image<input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files?.[0], (image) => setDraft({ ...draft, image }), 320, 0.75)} /></label>
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
  const blank = { id: uid("offer"), title: "", itemName: "", price: "", originalPrice: "", description: "", startDate: "", endDate: "", active: true, image: "" };
  const [draft, setDraft] = useState(blank);
  const save = () => {
    if (draft.price === "" || draft.price === null || draft.price === undefined) {
      setSaveStatus("Price (₹ INR) is required.");
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
      <label>Offer title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Netflix + Prime Combo" /></label>
      <label>Item name (shown on offer card)<input value={draft.itemName || ""} onChange={(e) => setDraft({ ...draft, itemName: e.target.value })} placeholder="e.g. Netflix Premium + Amazon Prime" /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <label>Selling price (₹ INR) *<input type="number" value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="e.g. 149" /></label>
        <label>Original price (₹ INR)<input type="number" value={draft.originalPrice ?? ""} onChange={(e) => setDraft({ ...draft, originalPrice: e.target.value })} placeholder="e.g. 499" /></label>
      </div>
      <label>Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Short description of this offer" /></label>
      <label>Start date<input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
      <label>
        End date <small style={{ fontWeight: 400, color: "#64748b" }}>(leave blank for no expiry)</small>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} style={{ flex: 1 }} />
          {draft.endDate && (
            <button type="button" className="ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", whiteSpace: "nowrap" }} onClick={() => setDraft({ ...draft, endDate: "" })}>Clear</button>
          )}
        </div>
      </label>
      <label className="image-field">Offer image URL<input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Paste image URL or upload below" /></label>
      <label className="image-field">Upload offer image<input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files?.[0], (image) => setDraft({ ...draft, image }), 400, 0.75)} /></label>
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
          <input type="file" accept="image/*" onChange={(e) => readImageFile(e.target.files[0], (image) => setDraft({ ...draft, logoImage: image }), 240, 0.75)} />
        </label>
        {draft.logoImage && <div className="logo-preview"><img src={draft.logoImage} alt="Logo preview" /></div>}
        <label>Footer text<textarea value={draft.footerText || ""} onChange={(e) => setDraft({ ...draft, footerText: e.target.value })} /></label>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", gridColumn: "1 / -1", background: "#f8fafc", padding: "14px 18px", borderRadius: 14, border: "1.5px solid #e2e8f0" }}>
          <input
            type="checkbox"
            checked={draft.enableUpiPayment !== false}
            onChange={(e) => setDraft({ ...draft, enableUpiPayment: e.target.checked })}
            style={{ width: 20, height: 20, cursor: "pointer" }}
          />
          <div>
            <strong style={{ fontSize: "0.95rem" }}>Enable Instant UPI Payment Gateway</strong>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}>
              When turned ON, customers can pay via PhonePe, GPay, Paytm or QR. Turn OFF when away from your PC to revert to direct WhatsApp orders.
            </div>
          </div>
        </label>
        <label>WhatsApp message<textarea value={draft.whatsappMessage || ""} onChange={(e) => setDraft({ ...draft, whatsappMessage: e.target.value })} /></label>
      </div>
      <div className="actions editor-actions"><AdminStatusMessage message={saveStatus} /><button onClick={save}>Save Settings</button></div>
    </section>
  );
}

function Field({ label, value, onChange }) {
  return <label>{label}<input value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function getAdminItemStatus(item) {
  if (item.active === false) return { text: "Disabled", danger: true };
  if (Array.isArray(item.variations) && !hasAvailableVariation(item)) return { text: "Stock Out", danger: true };
  if (item.endDate) {
    const end = parseDateBoundary(item.endDate, true);
    if (end && end < new Date()) {
      return { text: `Expired (${item.endDate})`, danger: true };
    }
  }
  return { text: "In Stock", danger: false };
}

function Editor({ title, list, pick, activeId, draft, save, remove, onNew, saveStatus }) {
  const selectedItem = list.find((item) => item.id === activeId);
  const selectedName = selectedItem?.name || selectedItem?.title || "this item";
  const handleDelete = () => {
    if (!selectedItem) return;
    if (window.confirm(`Delete ${selectedName}? This removes it from the website after save.`)) {
      remove();
    }
  };
  return (
    <section className="admin-editor">
      <div className="section-head"><h2>{title}</h2><button onClick={onNew}>New</button></div>
      <div className="editor-layout">
        <div className="admin-list" aria-label={`${title} list`}>
          {list.map((item) => {
            const status = getAdminItemStatus(item);
            return (
              <button className={item.id === activeId ? "selected" : ""} key={item.id} onClick={() => pick(structuredClone(item))}>
                <span>{item.name || item.title}</span>
                <small className={status.danger ? "danger" : ""}>{status.text}</small>
              </button>
            );
          })}
        </div>
        <div className="editor-workspace">
          {draft}
          <div className="actions editor-actions">
            <AdminStatusMessage message={saveStatus} />
            <button onClick={save}>Save</button>
            <button className="ghost delete-action" onClick={handleDelete} disabled={!selectedItem}>Delete selected</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminStatusMessage({ message }) {
  if (!message) return null;
  const normalized = message.toLowerCase();
  const kind = normalized.includes("failed") || normalized.includes("required") || normalized.includes("expired") ? "error" : normalized.includes("only") || normalized.includes("retry") ? "warning" : normalized.includes("saving") ? "saving" : "active";
  return <div className={`admin-status ${kind}`} role="status">{message}</div>;
}

function textToList(value) {
  return Array.isArray(value) ? value : value.split("\n").map((item) => item.trim()).filter(Boolean);
}

async function optimizeDataUrl(dataUrl, maxDim = 400, quality = 0.75) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/") || dataUrl.length < 35000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (image.width <= maxDim && image.height <= maxDim && dataUrl.length < 50000) {
        return resolve(dataUrl);
      }
      const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function optimizeAllStoreImages(store, updateStore, setStatus) {
  if (setStatus) setStatus("⚡ Optimizing & compressing images...");
  try {
    let changed = false;
    const newSettings = { ...store.settings };
    if (newSettings.logoImage && newSettings.logoImage.length > 40000) {
      const optimizedLogo = await optimizeDataUrl(newSettings.logoImage, 240, 0.75);
      if (optimizedLogo !== newSettings.logoImage) {
        newSettings.logoImage = optimizedLogo;
        changed = true;
      }
    }
    const newProducts = await Promise.all(
      store.products.map(async (p) => {
        if (p.image && p.image.length > 40000) {
          const opt = await optimizeDataUrl(p.image, 400, 0.75);
          if (opt !== p.image) {
            changed = true;
            return { ...p, image: opt };
          }
        }
        return p;
      })
    );
    const newCategories = await Promise.all(
      store.categories.map(async (c) => {
        if (c.image && c.image.length > 40000) {
          const opt = await optimizeDataUrl(c.image, 320, 0.75);
          if (opt !== c.image) {
            changed = true;
            return { ...c, image: opt };
          }
        }
        return c;
      })
    );
    const newOffers = await Promise.all(
      store.offers.map(async (o) => {
        if (o.image && o.image.length > 40000) {
          const opt = await optimizeDataUrl(o.image, 400, 0.75);
          if (opt !== o.image) {
            changed = true;
            return { ...o, image: opt };
          }
        }
        return o;
      })
    );

    if (changed) {
      await updateStore(
        (s) => ({
          ...s,
          settings: newSettings,
          products: newProducts,
          categories: newCategories,
          offers: newOffers,
        }),
        "⚡ All images compressed! Catalog now loads instantly.",
        "✕ Failed to save optimized images"
      );
    } else if (setStatus) {
      setStatus("✓ Images are already fully optimized!");
    }
  } catch {
    if (setStatus) setStatus("✕ Optimization encountered an error.");
  }
}

function readImageFile(file, done, maxSize = 400, quality = 0.75) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      done(canvas.toDataURL("image/webp", quality));
    };
    image.onerror = () => done(reader.result);
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function Footer({ settings }) {
  const logoSrc = (!settings.logoImage || settings.logoImage.startsWith("data:image")) ? "/logo-icon.png?v=2" : settings.logoImage;
  return (
    <footer>
      <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
        <img
          src={logoSrc}
          alt={settings.siteName}
          style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "contain", background: "#ffffff", border: "1px solid #E2E8F0", padding: "1px" }}
          onError={(e) => { e.currentTarget.src = "/logo-icon.png?v=2"; }}
        />
        <strong>{settings.siteName}</strong>
      </div>
      <span>{settings.footerText}</span>
      <span>{settings.contact}</span>
      <a href={settings.instagram}>Instagram</a>
      {whatsappGroupUrl(settings) && <a href={whatsappGroupUrl(settings)} target="_blank">WhatsApp Group</a>}
    </footer>
  );
}

function Empty({ title, action }) {
  return <div className="empty"><h2>{title}</h2>{action && <button onClick={action}>Back to products</button>}</div>;
}

export default App;
