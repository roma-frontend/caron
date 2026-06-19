'use client';

import { useQuery } from 'convex/react';
import DOMPurify from 'dompurify';
import { api } from '../../../convex/_generated/api';

// Force every target="_blank" link to carry rel="noopener noreferrer" so CMS
// content cannot be used for reverse-tabnabbing. Registered once at module load.
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if ((node as Element).tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

interface Props {
  slug: string;
  children: React.ReactNode;
}

/**
 * Sanitize admin-authored CMS HTML with DOMPurify before rendering it to the
 * public. DOMPurify is a maintained, spec-aware sanitizer that defeats the
 * mutation-XSS and entity/whitespace evasions a regex cannot. We allow a rich
 * but safe subset of formatting tags and force-open links in a new tab with
 * noopener.
 */
function sanitizeHtml(html: string): string {
  // DOMPurify needs a DOM; this component is client-only so window exists.
  if (typeof window === 'undefined') return '';
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'strong', 'i', 'em', 'u', 's', 'p', 'br', 'hr', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
      'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
      'figure', 'figcaption',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  return clean;
}

export function CmsPageWrapper({ slug, children }: Props) {
  const page = useQuery(api.pages.getBySlug, { slug });
  const safeHtml = page?.content ? sanitizeHtml(page.content) : '';

  // Still loading
  if (page === undefined) return <>{children}</>;

  // No CMS content or not published — show default
  if (!page || !page.isPublished) return <>{children}</>;

  // Render CMS content
  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="mb-8 text-center text-3xl font-bold">{page.title}</h1>
      <div className="rounded-2xl border bg-card p-6 md:p-10">
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    </div>
  );
}
