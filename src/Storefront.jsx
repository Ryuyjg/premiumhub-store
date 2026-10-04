import { useState } from "react";
import { availableVariations, hasAvailableVariation, lowestVariation, money, whatsappUrl } from "./storefrontUtils";
import "./Storefront.css";

export function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
    chat: <><path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z" /><path d="M8 9h8M8 13h5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}

export function StoreHeader({ settings, cartCount, navigate, route }) {
  const nav = [["Shop", "/"], ["Offers", "/offers"]];
  return <header className="shop-header">
    <div className="shop-header-inner">
      <button className="shop-brand" onClick={() => navigate("/")} aria-label={`${settings.siteName}, home`}>
        <img src={settings.logoImage && !settings.logoImage.startsWith("data:image") ? settings.logoImage : "/logo-icon.png"} alt="" width="38" height="38" />
        <span>{settings.siteName}<small>GOOD PLANS. GREAT POSSIBILITIES.</small></span>
      </button>
      <nav className="shop-nav" aria-label="Main navigation">
        {nav.map(([label, path]) => <button key={path} className={(path === "/" ? route === "/" || route.startsWith("/products") || route.startsWith("/categories") : route === path) ? "selected" : ""} onClick={() => navigate(path)} aria-current={route === path ? "page" : undefined}>{label}</button>)}
        <a className="header-help" href={whatsappUrl(settings, "Hello Premium Hub, can you help me choose a subscription?")} target="_blank" rel="noopener noreferrer">Need help? <Icon name="chat" size={17} /></a>
        <button className="shop-bag" onClick={() => navigate("/cart")} aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}><Icon name="bag" /><span className="bag-label">Cart</span><b>{cartCount}</b></button>
      </nav>
    </div>
  </header>;
}

export function StoreHome({ store, ctx, orderNow, navigate, isCatalogLoading }) {
  const picks = isCatalogLoading ? [] : ctx.products.filter(hasAvailableVariation).slice(0, 3);
  const browse = () => {
    document.getElementById("subscriptions")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    document.getElementById("catalog-search")?.focus({ preventScroll: true });
  };
  return <>
    <section className="shop-hero shop-container">
      <div className="hero-intro">
        <span className="shop-eyebrow"><span /> A LITTLE UPGRADE. A LOT MORE POSSIBLE.</span>
        <h1>Your favourites.<br /><span>A smarter price.</span></h1>
        <p>Stream, create, work, repeat. Find your next subscription and make it yours.</p>
        <button className="hero-browse" onClick={browse}>Find your plan <Icon name="arrow" size={18} /></button>
      </div>
      <div className="hero-edit" aria-label="Available favourites">
        <div className="edit-caption"><span>THE EVERYDAY UPGRADE</span><Icon name="sparkle" size={25} /></div>
        <div className="edit-picks">{isCatalogLoading && <div className="hero-loading">Finding your next upgrade…</div>}{picks.map((product) => <button className="edit-pick" key={product.id} onClick={() => orderNow(product.id)}>
          <img src={product.image} alt="" width="44" height="44" />
          <span>{product.name}<small>From {money(lowestVariation(product)?.price)}</small></span><Icon name="arrow" size={18} />
        </button>)}</div>
        <div className="edit-note"><span className="note-dot" /> Your favourites, all in one place.</div>
      </div>
    </section>
    <div className="shop-assurance shop-container"><span><Icon name="check" size={16} /> Choose your own duration</span><span><Icon name="check" size={16} /> Clear prices upfront</span><span><Icon name="chat" size={16} /> Order with a real person</span></div>
    <Catalog ctx={ctx} settings={store.settings} orderNow={orderNow} navigate={navigate} isCatalogLoading={isCatalogLoading} />
    {!isCatalogLoading && ctx.activeOffers.length > 0 && <section className="shop-container shop-deals" id="offers"><div className="shop-section-heading"><div><span className="shop-eyebrow">A LITTLE EXTRA VALUE</span><h2>Good plans. Better deals.</h2></div><button className="shop-text-link" onClick={() => navigate("/offers")}>All offers <Icon name="arrow" size={17} /></button></div><StoreOffers offers={ctx.activeOffers.slice(0, 3)} settings={store.settings} /></section>}
    <HelpSection settings={store.settings} />
  </>;
}

