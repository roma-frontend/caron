import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" style={{ paddingInline: 'var(--space-container)' }}>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <ShoppingCart className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-6xl font-black text-primary">404</h1>
      <p className="mt-4 text-xl font-semibold">{'Էջը չի գտնվել'}</p>
      <p className="mt-2 text-muted-foreground">{'Ընտրեք մի այլ էջ և փորձեք կրկին'}</p>
      <Link href="/" className="mt-8">
        <Button size="lg" className="gap-2">
          <Home className="h-4 w-4" /> {'Գլխավոր էջ'}
        </Button>
      </Link>
    </div>
  );
}
