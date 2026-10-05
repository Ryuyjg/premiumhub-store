import { useEffect, useState } from "react";
import { availableVariations, hasAvailableVariation, isAvailable, lowestVariation, money, stockLimit, whatsappUrl } from "./storefrontUtils";
import "./Storefront.css";

export function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
    chat: <><path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z" /><path d="M8 9h8M8 13h5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>;
}

export function StoreHeader({ settings, cartCount, navigate, goBack, route }) {
  return (
    <header className="shop-header">
      <div className="shop-header-inner">
        <div className="header-left">
          {route !== "/" && <button className="back-button" onClick={goBack}><Icon name="back" size={18} /><span>Back</span></button>}
          <button className="shop-brand" onClick={() => navigate("/")} aria-label={`${settings.siteName}, home`}>
            <img src={settings.logoImage && !settings.logoImage.startsWith("data:image") ? settings.logoImage : "/logo-icon.png"} alt="" width="32" height="32" />
            <span>{settings.siteName}</span>
          </button>
        </div>
        <nav className="shop-nav" aria-label="Main navigation">
          <a className="header-help" href={whatsappUrl(settings, "Hello Premium Hub, I need help with a subscription.")} target="_blank" rel="noopener noreferrer" aria-label="Get help on WhatsApp"><Icon name="chat" size={20} /><span>Help</span></a>
          <button className="shop-bag" onClick={() => navigate("/cart")} aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}><Icon name="bag" size={18} /><span>Cart</span><b>{cartCount}</b></button>
        </nav>
      </div>
    </header>
  );
}

export function StoreHome(props) {
  return <Catalog {...props} settings={props.store.settings} />;
}

export function Catalog({ ctx, settings, addToCart, cart = [], navigate, isCatalogLoading, page = false }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [selectedPlans, setSelectedPlans] = useState({});
  const search = query.trim().toLowerCase();
  const filtered = ctx.products.filter(product => {
    const text = [product.name, product.shortDescription, ctx.categoryById[product.categoryId]?.name].join(" ").toLowerCase();
    return (category === "all" || product.categoryId === category) && (!search || text.includes(search));
  }).sort((a, b) => {
    if (sort === "price") return Number(lowestVariation(a)?.price ?? Infinity) - Number(lowestVariation(b)?.price ?? Infinity);
    return Number(hasAvailableVariation(b)) - Number(hasAvailableVariation(a)) || (a.order || 0) - (b.order || 0);
  });
  const reset = () => { setQuery(""); setCategory("all"); };
  return (
    <section className="shop-container shop-catalog" id="subscriptions">
      <div className="catalog-heading">
        <div><h1>{page ? "All subscriptions" : "Shop subscriptions"}</h1><p>Choose a plan. Add to cart. Order on WhatsApp.</p></div>
        <button className="offers-link" onClick={() => navigate("/offers")}>Offers <Icon name="arrow" size={16} /></button>
      </div>
      {!page && <OfferHighlight offers={ctx.activeOffers} ctx={ctx} addToCart={addToCart} navigate={navigate} />}
      <div className="shop-search">
        <Icon name="search" size={21} />
        <label className="visually-hidden" htmlFor={page ? "products-search" : "catalog-search"}>Search subscriptions</label>
        <input id={page ? "products-search" : "catalog-search"} type="search" placeholder="Search Netflix, Spotify, ChatGPT…" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />
        {query && <button onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={18} /></button>}
      </div>
      <div className="shop-categories" aria-label="Filter by category">
        <button className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")} aria-pressed={category === "all"}>All</button>
        {ctx.categories.filter(c => ctx.products.some(p => p.categoryId === c.id)).map(c => <button key={c.id} className={category === c.id ? "selected" : ""} onClick={() => setCategory(c.id)} aria-pressed={category === c.id}>{c.name.replace(/ Subscriptions| Tools| & Utilities/g, "")}</button>)}
      </div>
      <div className="catalog-meta">
        <p role="status">{isCatalogLoading ? "Loading products…" : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}</p>
        <label><span className="visually-hidden">Sort subscriptions</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="price">Price: low to high</option></select></label>
      </div>
      {isCatalogLoading ? <div className="shop-product-grid" aria-label="Loading subscriptions">{Array.from({ length: 6 }, (_, i) => <div className="shop-product-skeleton" key={i} />)}</div> : filtered.length ? (
        <div className="shop-product-grid">{filtered.map(product => <StoreProductCard key={product.id} product={product} category={ctx.categoryById[product.categoryId]} addToCart={addToCart} cart={cart} navigate={navigate} selectedVariationId={selectedPlans[product.id]} onPlanChange={id => setSelectedPlans(plans => ({ ...plans, [product.id]: id }))} />)}</div>
      ) : (
        <div className="shop-empty"><h2>No products found</h2><p>Try another name or clear your filters.</p><button onClick={reset}>Clear filters</button><a href={whatsappUrl(settings, `Hello Premium Hub, do you have ${query.trim() || "other subscription plans"}?`)} target="_blank" rel="noopener noreferrer">Ask us on WhatsApp</a></div>
      )}
    </section>
  );
}

