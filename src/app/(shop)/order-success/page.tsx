import { Suspense } from 'react';
import OrderSuccessContent from './content';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Բեռնվում է․․․Ս</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
