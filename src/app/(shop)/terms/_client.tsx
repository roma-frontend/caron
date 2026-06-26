'use client';

import { FileText } from 'lucide-react';
import { ContactInfo } from '@/components/shared/ContactInfo';
import { CmsPageWrapper } from '@/components/shared/CmsPageWrapper';
import { useT } from '@/lib/i18n/admin';

export default function TermsPageClient() {
  const { t } = useT();
  return (
    <CmsPageWrapper slug="terms">
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">{t('pg.terms.title')}</h1>
        <p className="mt-3 text-sm text-muted-foreground"><strong>{t('pg.legal.lastUpdate')}</strong> {t('pg.legal.updateDate')}</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 md:p-10">
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
          <p>{t('pg.terms.p1')}</p> <h2>{t('pg.terms.s1')}</h2> <ul> <li>{t('pg.terms.s1.li1')}</li> <li>{t('pg.terms.s1.li2')}</li> <li>{t('pg.terms.s1.li3')}</li> </ul> <h2>{t('pg.terms.s2')}</h2> <ul> <li>{t('pg.terms.s2.li1')}</li> <li>{t('pg.terms.s2.li2')}</li> <li>{t('pg.terms.s2.li3')}</li> <li>{t('pg.terms.s2.li4')}</li> </ul> <h2>{t('pg.terms.s3')}</h2> <ul> <li>{t('pg.terms.s3.li1')}</li> <li>{t('pg.terms.s3.li2')}</li> <li>{t('pg.terms.s3.li3')}</li> <li>{t('pg.terms.s3.li4')}</li> </ul> <h2>{t('pg.terms.s4')}</h2> <ul> <li>{t('pg.terms.s4.li1')}</li> <li>{t('pg.terms.s4.li2')}</li> <li>{t('pg.terms.s4.li3')}</li> </ul> <h2>{t('pg.terms.s5')}</h2> <ul> <li>{t('pg.terms.s5.li1')}</li> <li>{t('pg.terms.s5.li2')}</li> <li>{t('pg.terms.s5.li3')}</li> </ul> <h2>{t('pg.terms.s6')}</h2> <ul> <li>{t('pg.terms.s6.li1')}</li> <li>{t('pg.terms.s6.li2')}</li> <li>{t('pg.terms.s6.li3')}</li> <li>{t('pg.terms.s6.li4')}</li> </ul> <h2>{t('pg.terms.s7')}</h2> <ul> <li>{t('pg.terms.s7.li1')}</li> <li>{t('pg.terms.s7.li2')}</li> <li>{t('pg.terms.s7.li3')}</li> <li>{t('pg.terms.s7.li4')}</li> <li>{t('pg.terms.s7.li5')}</li> </ul> <h2>{t('pg.terms.s8')}</h2> <ul> <li>{t('pg.terms.s8.li1')}</li> <li>{t('pg.terms.s8.li2')}</li> <li>{t('pg.terms.s8.li3')}</li> </ul> <h2>{t('pg.terms.s9')}</h2> <ul> <li>{t('pg.terms.s9.li1')}</li> <li>{t('pg.terms.s9.li2')}</li> </ul> <h2>{t('pg.terms.s10')}</h2> <ul> <li>{t('pg.terms.s10.li1')}</li> <li>{t('pg.terms.s10.li2')}</li> <li>{t('pg.terms.s10.li3')}</li> </ul> <h2>{t('pg.terms.s11')}</h2> <p>{t('pg.terms.s11_p')}</p> <ul> <li>{t('pg.terms.s11.li1')}</li> <li>{t('pg.terms.s11.li2')}</li> <li>{t('pg.terms.s11.li3')}</li> <li>{t('pg.terms.s11.li4')}</li> </ul> <h2>{t('pg.terms.s12')}</h2> <p>{t('pg.terms.s12_p')}</p> <h2>{t('pg.terms.s13')}</h2> <p>{t('pg.terms.s13_p')}</p> <ContactInfo />
        </div>
      </div>
    </div>
    </CmsPageWrapper>
  );
}
