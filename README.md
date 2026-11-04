# 🛍️ PremiumHub Store

<div align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</div>

<p align="center">
  A high-performance digital storefront and subscription management web application designed for selling digital services, OTT accounts, and software keys with frictionless UPI payment workflows.
</p>

<p align="center">
  <a href="https://premiumhub-store-puce.vercel.app"><strong>🌐 View Live Demo »</strong></a>
</p>

---

## ✨ Highlights & Features

- **⚡ Lightning-Fast Storefront**: Powered by React 19 and Vite with instant client-side state transitions and responsive catalog navigation.
- **💳 Frictionless UPI Payment Suite**:
  - Dynamic QR Code generation for instant scans.
  - Native deep links for PhonePe, Google Pay, and Paytm.
  - Interactive payment verification flow with confetti celebrations and audio feedback.
- **📦 Dynamic Inventory & Variations**:
  - Support for multi-tier subscription durations (e.g., 1 Month, 3 Months, Annual).
  - Real-time stock status tracking (`In Stock` / `Stock Out`).
- **🏷️ Coupon & Offer Management**:
  - Built-in discount code validator with customizable percentage/flat deductions.
  - Promotional carousel banners for store offers.
- **💬 Direct WhatsApp Order Routing**:
  - Automatic order formatting dispatched straight to customer support or admin WhatsApp channels.
- **💾 Resilient Persistence**:
  - LocalStorage caching with versioned schema migrations and data safety fallbacks.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/)
- **Visuals & QR**: `qrcode`, `canvas-confetti`
- **Linter**: [Oxlint](https://oxc.rs/)
- **Hosting**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ryuyjg/premiumhub-store.git
   cd premiumhub-store
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 👨‍💻 Author

- **Author**: Muhammad Ansif ([@Ryuyjg](https://github.com/Ryuyjg))
- **Live Demo**: [premiumhub-store-puce.vercel.app](https://premiumhub-store-puce.vercel.app)

