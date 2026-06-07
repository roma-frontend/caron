import { OemSearchInline } from '@/components/OemSearchInline';

export default function OemPage() {
  return (
    <div className="mx-auto py-12" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
      <OemSearchInline />
    </div>
  );
}
