'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { JsonLd } from '@/components/JsonLd';
import { MaintenanceGate } from '@/components/MaintenanceGate';
import { ScrollToTop } from '@/components/ScrollToTop';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <MaintenanceGate>
          <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            {children}
          </motion.div>
        </MaintenanceGate>
      </main>
      <Footer />
      <MobileNav />
      <ScrollToTop />
      <JsonLd />
    </div>
  );
}
