import { VinDecoder } from '@/components/VinDecoder';

export default function VinDecoderPage() {
  return (
    <div className="mx-auto py-12" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
      <VinDecoder />
    </div>
  );
}
