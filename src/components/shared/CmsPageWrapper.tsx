'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface Props {
  slug: string;
  children: React.ReactNode;
}

export function CmsPageWrapper({ slug, children }: Props) {
  const page = useQuery(api.pages.getBySlug, { slug });

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
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
