# Caron Armenia — Ավտոպահեստամասերի Առցանց Խանութ

Հայաստանի առաջատար ավտոպահեստամասերի առցանց խանութը’ Next.js, Convex և Tailwind CSS տեխնոլոգիաներով:

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Convex (real-time)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Auth:** JWT + Google OAuth
- **Storage:** Cloudflare R2
- **Notifications:** Telegram Bot API
- **Email:** Resend
- **Deployment:** Vercel

## Features

- 🛏️ Full e-commerce: catalog, cart, checkout
- 👤 Admin panel: products, categories, orders, customers, promotions, pages CMS
- 🔍 Search with filters and car model selector
- 🚚 Delivery zones (Yerevan / Regions) with configurable pricing
- 📱 Fully responsive (mobile-first)
- 🌙 Dark/Light mode
- 🔔 Real-time order notifications via Telegram
- 📄 CMS pages (about, privacy, terms, delivery)
- 📊 SEO optimized (sitemap, robots, meta, JSON-LD)
- ⚡ Performance optimized (image optimization, code splitting, caching headers)

## Getting Started

### Prerequisites

- Node.js 20+
- Convex account (free tier works)
- Cloudflare R2 bucket (for images)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/online-shop.git
cd online-shop
npm install
```

### Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

See `.env.example` for all required variables.

### Convex Setup

```bash
npx convex dev
```

This will prompt you to create a Convex project and deploy the schema.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/        # Login, Register
│   ├── (shop)/        # Public pages (products, cart, etc.)
│   ├── admin/         # Admin panel
│   └── api/           # API routes (auth, upload, email, contact)
├── components/
│   ├── ui/            # shadcn/ui components
│   ├── layout/        # Header, Footer
│   ├── shared/        # Reusable components
│   └── admin/         # Admin-specific components
├── hooks/             # Custom React hooks
├── lib/               # Utilities, formatters, constants
└── store/             # Zustand stores (cart, auth, favorites)
convex/
├── schema.ts          # Database schema
├── products.ts        # Product queries/mutations
├── orders.ts          # Order management
├── auth.ts            # Authentication
├── settings.ts        # Store settings
└── pages.ts           # CMS pages
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy

### Convex Production

```bash
npx convex deploy
```

## License

Private project. All rights reserved.
