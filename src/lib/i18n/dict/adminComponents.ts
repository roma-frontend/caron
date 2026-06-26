import type { DictModule } from '../types';

/**
 * Admin-only widgets: promo template builder, vehicle compat selector, OEM
 * numbers input, AI chat widget, AI generate button, idle timeout modal.
 * Keys prefixed `acmp.`.
 */
export const adminComponents: DictModule = {
  // PromoTemplateBuilder
  'acmp.promo.previewCard': { hy: 'Նախադիտում՝ /promotions (քարտ)', ru: 'Предпросмотр: /promotions (карточка)', en: 'Preview: /promotions (card)' },
  'acmp.promo.previewBanner': { hy: 'Նախադիտում՝ Գլխավոր (բաններ)', ru: 'Предпросмотр: Главная (баннер)', en: 'Preview: Homepage (banner)' },
  'acmp.promo.bigText': { hy: 'Մեծ տեքստ (օր.՝ -30%, 2+1)', ru: 'Крупный текст (напр.: -30%, 2+1)', en: 'Large text (e.g.: -30%, 2+1)' },
  'acmp.promo.title': { hy: 'Վերնագիր', ru: 'Заголовок', en: 'Title' },
  'acmp.promo.titlePlaceholder': { hy: 'Կոճակների զեղչ', ru: 'Скидка на колодки', en: 'Discount on pads' },
  'acmp.promo.subtitle': { hy: 'Ենթավերնագիր', ru: 'Подзаголовок', en: 'Subtitle' },
  'acmp.promo.footnote': { hy: 'Ստորին նշում', ru: 'Примечание', en: 'Footnote' },
  'acmp.promo.footnotePlaceholder': { hy: 'Սահմանափակ առաջարկ', ru: 'Ограниченное предложение', en: 'Limited offer' },
  'acmp.promo.cardShape': { hy: 'Ձև՝ /promotions-ի համար', ru: 'Форма: для /promotions', en: 'Shape: for /promotions' },
  'acmp.promo.bannerShape': { hy: 'Ձև՝ Գլխավոր էջի բաններ', ru: 'Форма: баннер главной страницы', en: 'Shape: homepage banner' },
  'acmp.promo.shapeHint': { hy: '/promotions-ի համար սովորաբար՝ 1:1 (քառակուսի)։ Գլխավորի լայն բաններների համար՝ 16:5, 21:9 և այլն։', ru: 'Для /promotions обычно 1:1 (квадрат). Для широких баннеров главной — 16:5, 21:9 и т.д.', en: 'For /promotions usually 1:1 (square). For wide homepage banners — 16:5, 21:9, etc.' },
  'acmp.promo.template': { hy: 'Շաբլոն', ru: 'Шаблон', en: 'Template' },
  'acmp.promo.color': { hy: 'Գույն', ru: 'Цвет', en: 'Color' },

  // VehicleCompatSelector
  'acmp.vehicle.intro': { hy: 'Նշեք, թե ինչ ավտոմեքենաների հետ է համապատասխանում այս ապրանքը', ru: 'Укажите, с какими автомобилями совместим этот товар', en: 'Specify which vehicles this product is compatible with' },
  'acmp.vehicle.brand': { hy: 'Մակնիշ', ru: 'Марка', en: 'Make' },
  'acmp.vehicle.model': { hy: 'Մոդել', ru: 'Модель', en: 'Model' },
  'acmp.vehicle.yearFrom': { hy: 'Սկսած', ru: 'С', en: 'From' },
  'acmp.vehicle.yearTo': { hy: 'Մինչև', ru: 'До', en: 'To' },
  'acmp.vehicle.add': { hy: 'Ավելացնել', ru: 'Добавить', en: 'Add' },

  // OemNumbersInput
  'acmp.oem.label': { hy: 'OEM համարներ (մակնիշ + կոդ)', ru: 'OEM номера (производитель + код)', en: 'OEM numbers (manufacturer + code)' },
  'acmp.oem.mfgPlaceholder': { hy: 'մակնիշ (Նիսան, Տոյոտա)', ru: 'производитель (Ниссан, Тойота)', en: 'manufacturer (Nissan, Toyota)' },
  'acmp.oem.codePlaceholder': { hy: 'OEM կոդ (90919-01253)', ru: 'OEM код (90919-01253)', en: 'OEM code (90919-01253)' },

  // AIChatWidget
  'acmp.chat.unavailable': { hy: 'Ծառայությունը անհասանելի է։ Փորձեք ավելի ուշ։', ru: 'Сервис недоступен. Попробуйте позже.', en: 'Service unavailable. Please try again later.' },
  'acmp.chat.assistant': { hy: 'Ավտոպահեստամասերի օգնական', ru: 'Помощник по автозапчастям', en: 'Auto parts assistant' },
  'acmp.chat.askMe': { hy: 'Հարցրեք ինձ', ru: 'Спросите меня', en: 'Ask me' },
  'acmp.chat.inputPlaceholder': { hy: 'Գրեք հաղորդագրություն...', ru: 'Напишите сообщение...', en: 'Write a message...' },

  // AiGenerateButton
  'acmp.ai.fillName': { hy: 'Նախ լրացրեք անվանումը', ru: 'Сначала заполните название', en: 'First fill in the name' },
  'acmp.ai.success': { hy: 'AI-ն ստեղծեց նկարագրությունը և SEO-ն', ru: 'ИИ создал описание и SEO', en: 'AI generated the description and SEO' },
  'acmp.ai.error': { hy: 'Սխալ', ru: 'Ошибка', en: 'Error' },
  'acmp.ai.generating': { hy: 'Գեներացվում է...', ru: 'Генерация...', en: 'Generating...' },
  'acmp.ai.generate': { hy: 'AI գեներացիա', ru: 'AI генерация', en: 'AI generation' },

  // IdleTimeoutModal
  'acmp.idle.title': { hy: 'Սեսիան ավարտվել է', ru: 'Сессия завершена', en: 'Session expired' },
  'acmp.idle.desc': { hy: 'Ձեր սեսիան ավարտվել է։ Մուտք գործեք նորից:', ru: 'Ваша сессия завершена. Войдите снова.', en: 'Your session has expired. Please log in again.' },
  'acmp.idle.refresh': { hy: 'Թարմացնել', ru: 'Обновить', en: 'Refresh' },
  'acmp.idle.logout': { hy: 'Դուրս գալ', ru: 'Выйти', en: 'Log out' },
};
