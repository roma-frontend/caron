/**
 * AI Assistant for Caroon Auto Parts E-commerce
 * Role-based capabilities and system prompt generation
 */

export type UserRole = 'admin' | 'customer' | 'guest';

export interface UserContext {
  name: string;
  email: string;
  role: UserRole;
}

export interface AICapability {
  id: string;
  name: string;
  description: string;
  requiredRole: UserRole[];
  keywords: string[];
  action?: string;
}

export const AI_CAPABILITIES: AICapability[] = [
  // GUEST / CUSTOMER capabilities
  {
    id: 'find_parts',
    name: 'Find Parts',
    description: 'Help find auto parts by car brand, model, year or part type',
    requiredRole: ['guest', 'customer', 'admin'],
    keywords: ['find', 'search', 'part', 'filter', 'brake', 'oil', 'tire', 'disc'],
  },
  {
    id: 'check_compatibility',
    name: 'Check Compatibility',
    description: 'Verify if a part is compatible with a specific car',
    requiredRole: ['guest', 'customer', 'admin'],
    keywords: ['compatible', 'fit', 'works with', 'my car', 'model'],
  },
  {
    id: 'track_order',
    name: 'Track Order',
    description: 'Check order status by order number',
    requiredRole: ['customer', 'admin'],
    keywords: ['order', 'track', 'status', 'delivery', 'where'],
    action: '/order-status',
  },
  {
    id: 'delivery_info',
    name: 'Delivery Info',
    description: 'Shipping costs, delivery zones, free shipping threshold',
    requiredRole: ['guest', 'customer', 'admin'],
    keywords: ['delivery', 'shipping', 'cost', 'free', 'zone', 'yerevan', 'region'],
  },
  {
    id: 'return_policy',
    name: 'Return Policy',
    description: 'Return and exchange policies',
    requiredRole: ['guest', 'customer', 'admin'],
    keywords: ['return', 'exchange', 'refund', 'warranty', 'defect'],
  },
  // ADMIN capabilities
  {
    id: 'sales_analytics',
    name: 'Sales Analytics',
    description: 'Revenue, order count, popular products, trends',
    requiredRole: ['admin'],
    keywords: ['sales', 'revenue', 'analytics', 'report', 'trend', 'popular'],
    action: '/admin',
  },
  {
    id: 'manage_orders',
    name: 'Manage Orders',
    description: 'View, update status, handle pending orders',
    requiredRole: ['admin'],
    keywords: ['orders', 'pending', 'confirm', 'ship', 'cancel'],
    action: '/admin/orders',
  },
  {
    id: 'manage_products',
    name: 'Manage Products',
    description: 'Add, edit, stock management, pricing',
    requiredRole: ['admin'],
    keywords: ['product', 'add', 'stock', 'price', 'inventory', 'out of stock'],
    action: '/admin/products',
  },
  {
    id: 'manage_promotions',
    name: 'Manage Promotions',
    description: 'Create and manage discounts and promotions',
    requiredRole: ['admin'],
    keywords: ['promotion', 'discount', 'sale', 'coupon'],
    action: '/admin/promotions',
  },
  {
    id: 'customer_support',
    name: 'Customer Support',
    description: 'Help resolve customer issues, complaints',
    requiredRole: ['admin'],
    keywords: ['customer', 'complaint', 'issue', 'support', 'help'],
    action: '/admin/customers',
  },
];

export function getCapabilitiesForRole(role: UserRole): AICapability[] {
  return AI_CAPABILITIES.filter((c) => c.requiredRole.includes(role));
}

export function detectIntent(message: string, role: UserRole): AICapability | null {
  const lower = message.toLowerCase();
  const caps = getCapabilitiesForRole(role);
  for (const cap of caps) {
    if (cap.keywords.some((kw) => lower.includes(kw))) return cap;
  }
  return null;
}

export function buildSystemPrompt(user: UserContext): string {
  const caps = getCapabilitiesForRole(user.role);

  return `You are **Caroon AI** — the intelligent assistant for Caroon Armenia auto parts e-commerce platform.

PERSONALITY:
- Professional, helpful, knowledgeable about auto parts
- Concise but thorough answers
- Use emojis sparingly for readability: 🚗🔧⚙️📦✅
- ALWAYS respond in the SAME LANGUAGE as the user's message (Armenian, Russian, or English)
- Address user by name when appropriate

CURRENT USER:
- Name: ${user.name}
- Role: ${user.role.toUpperCase()}
- Email: ${user.email}

AVAILABLE CAPABILITIES:
${caps.map((c) => `- ${c.name}: ${c.description}`).join('\n')}

STORE KNOWLEDGE:
- Store: Caroon Armenia (caroon.am)
- Products: Auto parts, tires, discs, oils, filters, brakes, batteries, accessories
- Delivery: Yerevan (1000 AMD), Regions (2000 AMD), Free shipping over 20000 AMD
- Working hours: 10:00 - 19:00
- Payment: Cash on delivery
- Returns: 14 days for unused items in original packaging
- Warranty: Manufacturer warranty on all products

${user.role === 'admin' ? `
ADMIN CONTEXT:
You can help with:
- Analyzing sales trends and suggesting actions
- Recommending products to restock
- Drafting product descriptions
- Suggesting promotions based on inventory
- Answering questions about platform features
- Helping with customer complaints
` : ''}

${user.role === 'guest' || user.role === 'customer' ? `
CUSTOMER CONTEXT:
You can help with:
- Finding the right part for their car (ask brand, model, year)
- Explaining product differences and recommendations
- Delivery time estimates
- Order tracking
- Return/exchange process
- General auto maintenance tips
` : ''}

RULES:
- Never make up product prices or availability — say "check the catalog"
- For order issues, suggest contacting support or checking order status page
- If unsure about compatibility, recommend verifying with the store
- Keep responses under 300 words unless detailed explanation needed`;
}

export function getRoleSuggestions(role: UserRole): string[] {
  if (role === 'admin') {
    return [
      'Show me today\'s orders summary',
      'Which products are low on stock?',
      'Suggest a promotion for this week',
      'Help me write a product description',
    ];
  }
  return [
    'Help me find brake pads for my car',
    'What oil do you recommend for Toyota Camry?',
    'How much is delivery to regions?',
    'What is your return policy?',
  ];
}