export function Catalog({ ctx, settings, orderNow, navigate, isCatalogLoading, page = false }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [availableOnly, setAvailableOnly] = useState(false);
  const search = query.trim().toLowerCase();
  const filtered = ctx.products.filter((product) => {
    const text = [product.name, product.shortDescription, ctx.categoryById[product.categoryId]?.name, ...(product.variations || []).map(v => v.name)].join(" ").toLowerCase();
    return (category === "all" || product.categoryId === category) && (!search || text.includes(search)) && (!availableOnly || hasAvailableVariation(product));
  }).sort((a, b) => {
    if (sort === "price") return Number(lowestVariation(a)?.price ?? Infinity) - Number(lowestVariation(b)?.price ?? Infinity);
    if (sort === "name") return a.name.localeCompare(b.name);
    return Number(hasAvailableVariation(b)) - Number(hasAvailableVariation(a)) || Number(b.featured) - Number(a.featured) || (a.order || 0) - (b.order || 0);
  });
  const reset = () => { setQuery(""); setCategory("all"); setAvailableOnly(false); };
  const Heading = page ? "h1" : "h2";
  return <section className="shop-container shop-catalog" id="subscriptions">
    <div className="shop-section-heading catalog-heading"><div><span className="shop-eyebrow">THE SUBSCRIPTION EDIT</span><Heading>What are you into?</Heading><p>Find a favourite. Choose a plan. You’re on your way.</p></div><span className="catalog-total">{ctx.products.length} subscriptions, one place.</span></div>
    <div className="catalog-controls">
      <div className="shop-search"><Icon name="search" size={22} /><label className="visually-hidden" htmlFor="catalog-search">Search subscriptions</label><input id="catalog-search" type="search" placeholder="Try Netflix, Spotify, ChatGPT…" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={18} /></button>}<span className="search-hint">FIND YOUR FAVOURITE</span></div>
      <div className="shop-categories" aria-label="Filter by category"><button className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")} aria-pressed={category === "all"}>Everything <span>{ctx.products.length}</span></button>{ctx.categories.filter(c => ctx.products.some(p => p.categoryId === c.id)).map(c => <button key={c.id} className={category === c.id ? "selected" : ""} onClick={() => setCategory(c.id)} aria-pressed={category === c.id}>{c.name.replace(/ Subscriptions| Tools| & Utilities/g, "")}<span>{ctx.products.filter(p => p.categoryId === c.id).length}</span></button>)}</div>
    </div>
    <div className="catalog-meta"><p role="status">{isCatalogLoading ? "Finding your favourites…" : `${filtered.length} ${filtered.length === 1 ? "subscription" : "subscriptions"}${search ? ` for “${query.trim()}”` : " to explore"}`}</p><div><label className="stock-filter"><input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} /> In stock only</label><label className="sort-filter"><span className="visually-hidden">Sort subscriptions</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="price">Price: low to high</option><option value="name">Name: A–Z</option></select></label></div></div>
    {isCatalogLoading ? <div className="shop-product-grid" aria-label="Loading subscriptions">{Array.from({ length: 6 }, (_, i) => <div className="shop-product-skeleton" key={i} />)}</div> : filtered.length ? <div className="shop-product-grid">{filtered.map(product => <StoreProductCard key={product.id} product={product} category={ctx.categoryById[product.categoryId]} orderNow={orderNow} navigate={navigate} />)}</div> : <div className="shop-empty"><Icon name="search" size={30} /><h3>No match just yet.</h3><p>Try another name or browse all subscriptions.</p><button onClick={reset}>Clear filters <Icon name="arrow" size={16} /></button><a href={whatsappUrl(settings, `Hello Premium Hub, do you have ${query.trim() || "other subscription plans"}?`)} target="_blank" rel="noopener noreferrer">Ask us about a plan</a></div>}
  </section>;
}

