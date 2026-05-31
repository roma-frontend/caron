import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema(
  {
  // ─── Users & Auth ──────────────────────────────────────────────
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.optional(v.string()),
    googleId: v.optional(v.string()),
    role: v.union(v.literal('admin'), v.literal('customer')),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    sessionToken: v.optional(v.string()),
    sessionExpiry: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_google_id', ['googleId'])
    .index('by_role', ['role'])
    .index('by_session_token', ['sessionToken']),

  // ─── Categories ────────────────────────────────────────────────
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    parentId: v.optional(v.id('categories')),
    order: v.number(),
    isActive: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_parent', ['parentId'])
    .index('by_active', ['isActive']),

  // ─── Dynamic Filter Definitions (per category) ─────────────────
  filterDefinitions: defineTable({
    categoryId: v.id('categories'),
    name: v.string(),
    slug: v.string(),
    type: v.union(
      v.literal('select'),
      v.literal('multiselect'),
      v.literal('range'),
      v.literal('boolean'),
    ),
    options: v.optional(v.array(v.string())),
    unit: v.optional(v.string()),
    order: v.number(),
  }).index('by_category', ['categoryId']),

  // ─── Products ──────────────────────────────────────────────────
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    price: v.number(),
    compareAtPrice: v.optional(v.number()),
    categoryId: v.id('categories'),
    images: v.array(v.string()),
    sku: v.optional(v.string()),
    stock: v.number(),
    isActive: v.boolean(),
    isFeatured: v.optional(v.boolean()),
    showInPromotions: v.optional(v.boolean()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    attributes: v.optional(v.any()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_category', ['categoryId'])
    .index('by_active', ['isActive'])
    .index('by_featured', ['isFeatured'])
    .index('by_category_price', ['categoryId', 'price'])
    .index('by_active_price', ['isActive', 'price'])
    .searchIndex('search_products', { searchField: 'name', filterFields: ['categoryId', 'isActive'] }),

  // ─── Orders ────────────────────────────────────────────────────
  orders: defineTable({
    orderNumber: v.string(),
    userId: v.optional(v.id('users')),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.string(),
    shippingAddress: v.string(),
    items: v.array(
      v.object({
        productId: v.id('products'),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        imageUrl: v.optional(v.string()),
      }),
    ),
    subtotal: v.number(),
    shipping: v.number(),
    total: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('confirmed'),
      v.literal('processing'),
      v.literal('shipped'),
      v.literal('delivered'),
      v.literal('cancelled'),
    ),
    paymentStatus: v.union(
      v.literal('awaiting'),
      v.literal('paid'),
      v.literal('refunded'),
    ),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_order_number', ['orderNumber'])
    .index('by_payment_status', ['paymentStatus']),

  // ─── Promotions / Sales ────────────────────────────────────────
  promotions: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    productIds: v.optional(v.array(v.id('products'))),
    categoryIds: v.optional(v.array(v.id('categories'))),
    startDate: v.number(),
    endDate: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index('by_active', ['isActive']),

  // ─── Reviews ───────────────────────────────────────────────────────
  reviews: defineTable({
    productId: v.id('products'),
    authorName: v.string(),
    rating: v.number(),
    text: v.optional(v.string()),
    isApproved: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_product', ['productId'])
    .index('by_approved', ['isApproved']),

  // ─── Settings ──────────────────────────────────────────────────────
  settings: defineTable({
    storeName: v.string(),
    phone: v.string(),
    email: v.string(),
    address: v.string(),
    whatsapp: v.string(),
    telegram: v.string(),
    instagram: v.string(),
    facebook: v.string(),
    deliveryYerevan: v.number(),
    deliveryRegions: v.number(),
    freeShippingThreshold: v.number(),
    announcementBar: v.string(),
    workingHours: v.string(),
    telegramBotToken: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    mapUrl: v.optional(v.string()),
    // Real-time control center
    maintenanceMode: v.optional(v.boolean()),
    maintenanceMessage: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    announcementEnabled: v.optional(v.boolean()),
    showCategories: v.optional(v.boolean()),
    showFeatured: v.optional(v.boolean()),
    showBrands: v.optional(v.boolean()),
    showFeatures: v.optional(v.boolean()),
    enableCarSelector: v.optional(v.boolean()),
    enableReviews: v.optional(v.boolean()),
    // Cart & checkout
    minOrderAmount: v.optional(v.number()),
    enableQuickBuy: v.optional(v.boolean()),
    // Payments
    paymentMethods: v.optional(v.array(v.string())),
    bankName: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankCode: v.optional(v.string()),
    cardNumber: v.optional(v.string()),
    paymentNote: v.optional(v.string()),
    // Marketing
    gaId: v.optional(v.string()),
    fbPixelId: v.optional(v.string()),
    enableCookieConsent: v.optional(v.boolean()),
    cookieConsentText: v.optional(v.string()),
    enableNewsletter: v.optional(v.boolean()),
    // Catalog
    defaultViewMode: v.optional(v.union(v.literal('grid'), v.literal('list'))),
    productsPerPage: v.optional(v.number()),
    enableBreadcrumbs: v.optional(v.boolean()),
    // UI
    enableScrollToTop: v.optional(v.boolean()),
    logoUrl: v.optional(v.string()),
    customCss: v.optional(v.string()),
    customJsHead: v.optional(v.string()),
    // Auth
    enableRegistration: v.optional(v.boolean()),
    // Auto parts
    enableVinDecoder: v.optional(v.boolean()),
    enableOemSearch: v.optional(v.boolean()),
    defaultWarranty: v.optional(v.string()),
    // Stock
    lowStockThreshold: v.optional(v.number()),
    showStockCount: v.optional(v.boolean()),
    // Delivery
    deliveryEstimateYerevan: v.optional(v.string()),
    deliveryEstimateRegions: v.optional(v.string()),
    // Cart
    maxCartItems: v.optional(v.number()),
    cartTtlDays: v.optional(v.number()),
    // Cross-sell
    enableCrossSell: v.optional(v.boolean()),
    enableQuickView: v.optional(v.boolean()),
    enableShareButtons: v.optional(v.boolean()),
    // Back-in-stock
    enableBackInStock: v.optional(v.boolean()),
    // Order history
    enableOrderHistory: v.optional(v.boolean()),
    // Abandoned cart
    enableCartRecovery: v.optional(v.boolean()),
    cartRecoveryDelay: v.optional(v.number()),
    // Price alerts
    enablePriceAlert: v.optional(v.boolean()),
    // Daily report
    enableDailyReport: v.optional(v.boolean()),
    // Store pickup
    enablePickup: v.optional(v.boolean()),
    pickupAddress: v.optional(v.string()),
    // Loyalty
    enableLoyalty: v.optional(v.boolean()),
    loyaltyPercent: v.optional(v.number()),
    // Bulk order
    enableBulkOrder: v.optional(v.boolean()),
    // Install videos
    enableInstallVideos: v.optional(v.boolean()),
    // Timeline
    enableTimeline: v.optional(v.boolean()),
    // Plate decoder
    enablePlateDecoder: v.optional(v.boolean()),
  }),

  // ─── Price Alerts ────────────────────────────────────────────
  priceAlerts: defineTable({
    email: v.string(),
    productId: v.id('products'),
    priceAtSubscribe: v.number(),
    notified: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_product', ['productId'])
    .index('by_notified', ['notified']),

  // ─── Loyalty Points ──────────────────────────────────────────
  loyaltyPoints: defineTable({
    userId: v.optional(v.id('users')),
    email: v.string(),
    points: v.number(),
    totalEarned: v.number(),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_user', ['userId']),

  // ─── Coupons / Promocodes ────────────────────────────────────
  coupons: defineTable({
    code: v.string(),
    type: v.union(v.literal('percent'), v.literal('fixed')),
    value: v.number(),
    minOrderAmount: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    usedCount: v.number(),
    isActive: v.boolean(),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_active', ['isActive']),

  // ─── Back-in-stock requests ──────────────────────────────────
  backInStock: defineTable({
    productId: v.id('products'),
    contact: v.string(),
    notified: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_product', ['productId'])
    .index('by_notified', ['notified']),

  // ─── Promotion Subscribers (Telegram) ─────────────────────────
  promotionSubscribers: defineTable({
    contact: v.string(),
    notified: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_contact', ['contact'])
    .index('by_notified', ['notified']),

  // ─── Pages (CMS) ──────────────────────────────────────────────
  pages: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    isPublished: v.boolean(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_slug', ['slug']),
  },
  { schemaValidation: true },
);
