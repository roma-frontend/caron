// Force all admin pages to be dynamically rendered (not statically prerendered)
export const dynamic = 'force-dynamic';

export default function AdminDynamicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
