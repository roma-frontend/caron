import type { DictModule } from '../types';

/**
 * Leftover content extracted from former server components (newsletter form,
 * 404, returns policy, OEM results page). Keys prefixed `misc.`.
 */
export const misc: DictModule = {
  // Newsletter form
  'misc.newsTitle': { hy: 'Լուրեր և առաջարկներ', ru: 'Новости и предложения', en: 'News & offers' },
  'misc.newsSubtitle': { hy: 'Բաժանորդագրվեք և ստացեք զեղչեր առաջինը', ru: 'Подпишитесь и получайте скидки первыми', en: 'Subscribe and get discounts first' },
  'misc.subscribed': { hy: 'Բաժանորդագրված!', ru: 'Вы подписаны!', en: 'Subscribed!' },

  // 404 not found
  'misc.notFoundTitle': { hy: 'Էջը չի գտնվել', ru: 'Страница не найдена', en: 'Page not found' },
  'misc.notFoundText': { hy: 'Ընտրեք մի այլ էջ և փորձեք կրկին', ru: 'Выберите другую страницу и попробуйте снова', en: 'Choose another page and try again' },
  'misc.homePage': { hy: 'Գլխավոր էջ', ru: 'Главная', en: 'Home' },

  // Returns policy page
  'misc.returnsTitle': { hy: 'Վերադարձ և փոխանակում', ru: 'Возврат и обмен', en: 'Returns & exchanges' },
  'misc.returnsSubtitle': { hy: 'Մեր վերադարձի և փոխանակման պայմանները', ru: 'Наши условия возврата и обмена', en: 'Our return and exchange terms' },
  'misc.returnsProcedure': { hy: 'Ընթացակարգը', ru: 'Процедура', en: 'Procedure' },
  'misc.retDeadlinesTitle': { hy: 'Վերադարձի ժամկետներ', ru: 'Сроки возврата', en: 'Return deadlines' },
  'misc.retDeadline1': { hy: 'Վերադարձը հնարավոր է 14 օրվա ընթացքում', ru: 'Возврат возможен в течение 14 дней', en: 'Returns are possible within 14 days' },
  'misc.retDeadline2': { hy: 'Հաշվարկը կատարվում է առաքման օրվանից', ru: 'Отсчёт ведётся со дня доставки', en: 'Counted from the delivery date' },
  'misc.retDeadline3': { hy: 'Գումարը վերադարձվում է 3-5 աշխատանքային օրվա ընթացքում', ru: 'Деньги возвращаются в течение 3-5 рабочих дней', en: 'Refund is issued within 3-5 business days' },
  'misc.retCanTitle': { hy: 'Կարելի է վերադարձնել', ru: 'Можно вернуть', en: 'Can be returned' },
  'misc.retCan1': { hy: 'Ապրանքը չի օգտագործվել', ru: 'Товар не использовался', en: 'The product was not used' },
  'misc.retCan2': { hy: 'Պահպանվել է փաթեթավորումը', ru: 'Сохранена упаковка', en: 'The packaging is intact' },
  'misc.retCan3': { hy: 'Ապրանքը չի համապատասխանում մեքենային', ru: 'Товар не подошёл к автомобилю', en: 'The product does not fit the car' },
  'misc.retCannotTitle': { hy: 'Չի կարելի վերադարձնել', ru: 'Нельзя вернуть', en: 'Cannot be returned' },
  'misc.retCannot1': { hy: 'Ապրանքը տեղադրվել է', ru: 'Товар был установлен', en: 'The product was installed' },
  'misc.retCannot2': { hy: 'Վնասվել է փաթեթավորումը', ru: 'Повреждена упаковка', en: 'The packaging is damaged' },
  'misc.retCannot3': { hy: 'Անցել է 14 օրից ավելի', ru: 'Прошло более 14 дней', en: 'More than 14 days have passed' },
  'misc.retStep1': { hy: 'Կապվեք մեզ հետ հեռախոսով կամ էլ. փոստով', ru: 'Свяжитесь с нами по телефону или эл. почте', en: 'Contact us by phone or email' },
  'misc.retStep2': { hy: 'Նշեք պատվերի համարը և վերադարձի պատճառը', ru: 'Укажите номер заказа и причину возврата', en: 'Provide the order number and return reason' },
  'misc.retStep3': { hy: 'Ուղարկեք ապրանքը մեր խանութ կամ սուրհանդակով', ru: 'Отправьте товар в наш магазин или курьером', en: 'Send the product to our store or by courier' },
  'misc.retStep4': { hy: 'Ստացեք գումարի վերադարձը 3-5 օրվա ընթացքում', ru: 'Получите возврат денег в течение 3-5 дней', en: 'Receive your refund within 3-5 days' },

  // OEM results page
  'misc.oemSearch': { hy: 'OEM որոնում', ru: 'Поиск по OEM', en: 'OEM search' },
  'misc.oemEnterCode': { hy: 'Մուտքագրեք OEM համարը որոնման համար', ru: 'Введите OEM-номер для поиска', en: 'Enter an OEM number to search' },
  'misc.viewAllProducts': { hy: 'Դիտել բոլոր ապրանքները', ru: 'Смотреть все товары', en: 'View all products' },
  'misc.breadcrumbHome': { hy: 'Գլխավոր', ru: 'Главная', en: 'Home' },
  'misc.breadcrumbProducts': { hy: 'Ապրանքներ', ru: 'Товары', en: 'Products' },
  'misc.foundPrefix': { hy: 'Գտնվել է', ru: 'Найдено', en: 'Found' },
  'misc.productWord': { hy: 'ապրանք', ru: 'товаров', en: 'products' },
  'misc.noProductsFound': { hy: 'Ապրանքներ չեն գտնվել', ru: 'Товары не найдены', en: 'No products found' },
  'misc.oemNotFoundSuffix': { hy: 'OEM համարով ապրանքներ չեն գտնվել', ru: 'товаров по OEM-номеру не найдено', en: 'no products found for this OEM number' },
  'misc.similarSearches': { hy: 'Նմանատիպ որոնումներ', ru: 'Похожие запросы', en: 'Similar searches' },
  'misc.oemInfoText': {
    hy: 'OEM (Original Equipment Manufacturer) համարը թույլ է տալիս գտնել ճշգրիտ պահեստամասը ձեր մեքենայի համար: Որոնեք նաև',
    ru: 'OEM-номер (Original Equipment Manufacturer) позволяет найти точную запчасть для вашего автомобиля. Ищите также',
    en: 'The OEM (Original Equipment Manufacturer) number lets you find the exact part for your car. You can also search',
  },
  'misc.oemInfoVin': { hy: 'VIN ապակոդավորում', ru: 'VIN-декодер', en: 'VIN decoder' },
  'misc.oemInfoOr': { hy: 'կամ', ru: 'или', en: 'or' },
  'misc.oemInfoSelectMake': { hy: 'ընտրեք մակնիշ', ru: 'выберите марку', en: 'select a make' },
};
