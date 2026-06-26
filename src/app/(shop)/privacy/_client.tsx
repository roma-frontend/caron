'use client';

import { Shield } from 'lucide-react';
import { ContactInfo } from '@/components/shared/ContactInfo';
import { CmsPageWrapper } from '@/components/shared/CmsPageWrapper';
import { useT } from '@/lib/i18n/admin';

export default function PrivacyPageClient() {
  const { t } = useT();
  return (
    <CmsPageWrapper slug="privacy">
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">{t('pg.privacy.title')}</h1>
        <p className="mt-3 text-sm text-muted-foreground"><strong>{t('pg.legal.lastUpdate')}</strong> {t('pg.legal.updateDate')}</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 md:p-10">
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
          <p>{t('pg.privacy.p1')}</p> <h2>{t('pg.privacy.s1')}</h2> <h3>{t('pg.privacy.s1_1')}</h3> <p>{t('pg.privacy.s1_1_p')}</p> <ul> <li>{t('pg.privacy.li.fullName')}</li> <li>{t('pg.privacy.li.email')}</li> <li>{t('pg.privacy.li.phone')}</li> <li>{t('pg.privacy.li.shipAddress')}</li> <li>{t('pg.privacy.li.orderNotes')}</li> </ul> <h3>{t('pg.privacy.s1_2')}</h3> <p>{t('pg.privacy.s1_2_p')}</p> <h3>{t('pg.privacy.s1_3')}</h3> <p>{t('pg.privacy.s1_3_p')}</p> <ul> <li>{t('pg.privacy.li.ip')}</li> <li>{t('pg.privacy.li.browser')}</li> <li>{t('pg.privacy.li.pagesTime')}</li> <li>{t('pg.privacy.li.referrer')}</li> <li>{t('pg.privacy.li.device')}</li> </ul> <h2>{t('pg.privacy.s2')}</h2> <p>{t('pg.privacy.s2_p')}</p> <ul> <li>{t('pg.privacy.s2.li1')}</li> <li>{t('pg.privacy.s2.li2')}</li> <li>{t('pg.privacy.s2.li3')}</li> <li>{t('pg.privacy.s2.li4')}</li> <li>{t('pg.privacy.s2.li5')}</li> <li>{t('pg.privacy.s2.li6')}</li> </ul> <h2>{t('pg.privacy.s3')}</h2> <p>{t('pg.privacy.s3_p')}</p> <h2>{t('pg.privacy.s4')}</h2> <p>{t('pg.privacy.s4_p')}</p> <ul> <li><strong>{t('pg.privacy.cookie.session')}</strong> — {t('pg.privacy.cookie.sessionDesc')}</li> <li><strong>{t('pg.privacy.cookie.local')}</strong> — {t('pg.privacy.cookie.localDesc')}</li> <li><strong>{t('pg.privacy.cookie.theme')}</strong> — {t('pg.privacy.cookie.themeDesc')}</li> </ul> <p>{t('pg.privacy.noAds')}</p> <h2>{t('pg.privacy.s5')}</h2> <p>{t('pg.privacy.s5_p')}</p> <ul> <li><strong>Convex</strong> — {t('pg.privacy.tp.convex')}</li> <li><strong>Cloudflare</strong> — {t('pg.privacy.tp.cloudflare')}</li> <li><strong>Upstash</strong> — rate limiting</li> <li><strong>Google</strong> — {t('pg.privacy.tp.google')}</li> </ul> <p>{t('pg.privacy.s5_p2')}</p> <h2>{t('pg.privacy.s6')}</h2> <p>{t('pg.privacy.s6_p')}</p> <h2>{t('pg.privacy.s7')}</h2> <p>{t('pg.privacy.s7_p')}</p> <ul> <li>{t('pg.privacy.s7.li1')}</li> <li>{t('pg.privacy.s7.li2')}</li> <li>{t('pg.privacy.s7.li3')}</li> <li>{t('pg.privacy.s7.li4')}</li> <li>{t('pg.privacy.s7.li5')}</li> </ul> <p>{t('pg.privacy.s7_contact_a')} <strong>info@caron.group</strong> {t('pg.privacy.s7_contact_b')}</p> <h2>{t('pg.privacy.s8')}</h2> <p>{t('pg.privacy.s8_p')}</p> <h2>{t('pg.privacy.s9')}</h2> <p>{t('pg.privacy.s9_p')}</p> <h2>{t('pg.privacy.s10')}</h2> <p>{t('pg.privacy.s10_p')}</p> <ContactInfo />
        </div>
      </div>
    </div>
    </CmsPageWrapper>
  );
}
