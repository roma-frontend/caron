import type { DictModule } from '../types';

/**
 * Admin shell strings: navigation, profile menu, notification bell, command
 * palette and shared common words. Other domain modules live alongside this
 * file and are merged in `dict/index.ts`.
 */
export const shell: DictModule = {
  // ── Navigation ──────────────────────────────────────────────
  'nav.dashboard': { hy: 'Վահանակ', ru: 'Панель', en: 'Dashboard' },
  'nav.products': { hy: 'Ապրանքներ', ru: 'Товары', en: 'Products' },
  'nav.categories': { hy: 'Կատեգորիաներ', ru: 'Категории', en: 'Categories' },
  'nav.filters': { hy: 'Ֆիլտրեր', ru: 'Фильтры', en: 'Filters' },
  'nav.orders': { hy: 'Պատվերներ', ru: 'Заказы', en: 'Orders' },
  'nav.returns': { hy: 'Վերադարձներ', ru: 'Возвраты', en: 'Returns' },
  'nav.customers': { hy: 'Հաճախորդներ', ru: 'Клиенты', en: 'Customers' },
  'nav.stock': { hy: 'Պահեստ', ru: 'Склад', en: 'Stock' },
  'nav.analytics': { hy: 'Վերլուծություն', ru: 'Аналитика', en: 'Analytics' },
  'nav.promotions': { hy: 'Ակցիաներ', ru: 'Акции', en: 'Promotions' },
  'nav.coupons': { hy: 'Կուպոններ', ru: 'Купоны', en: 'Coupons' },
  'nav.reviews': { hy: 'Կարծիքներ', ru: 'Отзывы', en: 'Reviews' },
  'nav.qa': { hy: 'Հարցեր', ru: 'Вопросы', en: 'Questions' },
  'nav.pages': { hy: 'Էջեր', ru: 'Страницы', en: 'Pages' },
  'nav.delivery': { hy: 'Առաքում', ru: 'Доставка', en: 'Delivery' },
  'nav.settings': { hy: 'Կարգավորումներ', ru: 'Настройки', en: 'Settings' },

  // ── Shell common ────────────────────────────────────────────
  'common.all': { hy: 'Բոլորը', ru: 'Все', en: 'All' },
  'common.management': { hy: 'Կառավարում', ru: 'Управление', en: 'Management' },
  'common.logout': { hy: 'Դուրս գալ', ru: 'Выйти', en: 'Log out' },
  'common.cancel': { hy: 'Չեղարկել', ru: 'Отмена', en: 'Cancel' },
  'common.save': { hy: 'Պահպանել', ru: 'Сохранить', en: 'Save' },
  'common.saving': { hy: 'Պահպանվում է...', ru: 'Сохранение...', en: 'Saving...' },
  'common.gotIt': { hy: 'Հասկանալի է', ru: 'Понятно', en: 'Got it' },
  'shell.sessionExpiredToast': { hy: 'Սեսիան ավարտվել է, խնդրում ենք կրկին մուտք գործել', ru: 'Сессия истекла, пожалуйста, войдите снова', en: 'Session expired, please sign in again' },
  'shell.loggedOut': { hy: 'Դուք դուրս եկաք համակարգից', ru: 'Вы вышли из системы', en: 'You have been logged out' },
  'shell.sessionExpired': { hy: 'Սեսիան ավարտվել է', ru: 'Сессия истекла', en: 'Session expired' },
  'shell.untilNextTime': { hy: 'Մինչ նոր հանդիպում', ru: 'До новой встречи', en: 'Until next time' },
  'shell.aiBannerSubtitle': { hy: 'Հարցրեք պատվերների ու վիճակագրության մասին', ru: 'Спросите о заказах и статистике', en: 'Ask about orders and statistics' },
  'shell.errorTitle': { hy: 'Սխալ ադմինիստրատորի էջում', ru: 'Ошибка на странице администратора', en: 'Error on the admin page' },
  'shell.errorRetryMsg': { hy: 'Խնդրում ենք փորձել կրկին', ru: 'Пожалуйста, попробуйте снова', en: 'Please try again' },
  'shell.retry': { hy: 'Փորձել կրկին', ru: 'Попробовать снова', en: 'Try again' },

  // ── Profile menu ────────────────────────────────────────────
  'menu.profile': { hy: 'Պրոֆիլի ընտրացանկ', ru: 'Меню профиля', en: 'Profile menu' },
  'menu.admin': { hy: 'Ադմին', ru: 'Админ', en: 'Admin' },
  'menu.attention': { hy: 'Ուշադրության կարիք ունի', ru: 'Требует внимания', en: 'Needs attention' },
  'menu.allClear': { hy: 'Ամեն ինչ կարգին է', ru: 'Всё в порядке', en: 'All clear' },
  'menu.quickActions': { hy: 'Արագ գործողություններ', ru: 'Быстрые действия', en: 'Quick actions' },
  'menu.newProduct': { hy: 'Նոր ապրանք', ru: 'Товар', en: 'Product' },
  'menu.newCategory': { hy: 'Կատեգորիա', ru: 'Категория', en: 'Category' },
  'menu.coupon': { hy: 'Կուպոն', ru: 'Купон', en: 'Coupon' },
  'menu.search': { hy: 'Որոնում', ru: 'Поиск', en: 'Search' },
  'menu.theme': { hy: 'Թեմա', ru: 'Тема', en: 'Theme' },
  'menu.themeLight': { hy: 'Բաց', ru: 'Светлая', en: 'Light' },
  'menu.themeDark': { hy: 'Մուգ', ru: 'Тёмная', en: 'Dark' },
  'menu.themeSystem': { hy: 'Համակարգ', ru: 'Система', en: 'System' },
  'menu.language': { hy: 'Լեզու', ru: 'Язык', en: 'Language' },
  'menu.openStore': { hy: 'Բացել խանութը', ru: 'Открыть магазин', en: 'Open store' },
  'menu.changePassword': { hy: 'Փոխել գաղտնաբառը', ru: 'Сменить пароль', en: 'Change password' },
  'menu.help': { hy: 'Օգնություն', ru: 'Помощь', en: 'Help' },

  // ── Attention items ─────────────────────────────────────────
  'attention.orders': { hy: 'Նոր պատվերներ', ru: 'Новые заказы', en: 'New orders' },
  'attention.returns': { hy: 'Վերադարձներ', ru: 'Возвраты', en: 'Returns' },
  'attention.questions': { hy: 'Անպատասխան հարցեր', ru: 'Вопросы без ответа', en: 'Unanswered questions' },
  'attention.reviews': { hy: 'Կարծիքներ հաստատման', ru: 'Отзывы на модерации', en: 'Reviews to approve' },
  'attention.outOfStock': { hy: 'Պաշարը սպառվել է', ru: 'Нет в наличии', en: 'Out of stock' },
  'attention.lowStock': { hy: 'Քիչ պաշար', ru: 'Мало на складе', en: 'Low stock' },

  // ── Notification bell ───────────────────────────────────────
  'bell.title': { hy: 'Ծանուցումներ', ru: 'Уведомления', en: 'Notifications' },
  'bell.empty': { hy: 'Նոր ծանուցումներ չկան', ru: 'Новых уведомлений нет', en: 'No new notifications' },
  'bell.emptyHint': { hy: 'Բոլոր գործողություններն ավարտված են', ru: 'Все действия выполнены', en: 'Everything is handled' },
  'feed.order': { hy: 'Նոր պատվեր', ru: 'Новый заказ', en: 'New order' },
  'feed.return': { hy: 'Վերադարձ', ru: 'Возврат', en: 'Return' },
  'feed.exchange': { hy: 'Փոխանակում', ru: 'Обмен', en: 'Exchange' },
  'feed.review': { hy: 'Նոր կարծիք', ru: 'Новый отзыв', en: 'New review' },
  'feed.question': { hy: 'Նոր հարց', ru: 'Новый вопрос', en: 'New question' },

  // ── Command palette ─────────────────────────────────────────
  'palette.title': { hy: 'Որոնում', ru: 'Поиск', en: 'Search' },
  'palette.description': { hy: 'Փնտրեք ապրանք, պատվեր կամ հաճախորդ', ru: 'Найдите товар, заказ или клиента', en: 'Find a product, order or customer' },
  'palette.placeholder': { hy: 'Որոնել ապրանք, պատվեր, հաճախորդ...', ru: 'Искать товар, заказ, клиента...', en: 'Search products, orders, customers...' },
  'palette.searchPlaceholderShort': { hy: 'Որոնել ապրանք, պատվեր...', ru: 'Искать товар, заказ...', en: 'Search products, orders...' },
  'palette.empty': { hy: 'Ոչինչ չգտնվեց', ru: 'Ничего не найдено', en: 'Nothing found' },
  'palette.quickActions': { hy: 'Արագ գործողություններ', ru: 'Быстрые действия', en: 'Quick actions' },
  'palette.sections': { hy: 'Բաժիններ', ru: 'Разделы', en: 'Sections' },
  'palette.products': { hy: 'Ապրանքներ', ru: 'Товары', en: 'Products' },
  'palette.orders': { hy: 'Պատվերներ', ru: 'Заказы', en: 'Orders' },
  'palette.customers': { hy: 'Հաճախորդներ', ru: 'Клиенты', en: 'Customers' },
  'palette.addProduct': { hy: 'Նոր ապրանք ավելացնել', ru: 'Добавить товар', en: 'Add product' },
  'palette.addCategory': { hy: 'Նոր կատեգորիա', ru: 'Добавить категорию', en: 'Add category' },

  // ── Change password dialog ──────────────────────────────────
  'pw.title': { hy: 'Փոխել գաղտնաբառը', ru: 'Сменить пароль', en: 'Change password' },
  'pw.description': { hy: 'Մուտքագրեք ընթացիկ և նոր գաղտնաբառը։', ru: 'Введите текущий и новый пароль.', en: 'Enter your current and new password.' },
  'pw.current': { hy: 'Ընթացիկ գաղտնաբառ', ru: 'Текущий пароль', en: 'Current password' },
  'pw.new': { hy: 'Նոր գաղտնաբառ', ru: 'Новый пароль', en: 'New password' },
  'pw.confirm': { hy: 'Կրկնել նոր գաղտնաբառը', ru: 'Повторите новый пароль', en: 'Confirm new password' },
  'pw.minLen': { hy: 'Նոր գաղտնաբառը պետք է լինի առնվազն 8 նիշ', ru: 'Новый пароль должен быть не короче 8 символов', en: 'New password must be at least 8 characters' },
  'pw.mismatch': { hy: 'Գաղտնաբառերը չեն համընկնում', ru: 'Пароли не совпадают', en: 'Passwords do not match' },
  'pw.success': { hy: 'Գաղտնաբառը հաջողությամբ փոխվեց', ru: 'Пароль успешно изменён', en: 'Password changed successfully' },
  'pw.error': { hy: 'Չհաջողվեց փոխել գաղտնաբառը', ru: 'Не удалось сменить пароль', en: 'Failed to change password' },

  // ── Help dialog ─────────────────────────────────────────────
  'help.title': { hy: 'Օգնություն և դյուրանցումներ', ru: 'Помощь и горячие клавиши', en: 'Help & shortcuts' },
  'help.description': { hy: 'Արագ աշխատանքի համար օգտակար հնարքներ։', ru: 'Полезные приёмы для быстрой работы.', en: 'Handy tips for faster work.' },
  'help.searchShortcut': { hy: 'Գլոբալ որոնում (ապրանք, պատվեր, հաճախորդ)', ru: 'Глобальный поиск (товар, заказ, клиент)', en: 'Global search (product, order, customer)' },
  'help.escShortcut': { hy: 'Փակել պատուհանը', ru: 'Закрыть окно', en: 'Close window' },
  'help.attentionNote': {
    hy: 'Վերևի «Ուշադրության կարիք ունի» բաժնում երևում են այն գործողությունները, որոնք սպասում են ձեր արձագանքին՝ նոր պատվերներ, վերադարձներ, անպատասխան հարցեր, քիչ պաշար։',
    ru: 'В разделе «Требует внимания» вверху показаны действия, ожидающие вашей реакции: новые заказы, возвраты, вопросы без ответа, мало товара.',
    en: 'The "Needs attention" section above shows items awaiting your response: new orders, returns, unanswered questions, low stock.',
  },
};
