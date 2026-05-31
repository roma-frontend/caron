'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="hy">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{'Ինչ-որ բան սխալ է'}</h2>
          <button onClick={reset} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: '#0066ae', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            {'Կրկին փորձել'}
          </button>
        </div>
      </body>
    </html>
  );
}
