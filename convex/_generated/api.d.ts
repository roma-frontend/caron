/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as atg from "../atg.js";
import type * as auth from "../auth.js";
import type * as backInStock from "../backInStock.js";
import type * as brands from "../brands.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as delivery from "../delivery.js";
import type * as email from "../email.js";
import type * as filters from "../filters.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_delivery from "../lib/delivery.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_imageUrl from "../lib/imageUrl.js";
import type * as lib_loyalty from "../lib/loyalty.js";
import type * as lib_translateDict from "../lib/translateDict.js";
import type * as loyalty from "../loyalty.js";
import type * as maintenance from "../maintenance.js";
import type * as migrations from "../migrations.js";
import type * as newsletter from "../newsletter.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as pages from "../pages.js";
import type * as priceAlerts from "../priceAlerts.js";
import type * as products from "../products.js";
import type * as promotionSubscribers from "../promotionSubscribers.js";
import type * as promotions from "../promotions.js";
import type * as push from "../push.js";
import type * as pushNode from "../pushNode.js";
import type * as questions from "../questions.js";
import type * as r2Actions from "../r2Actions.js";
import type * as returns from "../returns.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as seedFilters from "../seedFilters.js";
import type * as settings from "../settings.js";
import type * as translate from "../translate.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  atg: typeof atg;
  auth: typeof auth;
  backInStock: typeof backInStock;
  brands: typeof brands;
  cart: typeof cart;
  categories: typeof categories;
  coupons: typeof coupons;
  crons: typeof crons;
  customers: typeof customers;
  delivery: typeof delivery;
  email: typeof email;
  filters: typeof filters;
  "lib/auth": typeof lib_auth;
  "lib/delivery": typeof lib_delivery;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/imageUrl": typeof lib_imageUrl;
  "lib/loyalty": typeof lib_loyalty;
  "lib/translateDict": typeof lib_translateDict;
  loyalty: typeof loyalty;
  maintenance: typeof maintenance;
  migrations: typeof migrations;
  newsletter: typeof newsletter;
  notifications: typeof notifications;
  orders: typeof orders;
  pages: typeof pages;
  priceAlerts: typeof priceAlerts;
  products: typeof products;
  promotionSubscribers: typeof promotionSubscribers;
  promotions: typeof promotions;
  push: typeof push;
  pushNode: typeof pushNode;
  questions: typeof questions;
  r2Actions: typeof r2Actions;
  returns: typeof returns;
  reviews: typeof reviews;
  seed: typeof seed;
  seedFilters: typeof seedFilters;
  settings: typeof settings;
  translate: typeof translate;
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
