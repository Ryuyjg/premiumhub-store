export const logo = (text, bg, fg = "#fff", sub = "Premium Hub") => {
  const isGradient = bg.includes("gradient") || bg.includes("url");
  const rectFill = isGradient ? `fill="url(#g)"` : `fill="${bg}"`;
  const gradDef = isGradient ? `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bg.split(',')[1]?.trim() || '#111'}"/><stop offset="100%" stop-color="${bg.split(',')[2]?.replace(')','').trim() || '#333'}"/></linearGradient></defs>` : "";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">${gradDef}<rect width="320" height="220" rx="32" ${rectFill}/><text x="50%" y="48%" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${text.length > 8 ? 32 : text.length > 5 ? 38 : 46}" font-weight="800" fill="${fg}">${text}</text><text x="50%" y="68%" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="600" fill="${fg}" opacity=".78">${sub}</text></svg>`
  )}`;
};

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
    { id: "ai", name: "AI Tools", slug: "ai-tools", description: "ChatGPT, Claude, Midjourney and useful AI products.", active: true, featured: true, order: 2, image: logo("AI", "#0f766e") },
    { id: "music", name: "Music & Audio", slug: "music-audio", description: "Spotify, YouTube Premium, Apple Music and audiobooks.", active: true, featured: true, order: 3, image: logo("♪", "#b91c1c") },
    { id: "editing", name: "Editing & Design", slug: "editing-tools", description: "CapCut Pro, Canva Pro, Figma and Adobe tools.", active: true, featured: true, order: 4, image: logo("EDIT", "#4338ca") },
    { id: "productivity", name: "Productivity", slug: "productivity-tools", description: "Notion, Microsoft 365, Slack, Zoom & LinkedIn.", active: true, featured: true, order: 5, image: logo("WORK", "#2563eb") },
    { id: "gaming", name: "Gaming & Utilities", slug: "gaming-utilities", description: "Discord Nitro, NordVPN, Xbox Game Pass & Duolingo.", active: true, featured: true, order: 6, image: logo("GAME", "#7c3aed") },
  ],
  products: [
    // --- OTT Subscriptions (12) ---
    product("netflix", "Netflix Premium", "ott", "4K Ultra HD streaming on all devices with multi-screen support.", ["4K UHD + HDR", "4 Screen simultaneous", "Download on 6 devices", "Ad-Free Streaming"], logo("Netflix", "#e50914", "#fff", "4K ULTRA HD"), true, 1, [["1 Month", 399, 499, true], ["3 Months", 999, 1199, true], ["6 Months", 1799, 2199, true]]),
    product("prime-video", "Prime Video", "ott", "Prime entertainment plan for movies, series & regional exclusives.", ["4K & HD Streaming", "Multi-device support", "X-Ray Feature", "Fast Activation"], logo("Prime", "#00a8e1", "#fff", "VIDEO"), true, 2, [["1 Month", 199, 299, true], ["3 Months", 499, 699, true], ["1 Year", 1499, 1799, true]]),
    product("jiohotstar", "JioHotstar Premium", "ott", "Live sports, Premier League, IPL, Marvel & Disney blockbusters.", ["Live Sports in 4K", "Dolby Atmos Audio", "Multi-language Dubs", "Instant Login"], logo("Hotstar", "#2563eb", "#fff", "PREMIUM"), true, 3, [["1 Month", 149, 199, true], ["3 Months", 399, 499, true], ["1 Year", 899, 1199, true]]),
    product("sonyliv", "SonyLIV Premium", "ott", "SonyLIV premium access for UEFA Champions League, WWE, Sony Originals & movies.", ["UEFA & Live Sports", "Sony TV Exclusives", "HD & 4K Streaming", "Ad-Free Shows"], `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="32" fill="#0B051B"/><path d="M 60 165 Q 160 205 260 165" fill="none" stroke="url(#liv-g1)" stroke-width="8" stroke-linecap="round"/><defs><linearGradient id="liv-g1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00E5FF"/><stop offset="50%" stop-color="#FF007F"/><stop offset="100%" stop-color="#FFB800"/></linearGradient></defs><text x="160" y="78" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" letter-spacing="6">SONY</text><text x="160" y="132" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-size="44" font-weight="900" letter-spacing="1"><tspan fill="#00E5FF">l</tspan><tspan fill="#FF007F">i</tspan><tspan fill="#FFB800">v</tspan></text><text x="160" y="188" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-size="14" font-weight="700" fill="rgba(255,255,255,0.6)" letter-spacing="3">PREMIUM</text></svg>`)}`, true, 4, [["1 Month", 179, 249, true], ["6 Months", 699, 899, true], ["1 Year", 999, 1299, true]]),
    product("zee5", "ZEE5 Premium", "ott", "Premium ZEE5 entertainment plans with 2800+ movies & 150+ web series.", ["Regional Originals", "Before TV Premieres", "Full HD Quality", "Multi Device"], `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="32" fill="#0A0A0C"/><circle cx="160" cy="100" r="64" fill="#0A0A0C"/><circle cx="160" cy="100" r="64" fill="none" stroke="url(#z-ring)" stroke-width="9"/><defs><linearGradient id="z-ring" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00C2FF"/><stop offset="25%" stop-color="#00E676"/><stop offset="50%" stop-color="#FFD600"/><stop offset="75%" stop-color="#FF007A"/><stop offset="100%" stop-color="#7C4DFF"/></linearGradient></defs><text x="160" y="112" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" letter-spacing="1">ZEE5</text><text x="160" y="180" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,0.7)" letter-spacing="2">PREMIUM</text></svg>`)}`, true, 5, [["1 Month", 99, 149, true], ["6 Months", 399, 549, true], ["1 Year", 599, 899, true]]),
    product("appletv", "Apple TV+", "ott", "Award-winning Apple Originals, movie blockbusters & exclusive series.", ["4K HDR & Vision", "Dolby Atmos", "Family Sharing", "Zero Ads"], logo("Apple TV+", "#000000", "#fff", "ORIGINALS"), true, 6, [["1 Month", 99, 149, true], ["3 Months", 269, 399, true], ["1 Year", 899, 1199, true]]),
    product("hbo-max", "Max (HBO Max)", "ott", "Warner Bros, HBO Originals, DC Universe & Harry Potter universe streaming.", ["HBO Original Series", "4K Ultra HD", "3 Devices", "Offline Download"], logo("HBO Max", "#4c1d95", "#fff", "MAX STREAMING"), true, 7, [["1 Month", 249, 349, true], ["6 Months", 1199, 1499, true]]),
    product("crunchyroll", "Crunchyroll Mega Fan", "ott", "World's largest anime library with simulcasts direct from Japan.", ["Ad-Free Anime", "Simulcast Streams", "Offline Viewing", "Game Vault"], logo("Crunchyroll", "#f97316", "#fff", "MEGA FAN"), true, 8, [["1 Month", 129, 179, true], ["3 Months", 349, 479, true], ["1 Year", 999, 1299, true]]),
    product("aha", "Aha Video Premium", "ott", "100% Telugu & Tamil movies, exclusive web shows and talk shows.", ["Telugu & Tamil Cinema", "4K & Full HD", "Ad-Free Content"], logo("Aha", "#ff3b00", "#fff", "TELUGU & TAMIL"), true, 9, [["3 Months", 199, 299, true], ["1 Year", 599, 899, true]]),
    product("hoichoi", "Hoichoi Bengali", "ott", "Exclusive Bengali movies, series, audio stories and world premieres.", ["Bengali Originals", "Full HD Streams", "Offline Downloads"], logo("Hoichoi", "#dc2626", "#fff", "BENGALI OTT"), false, 10, [["3 Months", 199, 299, false], ["1 Year", 599, 899, false]]),
    product("discovery-plus", "Discovery+ Premium", "ott", "Documentaries, science, nature, true crime, space & reality TV shows.", ["Real-life Entertainment", "Exclusive Documentaries", "HD Quality"], logo("Discovery+", "#0284c7", "#fff", "PREMIUM"), true, 11, [["1 Month", 79, 129, true], ["1 Year", 399, 599, true]]),
    product("sun-nxt", "Sun NXT", "ott", "South Indian blockbuster movies, live TV channels & music videos.", ["Sun TV Originals", "4 South Languages", "Live TV Streams"], logo("Sun NXT", "#ea580c", "#fff", "SOUTH OTT"), true, 12, [["3 Months", 149, 249, true], ["1 Year", 499, 799, true]]),

    // --- AI Tools (10) ---
    product("chatgpt", "ChatGPT Plus (GPT-4o)", "ai", "Access to GPT-4o, DALL-E 3 image generation, browsing & custom GPTs.", ["GPT-4o & GPT-4 High Speed", "DALL-E 3 Image Generation", "Advanced Data Analysis", "Custom GPT Creator Access"], logo("ChatGPT", "#10a37f", "#fff", "PLUS GPT-4o"), true, 13, [["1 Month", 999, 1699, true], ["3 Months", 2699, 3999, true], ["6 Months", 4999, 6999, true]]),
    product("claude", "Claude Pro", "ai", "Claude 3.5 Sonnet & Claude 3 Opus with 200,000 token context window.", ["Claude 3.5 Sonnet Access", "200K Context Length", "Coding & Analysis", "Priority Server Access"], logo("Claude", "#d97706", "#fff", "PRO 3.5 SONNET"), true, 14, [["1 Month", 949, 1599, true], ["3 Months", 2599, 3799, true]]),
    product("midjourney", "Midjourney Pro", "ai", "State of the art AI image generator for creators, designers & artists.", ["Fast GPU Hours", "Unlimited Relaxed GPU", "Commercial Usage Rights", "Private Generation"], logo("Midjourney", "#2563eb", "#fff", "AI IMAGES"), true, 15, [["1 Month", 899, 1299, true], ["3 Months", 2399, 3299, true]]),
    product("perplex-ai", "Perplexity Pro", "ai", "AI-powered research engine with Claude 3.5, GPT-4o & Pro Search.", ["Unlimited Pro Search", "File & PDF Analysis", "$5/mo API Credits Included", "Choose AI Model"], logo("Perplexity", "#0d9488", "#fff", "PRO SEARCH"), true, 16, [["1 Month", 699, 999, true], ["1 Year", 3999, 5999, true]]),
    product("github-copilot", "GitHub Copilot Pro", "ai", "AI pair programmer that autocompletes code across all major IDEs.", ["Auto Code Completion", "Chat in VS Code & JetBrains", "CLI Assistant", "Supports 20+ Languages"], logo("Copilot", "#1e293b", "#fff", "AI PROGRAMMER"), true, 17, [["1 Month", 499, 799, true], ["1 Year", 3499, 4999, true]]),
    product("grammarly", "Grammarly Premium", "ai", "AI writing assistant for grammar, clarity, tone & plagiarism check.", ["Advanced Grammar Fixes", "Tone Adjustments", "Plagiarism Detector", "1000 AI Prompts/mo"], logo("Grammarly", "#15c39a", "#fff", "PREMIUM AI"), true, 18, [["1 Month", 299, 499, true], ["1 Year", 1499, 2499, true]]),
    product("cursor-ai", "Cursor AI Pro", "ai", "The AI-first code editor built on VS Code with codebase context.", ["GPT-4o & Claude Copilot", "Terminal AI Commands", "Full Codebase Indexing"], logo("Cursor", "#4f46e5", "#fff", "PRO EDITOR"), true, 19, [["1 Month", 899, 1499, true], ["1 Year", 4999, 6999, true]]),
    product("gemini-advanced", "Gemini Advanced", "ai", "Google One AI Premium with Gemini 1.5 Pro & 2TB Drive Storage.", ["Gemini 1.5 Pro (1M Context)", "2TB Google Drive Storage", "Gemini in Docs & Gmail"], logo("Gemini", "#8b5cf6", "#fff", "ADVANCED 2TB"), true, 20, [["1 Month", 799, 1299, true], ["1 Year", 4499, 6999, true]]),
    product("jasper-ai", "Jasper AI Creator", "ai", "Enterprise AI marketing platform for content, blogs, ads & SEO.", ["50+ Copywriting Templates", "Brand Voice Customization", "SEO Mode"], logo("Jasper", "#ec4899", "#fff", "AI MARKETING"), false, 21, [["1 Month", 999, 1699, false]]),
    product("elevenlabs", "ElevenLabs Creator", "ai", "Hyper-realistic AI voice generator, text-to-speech & voice cloning.", ["100,000 Voice Characters", "Custom Voice Cloning", "Commercial License"], logo("ElevenLabs", "#0f172a", "#fff", "AI VOICE"), true, 22, [["1 Month", 699, 1199, true], ["3 Months", 1799, 2799, true]]),

    // --- Music & Audio (8) ---
    product("youtube-premium", "YouTube Premium", "music", "Ad-free YouTube videos, background play, downloads & YouTube Music.", ["Zero Ads on YouTube", "Background Video Play", "Offline Video Downloads", "YouTube Music Included"], logo("YouTube", "#ff0000", "#fff", "PREMIUM"), true, 23, [["1 Month", 129, 159, true], ["3 Months", 349, 449, true], ["1 Year", 1199, 1499, true]]),
    product("spotify", "Spotify Premium", "music", "Ad-free music streaming, high quality audio & unlimited downloads.", ["Ad-Free Listening", "Download for Offline Play", "Very High 320kbps Audio", "Unlimited Skips"], logo("Spotify", "#1db954", "#fff", "PREMIUM"), true, 24, [["1 Month", 99, 129, true], ["3 Months", 249, 329, true], ["1 Year", 699, 999, true]]),
    product("apple-music", "Apple Music", "music", "100 Million songs in Lossless Audio & Spatial Audio with Dolby Atmos.", ["Lossless Audio & Spatial", "Ad-Free 100M Tracks", "Apple Music Classical"], logo("Apple Music", "#fa243c", "#fff", "LOSSLESS"), true, 25, [["1 Month", 99, 149, true], ["6 Months", 499, 699, true], ["1 Year", 899, 1199, true]]),
    product("amazon-music", "Amazon Music Unlimited", "music", "HD & Ultra HD audio streaming with unlimited skips and podcast access.", ["75M HD Tracks", "Ultra HD FLAC Quality", "Hands-free Alexa"], logo("Amazon Music", "#00a8e1", "#fff", "UNLIMITED HD"), true, 26, [["1 Month", 89, 129, true], ["1 Year", 699, 999, true]]),
    product("audible", "Audible Premium Plus", "music", "Listen to thousands of audiobooks, podcasts & Audible Originals.", ["1 Credit/mo for Any Book", "Unlimited Plus Catalog", "Keep Books Forever"], logo("Audible", "#f59e0b", "#fff", "AUDIOBOOKS"), true, 27, [["1 Month", 149, 199, true], ["3 Months", 399, 499, true]]),
    product("soundcloud", "SoundCloud Go+", "music", "Stream DJ mixes, indie tracks, offline listening & full SoundCloud catalog.", ["Full 320kbps Audio", "Zero Ad Disruptions", "DJ Apps Integration"], logo("SoundCloud", "#ff5500", "#fff", "GO+ PREMIUM"), true, 28, [["1 Month", 119, 169, true], ["1 Year", 899, 1299, true]]),
    product("deezer", "Deezer Premium", "music", "High Fidelity FLAC audio quality with SongCatcher & lyrics in sync.", ["High Fidelity FLAC", "Offline Download Mode", "SongCatcher Music ID"], logo("Deezer", "#feaa2d", "#000", "HIFI FLAC"), true, 29, [["1 Month", 99, 149, true], ["1 Year", 699, 999, true]]),
    product("tidal", "TIDAL HiFi Plus", "music", "Master Quality Audio (MQA), Dolby Atmos Music & Sony 360 Audio.", ["24-bit 192kHz MQA", "Dolby Atmos Music", "Direct Artist Payouts"], logo("TIDAL", "#000000", "#fff", "HIFI PLUS MQA"), false, 30, [["1 Month", 199, 299, false]]),

    // --- Editing & Creative (10) ---
    product("capcut", "CapCut Pro", "editing", "Creative video editor for TikTok, Shorts & Reels with AI auto-captions.", ["100GB Cloud Space", "AI Auto Captions & Translation", "Pro Filters & Transitions", "4K 60FPS Export"], logo("CapCut", "#0891b2", "#fff", "PRO EDITOR"), true, 31, [["1 Month", 299, 399, true], ["6 Months", 1199, 1599, true], ["1 Year", 1999, 2499, true]]),
    product("canva", "Canva Pro", "editing", "Graphic design platform with Magic Studio AI, Brand Kits & 100M assets.", ["Magic Studio AI Features", "Background Remover in 1-Click", "100M+ Stock Photos & Fonts", "1TB Cloud Storage"], logo("Canva", "#00c4cc", "#fff", "PRO MAGIC AI"), true, 32, [["1 Month", 149, 249, true], ["6 Months", 599, 899, true], ["1 Year", 999, 1499, true]]),
    product("figma", "Figma Professional", "editing", "Collaborative UI/UX design tool with unlimited files & Dev Mode.", ["Unlimited Figma Files", "Dev Mode Code Inspection", "Advanced Prototyping"], logo("Figma", "#f24e1e", "#fff", "PRO DESIGN"), true, 33, [["1 Month", 499, 799, true], ["1 Year", 2999, 4499, true]]),
    product("adobe-creative-cloud", "Adobe Creative Cloud", "editing", "20+ Creative desktop apps including Photoshop, Premiere Pro & Illustrator.", ["Photoshop & Premiere Pro", "Illustrator & After Effects", "100GB Adobe Cloud", "Adobe Firefly AI"], logo("Adobe CC", "#ff0000", "#fff", "ALL APPS 20+"), true, 34, [["1 Month", 1299, 1999, true], ["3 Months", 3499, 4999, true], ["1 Year", 8999, 12999, true]]),
    product("adobe-lightroom", "Adobe Lightroom Plan", "editing", "Cloud photo editing service with 1TB storage & AI masking tools.", ["Lightroom Desktop & Mobile", "1TB Cloud Photo Sync", "AI Object Removal"], logo("Lightroom", "#3182ce", "#fff", "1TB PHOTO"), true, 35, [["1 Month", 399, 599, true], ["1 Year", 2499, 3499, true]]),
    product("envato-elements", "Envato Elements", "editing", "Unlimited downloads of stock videos, royalty music, graphics & templates.", ["Unlimited Asset Downloads", "Stock Videos & Music", "WordPress Themes & Plugins"], logo("Envato", "#82b440", "#fff", "UNLIMITED"), true, 36, [["1 Month", 499, 799, true], ["1 Year", 2999, 4499, true]]),
    product("freepik", "Freepik Premium", "editing", "Millions of vectors, photos, PSD mockups, AI images & icons.", ["Unlimited Daily Downloads", "Commercial License", "Freepik Pikaso AI"], logo("Freepik", "#1062fe", "#fff", "PREMIUM PSD"), true, 37, [["1 Month", 349, 499, true], ["1 Year", 1999, 2999, true]]),
    product("epidemic-sound", "Epidemic Sound", "editing", "Royalty-free music & sound effects for YouTube, Twitch & commercial video.", ["40,000+ Music Tracks", "90,000 Sound Effects", "Commercial License"], logo("Epidemic", "#111827", "#fff", "ROYALTY FREE"), true, 38, [["1 Month", 399, 599, true], ["1 Year", 2499, 3499, true]]),
    product("motion-array", "Motion Array Pro", "editing", "Premiere Pro templates, After Effects presets, motion graphics & audio.", ["After Effects Templates", "Premiere Plugins", "Sound Effects Library"], logo("MotionArray", "#e11d48", "#fff", "TEMPLATES"), false, 39, [["1 Month", 499, 799, false]]),
    product("shutterstock", "Shutterstock 10 Pack", "editing", "10 high-resolution stock photo or vector downloads per month.", ["10 Stock Downloads/mo", "Standard Commercial License", "High-Res JPEG & Vectors"], logo("Shutterstock", "#ff0000", "#fff", "STOCK PHOTOS"), true, 40, [["1 Month", 599, 899, true], ["1 Year", 3999, 5999, true]]),

    // --- Productivity & Work (7) ---
    product("notion", "Notion Plus & AI", "productivity", "All-in-one workspace for notes, docs, wikis, project management & AI.", ["Unlimited File Uploads", "Notion AI Assistant", "Unlimited Page History", "Team Workspaces"], logo("Notion", "#000000", "#fff", "PLUS & AI"), true, 41, [["1 Month", 299, 499, true], ["1 Year", 1999, 2999, true]]),
    product("microsoft-365", "Microsoft 365 Personal", "productivity", "Word, Excel, PowerPoint, Outlook, 1TB OneDrive cloud storage & Defender.", ["1TB OneDrive Cloud", "Word, Excel, PowerPoint", "Works on PC, Mac, iOS, Android"], logo("Office 365", "#d97706", "#fff", "1TB ONEDRIVE"), true, 42, [["1 Month", 249, 399, true], ["1 Year", 1499, 2199, true]]),
    product("slack", "Slack Pro", "productivity", "Team messaging, huddles, workflow builder & unlimited message history.", ["Unlimited Message History", "Unlimited Integrations", "Slack Huddles with Screen Share"], logo("Slack", "#4a154b", "#fff", "PRO WORKFLOW"), true, 43, [["1 Month", 349, 499, true], ["1 Year", 2299, 3199, true]]),
    product("zoom", "Zoom One Pro", "productivity", "Unlimited HD video meetings up to 30 hours, cloud recording & AI companion.", ["30-Hour Meeting Limit", "5GB Cloud Recording", "Zoom AI Companion Included"], logo("Zoom", "#0b5cff", "#fff", "PRO MEETINGS"), true, 44, [["1 Month", 499, 799, true], ["1 Year", 2999, 4499, true]]),
    product("google-one", "Google One 2TB", "productivity", "2TB storage across Drive, Gmail & Photos + Google Photos editing features.", ["2TB Cloud Storage", "Google Photos AI Magic Eraser", "Family Share up to 5"], logo("Google One", "#4285f4", "#fff", "2TB STORAGE"), true, 45, [["1 Month", 199, 299, true], ["1 Year", 1299, 1799, true]]),
    product("linkedin-premium", "LinkedIn Premium Career", "productivity", "InMail credits, see who viewed your profile, AI job match & LinkedIn Learning.", ["5 InMail Credits/mo", "Who Viewed Your Profile", "LinkedIn Learning Access"], logo("LinkedIn", "#0a66c2", "#fff", "PREMIUM CAREER"), true, 46, [["1 Month", 699, 999, true], ["3 Months", 1799, 2499, true]]),
    product("trello", "Trello Premium", "productivity", "Kanban boards, unlimited Power-Ups, Butler automation & Admin controls.", ["Unlimited Power-Ups", "Butler Automation Commands", "Timeline & Calendar View"], logo("Trello", "#0052cc", "#fff", "PREMIUM BOARD"), true, 47, [["1 Month", 199, 299, true], ["1 Year", 1299, 1799, true]]),

    // --- Gaming & Utilities (7) ---
    product("discord-nitro", "Discord Nitro", "gaming", "Custom emojis anywhere, 4K 60fps streaming, 500MB upload & 2 Server Boosts.", ["2 Server Boosts Included", "Use Emojis Everywhere", "500MB Upload Limit", "HD 4K Screen Share"], logo("Discord", "#5865f2", "#fff", "NITRO BOOST"), true, 48, [["1 Month", 299, 449, true], ["1 Year", 1999, 2999, true]]),
    product("nordvpn", "NordVPN Complete", "gaming", "Ultra-fast VPN, Threat Protection malware blocker & NordPass password manager.", ["Ultra-Fast 6000+ Servers", "Threat Protection & Ad Blocker", "NordPass Password Manager", "10 Devices Simultaneous"], logo("NordVPN", "#4687ff", "#fff", "VPN COMPLETE"), true, 49, [["1 Month", 199, 299, true], ["1 Year", 1199, 1699, true], ["2 Years", 1899, 2699, true]]),
    product("expressvpn", "ExpressVPN Premium", "gaming", "High-speed encrypted servers in 105 countries with Lightway protocol.", ["High-Speed Lightway Tech", "105 Countries Servers", "8 Devices Support"], logo("ExpressVPN", "#c61623", "#fff", "PREMIUM VPN"), true, 50, [["1 Month", 249, 399, true], ["1 Year", 1499, 2199, true]]),
    product("xbox-game-pass", "Xbox Game Pass Ultimate", "gaming", "Play 100+ high quality console & PC games + EA Play & Cloud Gaming.", ["100+ Console & PC Games", "EA Play Membership Included", "Xbox Cloud Gaming"], logo("Game Pass", "#107c41", "#fff", "ULTIMATE"), true, 51, [["1 Month", 349, 549, true], ["3 Months", 899, 1299, true]]),
    product("duolingo", "Duolingo Super", "gaming", "Learn 40+ languages with ad-free lessons, unlimited hearts & practice hub.", ["Ad-Free Language Learning", "Unlimited Hearts System", "Mistakes Practice Hub"], logo("Duolingo", "#58cc02", "#fff", "SUPER LEARNING"), true, 52, [["1 Month", 149, 249, true], ["1 Year", 899, 1299, true]]),
    product("coursera", "Coursera Plus", "gaming", "Unlimited access to 7,000+ courses, professional certificates & degrees.", ["7,000+ Unlimited Courses", "Certificates from Google & IBM", "Hands-on Guided Projects"], logo("Coursera", "#0056d2", "#fff", "PLUS CERTIFIED"), true, 53, [["1 Month", 999, 1499, true], ["1 Year", 5999, 8999, true]]),
    product("chess-com", "Chess.com Diamond", "gaming", "Unlimited game reviews with stockfish, unlimited puzzles & interactive lessons.", ["Unlimited Game Reviews", "Unlimited Puzzles & Insights", "All Master Lessons Access"], logo("Chess.com", "#7fa650", "#fff", "DIAMOND VIP"), false, 54, [["1 Month", 299, 449, false], ["1 Year", 1499, 2199, false]]),
  ],
  offers: [
    { id: "offer-spotify-year", title: "Spotify Yearly Deal", productId: "spotify", variationId: "spotify-2", price: 649, originalPrice: 999, description: "Limited yearly price for music lovers.", startDate: "", endDate: "", active: true, image: logo("DEAL", "#166534") },
    { id: "offer-prime-3m", title: "Prime Video 3 Month Offer", productId: "prime-video", variationId: "prime-video-1", price: 449, originalPrice: 699, description: "Save on a three month entertainment plan.", startDate: "", endDate: "", active: true, image: "" },
    { id: "offer-chatgpt-3m", title: "ChatGPT 3 Month Bundle", productId: "chatgpt", variationId: "chatgpt-1", price: 2499, originalPrice: 3999, description: "Save big on 3 months of GPT-4o access.", startDate: "", endDate: "", active: true, image: logo("GPT-4o", "#10a37f") },
  ],
};
