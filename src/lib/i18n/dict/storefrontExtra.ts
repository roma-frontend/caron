import type { DictModule } from '../types';

/**
 * Storefront long-tail: home rails, footer, announcement / maintenance / cookie
 * banners, promotion detail page, small cards & toggles. Keys prefixed `sx.`.
 */
export const storefrontExtra: DictModule = {
  // Home rails (section titles)
  'sx.rail.bestsellers': { hy: 'Բեսթսելլերներ', ru: 'Бестселлеры', en: 'Bestsellers' },
  'sx.rail.forYou': { hy: 'Ձեզ համար', ru: 'Для вас', en: 'For you' },
  'sx.rail.newArrivals': { hy: 'Նոր Ապրանքներ', ru: 'Новинки', en: 'New arrivals' },

  // Delivery promo strip
  'sx.delivery.fastTitle': {
    hy: 'Արագ առաքում Հայաստանի պահեստից',
    ru: 'Быстрая доставка со склада в Армении',
    en: 'Fast delivery from our warehouse in Armenia',
  },
  'sx.delivery.details': { hy: 'Մանրամասներ', ru: 'Подробнее', en: 'Details' },

  // Flash countdown
  'sx.flash.endsIn': { hy: 'Ավարտվում է՝', ru: 'Заканчивается:', en: 'Ends in:' },

  // Promotion detail page
  'sx.promo.unitDays': { hy: 'օր', ru: 'дн.', en: 'd' },
  'sx.promo.unitHours': { hy: 'ժ', ru: 'ч', en: 'h' },
  'sx.promo.unitMins': { hy: 'ր', ru: 'мин', en: 'm' },
  'sx.promo.notFound': { hy: 'Ակցիան չի գտնվել', ru: 'Акция не найдена', en: 'Promotion not found' },
  'sx.promo.breadcrumb': { hy: 'Ակցիաներ', ru: 'Акции', en: 'Promotions' },
  'sx.promo.expired': { hy: 'Ավարտված', ru: 'Завершена', en: 'Ended' },
  'sx.promo.upcoming': { hy: 'Շուտով', ru: 'Скоро', en: 'Soon' },
  'sx.promo.active': { hy: 'Ակտիվ', ru: 'Активна', en: 'Active' },
  'sx.promo.remaining': { hy: 'Մնաց', ru: 'Осталось', en: 'Remaining' },
  'sx.promo.daysWord': { hy: 'օր', ru: 'дн.', en: 'days' },
  'sx.promo.products': { hy: 'Ակցիայի ապրանքներ', ru: 'Товары акции', en: 'Promotion products' },
  'sx.promo.noProducts': {
    hy: 'Այս ակցիային կցված ապրանքներ չկան',
    ru: 'К этой акции не привязаны товары',
    en: 'No products are linked to this promotion',
  },

  // Shared word — "item(s)" used after a count
  'sx.itemsWord': { hy: 'ապրանք', ru: 'товаров', en: 'items' },

  // Footer
  'sx.footer.orderCheck': { hy: 'Պատվերի ստուգում', ru: 'Проверка заказа', en: 'Order tracking' },
  'sx.footer.addressFallback': { hy: 'Երևան, Հայաստան', ru: 'Ереван, Армения', en: 'Yerevan, Armenia' },
  'sx.footer.info': { hy: 'Տեղեկատվություն', ru: 'Информация', en: 'Information' },
  'sx.footer.privacy': { hy: 'Գաղտնիություն', ru: 'Конфиденциальность', en: 'Privacy' },
  'sx.footer.terms': { hy: 'Պայմաններ', ru: 'Условия', en: 'Terms' },
  'sx.footer.rights': { hy: 'Բոլոր իրավունքները պաշտպանված են։', ru: 'Все права защищены.', en: 'All rights reserved.' },

  // Maintenance gate
  'sx.maintenance.title': {
    hy: 'Կայքը ժամանակավորապես անհասանելի է',
    ru: 'Сайт временно недоступен',
    en: 'The site is temporarily unavailable',
  },
  'sx.maintenance.message': {
    hy: 'Շուտով կվերադառնանք։ Շնորհակալություն համբերության համար։',
    ru: 'Скоро вернёмся. Спасибо за терпение.',
    en: 'We will be back soon. Thank you for your patience.',
  },

  // Admin order notification toast
  'sx.order.new': { hy: 'Նոր պատվեր', ru: 'Новый заказ', en: 'New order' },

  // Admin return notification toast
  'sx.return.new': { hy: 'Նոր հայտ՝', ru: 'Новая заявка:', en: 'New request:' },
  'sx.return.exchange': { hy: 'Փոխանակում', ru: 'Обмен', en: 'Exchange' },
  'sx.return.return': { hy: 'Վերադարձ', ru: 'Возврат', en: 'Return' },

  // Announcement bar
  'sx.announce.learnMore': { hy: 'Իմանալ ավելին', ru: 'Узнать больше', en: 'Learn more' },
  'sx.close': { hy: 'Փակել', ru: 'Закрыть', en: 'Close' },

  // Recently viewed
  'sx.recentlyViewed.title': {
    hy: 'Վերջերս դիտված ապրանքներ',
    ru: 'Недавно просмотренные товары',
    en: 'Recently viewed products',
  },

  // Cookie consent
  'sx.cookie.text': {
    hy: 'Մենք օգտագործում ենք Cookie-ներ կայքի աշխատանքը բարելավելու համար',
    ru: 'Мы используем cookie для улучшения работы сайта',
    en: 'We use cookies to improve the website experience',
  },

  // Scroll-to-top & theme toggle (aria-labels)
  'sx.scrollTop': { hy: 'Ոլորել վերև', ru: 'Прокрутить вверх', en: 'Scroll to top' },
  'sx.themeToggle': { hy: 'Փոխել թեման', ru: 'Сменить тему', en: 'Toggle theme' },
};