export function StoreProductCard({ product, category, orderNow, navigate }) {
  const available = availableVariations(product);
  const cheapest = lowestVariation(product);
  const disabled = !product.active || available.length === 0;
  return <article className={`shop-product${disabled ? " unavailable" : ""}`}>
    <div className="product-topline"><span className="product-category">{category?.name.replace(/ Subscriptions| Tools/g, "")}</span>{product.featured && !disabled ? <span className="product-popular">Our picks</span> : <span className={`product-availability${disabled ? " out" : ""}`}><i />{disabled ? "Sold out" : "Available"}</span>}</div>
    <button className="product-identity" onClick={() => navigate(`/products/${product.slug}`)}><img src={product.image} alt="" width="64" height="64" loading="lazy" decoding="async" /><span><h3>{product.name}</h3><small>{available.length || product.variations.length} {(available.length || product.variations.length) === 1 ? "plan" : "plans"} to choose from</small></span><Icon name="chevron" size={16} /></button>
    <p className="product-description">{product.shortDescription || "Explore your plan options and choose what works for you."}</p>
    <div className="product-bottom"><div className="product-price"><small>FROM</small><strong>{cheapest ? money(cheapest.price) : "Ask us"}</strong>{cheapest && <span>{cheapest.name}</span>}</div><button className="choose-plan" disabled={disabled} onClick={() => orderNow(product.id)}>{disabled ? "Sold out" : "Choose plan"}{!disabled && <Icon name="arrow" size={16} />}</button></div>
  </article>;
}

export function StoreOffers({ offers, settings }) {
  return <div className="shop-offer-grid">{offers.map(offer => <article className="shop-offer" key={offer.id}><div className="offer-label"><Icon name="sparkle" size={16} /> THE GOOD DEAL{offer.originalPrice > offer.price && <span>Save {money(offer.originalPrice - offer.price)}</span>}</div><div className="offer-identity">{offer.image && <img src={offer.image} alt="" width="52" height="52" loading="lazy" />}<div><h3>{offer.title}</h3>{offer.itemName && <small>{offer.itemName}</small>}</div></div><p>{offer.description}</p><div className="offer-bottom"><strong>{money(offer.price)}{offer.originalPrice > offer.price && <s>{money(offer.originalPrice)}</s>}</strong><a href={whatsappUrl(settings, `Hello Premium Hub, I’d like the ${offer.title}${offer.itemName ? ` (${offer.itemName})` : ""} offer for ${money(offer.price)}. Please confirm availability and payment details.`)} target="_blank" rel="noopener noreferrer">Get this deal <Icon name="arrow" size={16} /></a></div></article>)}</div>;
}

export function HelpSection({ settings }) {
  return <>
    <section className="shop-container shop-how"><div className="shop-section-heading"><div><span className="shop-eyebrow">LESS FUSS. MORE FAVOURITES.</span><h2>Three steps to your upgrade.</h2></div></div><div className="how-grid">{[["01", "Find your favourite", "Search or browse the subscriptions you love."], ["02", "Choose your plan", "Pick your duration and review the price in your cart."], ["03", "Let’s make it yours", "Send your order on WhatsApp. We’ll confirm payment and activation."]].map(([number, title, text]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section className="shop-container shop-faq"><div><span className="shop-eyebrow">BEFORE YOU CHOOSE</span><h2>A few good questions.</h2><p>Need a hand? We’re a message away.</p><a className="shop-text-link" href={whatsappUrl(settings, "Hello Premium Hub, I have a question about a subscription.")} target="_blank" rel="noopener noreferrer">Talk to us <Icon name="chat" size={18} /></a></div><div className="faq-list">{[["How do I place an order?", "Choose a subscription and duration, then review your cart. Tap ‘Order on WhatsApp’ to send us your order. We’ll confirm availability and payment details before activation."], ["When will my subscription be activated?", "We’ll confirm the activation time on WhatsApp before you pay. Timing depends on the plan you choose."], ["Can I ask about a plan before buying?", "Of course. Send us the product name on WhatsApp and we’ll help you choose a duration, explain the access details, and answer your questions."]].map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="shop-container shop-contact"><div><span className="shop-eyebrow">YOUR NEXT UPGRADE STARTS HERE</span><h2>Not sure what to pick?</h2><p>Tell us what you’re looking for. We’ll help you find your fit.</p></div><a href={whatsappUrl(settings, "Hello Premium Hub, help me find the right subscription.")} target="_blank" rel="noopener noreferrer">Let’s chat <Icon name="chat" size={19} /></a></section>
  </>;
}
