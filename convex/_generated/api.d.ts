/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as backInStock from "../backInStock.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as coupons from "../coupons.js";
import type * as customers from "../customers.js";
import type * as filters from "../filters.js";
import type * as lib_auth from "../lib/auth.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as pages from "../pages.js";
import type * as priceAlerts from "../priceAlerts.js";
import type * as products from "../products.js";
import type * as promotionSubscribers from "../promotionSubscribers.js";
import type * as promotions from "../promotions.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as seedFilters from "../seedFilters.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  backInStock: typeof backInStock;
  cart: typeof cart;
  categories: typeof categories;
  coupons: typeof coupons;
  customers: typeof customers;
  filters: typeof filters;
  "lib/auth": typeof lib_auth;
  notifications: typeof notifications;
  orders: typeof orders;
  pages: typeof pages;
  priceAlerts: typeof priceAlerts;
  products: typeof products;
  promotionSubscribers: typeof promotionSubscribers;
  promotions: typeof promotions;
  reviews: typeof reviews;
  seed: typeof seed;
  seedFilters: typeof seedFilters;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