function OfferHighlight({ offers = [], ctx, addToCart, navigate }) {
  const visible = offers.slice(0, 3);
  if (!visible.length) return null;
  const chooseOffer = (offer) => {
    const items = resolveOfferItems(offer, ctx);
    if (items.length && items.every(item => addToCart?.(item.productId, item.variationId, 1, item.price))) {
      navigate("/cart");
      return;
    }
    navigate("/offers");
  };
  return (
    <section className="offer-highlight" aria-label="Hot offers">
      <div className="offer-highlight-head">
        <div>
          <span>Hot offers</span>
          <strong>Best deals today</strong>
        </div>
        <button onClick={() => navigate("/offers")}>View all offers <Icon name="arrow" size={16} /></button>
      </div>
      <div className="offer-highlight-list">
        {visible.map(offer => (
          <button className="offer-highlight-item" key={offer.id} onClick={() => chooseOffer(offer)} aria-label={`Add ${offer.title} offer to cart`}>
            {/combo|heavy/i.test(offer.title || "") ? <OfferFallback title={offer.title} /> : offer.image?.trim() ? <img src={offer.image} alt="" width="54" height="54" loading="eager" decoding="async" /> : <OfferFallback title={offer.title} />}
            <span>
              <b>{offer.title}</b>
              {offer.description && <small>{offer.description}</small>}
            </span>
            <strong>{money(offer.price)}</strong>
            {offer.originalPrice > offer.price && <s>{money(offer.originalPrice)}</s>}
            <em className="offer-add-note">Tap to add</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function resolveOfferItems(offer, ctx) {
  if (offer.productId && offer.variationId) return [{ productId: offer.productId, variationId: offer.variationId, price: Number(offer.price) }];

  const text = `${offer.title || ""} ${offer.itemName || ""}`.toLowerCase();
  const findProduct = (...terms) => ctx.products.find(product => {
    const productText = `${product.id} ${product.slug} ${product.name}`.toLowerCase();
    return terms.some(term => productText.includes(term));
  });
  const findVariation = (product, ...terms) => {
    const available = availableVariations(product);
    return available.find(variation => terms.some(term => variation.name.toLowerCase().includes(term))) || lowestVariation(product);
  };
  const offerPrice = Number(offer.price);

  if (/combo|heavy/.test(text)) {
    const netflix = findProduct("netflix");
    const prime = findProduct("prime");
    const netflixVariation = findVariation(netflix, "1 month");
    const primeVariation = findVariation(prime, "1 month");
    const items = [
      netflix && netflixVariation ? { productId: netflix.id, variationId: netflixVariation.id, basePrice: Number(netflixVariation.price) } : null,
      prime && primeVariation ? { productId: prime.id, variationId: primeVariation.id, basePrice: Number(primeVariation.price) } : null,
    ].filter(Boolean);
    if (items.length < 2 || !Number.isFinite(offerPrice)) return items.map(({ basePrice, ...item }) => ({ ...item, price: basePrice }));
    const total = items.reduce((sum, item) => sum + item.basePrice, 0);
    let remaining = offerPrice;
    return items.map((item, index) => {
      const price = index === items.length - 1 ? remaining : Math.max(0, Math.round((item.basePrice / total) * offerPrice));
      remaining -= price;
      return { productId: item.productId, variationId: item.variationId, price };
    });
  }

  const product = text.includes("spotify") || text.includes("spotyfi")
    ? findProduct("spotify")
    : text.includes("hotstar") ? (findProduct("hotstar premium") || findProduct("jiohotstar") || findProduct("hotstar")) : null;
  const variation = product ? findVariation(product, "3 month", "3 months", "1 month") : null;
  return product && variation ? [{ productId: product.id, variationId: variation.id, price: Number.isFinite(offerPrice) ? offerPrice : Number(variation.price) }] : [];
}

function OfferFallback({ title }) {
  const combo = /combo|heavy/i.test(title || "");
  if (combo) {
    return <i className="combo-offer-visual" aria-label="Netflix and Prime combo"><em>N</em><em>Prime</em></i>;
  }
  return <i className="deal-offer-visual" aria-label="Offer">%</i>;
}

export function StoreProductCard({ product, category, addToCart, cart = [], navigate, selectedVariationId, onPlanChange }) {
  const [variationId, setVariationId] = useState("");
  const [added, setAdded] = useState(false);
  const variations = product.variations || [];
  const selected = variations.find(v => v.id === (selectedVariationId || variationId)) || lowestVariation(product);
  const available = availableVariations(product);
  const inCart = cart.find(item => item.productId === product.id && item.variationId === selected?.id)?.quantity || 0;
  const soldOut = !product.active || available.length === 0;
  const canAdd = !soldOut && isAvailable(selected) && inCart < stockLimit(selected);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1000);
    return () => clearTimeout(timer);
  }, [added]);
  const add = () => {
    if (selected && addToCart(product.id, selected.id)) setAdded(true);
  };
  const choosePlan = (id) => {
    setVariationId(id);
    if (onPlanChange) onPlanChange(id);
    setAdded(false);
  };
  return (
    <article className={`shop-product${soldOut ? " unavailable" : ""}`}>
      <div className="product-identity">
        <img src={product.image} alt="" width="48" height="48" loading="lazy" decoding="async" />
        <div><button className="product-name" onClick={() => navigate(`/products/${product.slug}`)}>{product.name}</button><p>{product.shortDescription || category?.name || "Digital subscription"}</p></div>
        {soldOut && <span className="sold-out-label">Sold out</span>}
      </div>
      <div className="product-plan" role="radiogroup" aria-label={`${product.name} plan`}>
        {variations.length ? variations.map(v => {
          const active = selected?.id === v.id;
          const disabled = !isAvailable(v);
          return (
            <button
              type="button"
              className={`plan-choice${active ? " selected" : ""}`}
              key={v.id}
              disabled={disabled}
              role="radio"
              aria-checked={active}
              onClick={() => choosePlan(v.id)}
            >
              <span>{v.name}</span>
              <strong>{money(v.price)}</strong>
              {disabled && <small>Sold out</small>}
            </button>
          );
        }) : <span className="no-plans">No plans available</span>}
      </div>
      <div className="product-bottom">
        <div className="product-price"><strong>{selected ? money(selected.price) : "—"}</strong><small aria-live="polite">{inCart > 0 ? `${inCart} in cart` : selected?.name || ""}</small></div>
        <button className={added ? "add-cart-button added" : "add-cart-button"} disabled={!canAdd} onClick={add} aria-label={`Add ${product.name} ${selected?.name || ""} to cart`}>
          {added ? <><Icon name="check" size={17} /> Added</> : soldOut ? "Sold out" : canAdd ? <><span className="add-symbol">+</span> Add to cart</> : "In cart"}
        </button>
      </div>
    </article>
  );
}

export function StoreOffers({ offers, settings }) {
  return <div className="shop-offer-grid">{offers.map(offer => (
    <article className="shop-offer" key={offer.id}>
      <div className="offer-identity">{offer.image && <img src={offer.image} alt="" width="78" height="78" loading="lazy" />}<div><small>Special offer</small><h2>{offer.title}</h2>{offer.itemName && <strong>{offer.itemName}</strong>}</div></div>
      <p>{offer.description}</p>
      <div className="offer-bottom"><div><strong>{money(offer.price)}</strong>{offer.originalPrice > offer.price && <s>{money(offer.originalPrice)}</s>}</div><a href={whatsappUrl(settings, `Hello Premium Hub, I’d like the ${offer.title}${offer.itemName ? ` (${offer.itemName})` : ""} offer for ${money(offer.price)}. Please confirm availability and payment details.`)} target="_blank" rel="noopener noreferrer">Order this offer <Icon name="arrow" size={17} /></a></div>
    </article>
  ))}</div>;
}
