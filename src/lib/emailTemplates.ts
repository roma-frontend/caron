/**
 * Email templates live in convex/lib so they can be shared by both the Next.js
 * API routes and Convex actions. This re-export keeps the `@/lib/emailTemplates`
 * import path working for the API routes.
 */
export * from '../../convex/lib/emailTemplates';
