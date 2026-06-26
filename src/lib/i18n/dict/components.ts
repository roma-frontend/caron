import type { DictModule } from '../types';

/**
 * Shared components: header, mobile nav, footer, search command, newsletter,
 * cookie consent, push toggle, error / not-found pages, misc widgets.
 * Keys prefixed `cmp.`.
 */
export const components: DictModule = {
  // ─── Navigation / header ───
  'cmp.nav_catalog': { hy: 'Ցանկ', ru: 'Каталог', en: 'Catalog' },
  'cmp.nav_categories': { hy: 'Կատեգորիաներ', ru: 'Категории', en: 'Categories' },
  'cmp.nav_promotions': { hy: 'Ակցիաներ', ru: 'Акции', en: 'Promotions' },
  'cmp.nav_contact': { hy: 'Կապ', ru: 'Контакты', en: 'Contact' },
  'cmp.nav_order_status': { hy: 'Պատվերի կարգավիճակ', ru: 'Статус заказа', en: 'Order status' },
  'cmp.nav_about': { hy: 'Մեր մասին', ru: 'О нас', en: 'About us' },
  'cmp.nav_compare': { hy: 'Համեմատել', ru: 'Сравнить', en: 'Compare' },
  'cmp.nav_delivery': { hy: 'Առաքում', ru: 'Доставка', en: 'Delivery' },
  'cmp.nav_search': { hy: 'Որոնել...', ru: 'Поиск...', en: 'Search...' },
  'cmp.nav_favorites': { hy: 'Նախընտրվածներ', ru: 'Избранное', en: 'Favorites' },
  'cmp.nav_cart': { hy: 'Զամբյուղ', ru: 'Корзина', en: 'Cart' },
  'cmp.nav_login': { hy: 'Մուտք', ru: 'Вход', en: 'Login' },
  'cmp.nav_account': { hy: 'Հաշիվ', ru: 'Аккаунт', en: 'Account' },
  'cmp.select_make': { hy: 'Ընտրել մակնիշ', ru: 'Выбрать марку', en: 'Select make' },
  'cmp.more': { hy: 'Ավելին', ru: 'Ещё', en: 'More' },
  'cmp.vin_decoder': { hy: 'VIN ապակոդավորում', ru: 'Расшифровка VIN', en: 'VIN decoder' },
  'cmp.oem_search': { hy: 'OEM որոնում', ru: 'Поиск по OEM', en: 'OEM search' },
  'cmp.navigation': { hy: 'Նավիգացիա', ru: 'Навигация', en: 'Navigation' },

  // ─── Mobile nav ───
  'cmp.home': { hy: 'Գլխավոր', ru: 'Главная', en: 'Home' },
  'cmp.select_car': { hy: 'Ընտրել ավտո', ru: 'Выбрать авто', en: 'Select car' },
  'cmp.discounts': { hy: 'Զեղչեր', ru: 'Скидки', en: 'Discounts' },
  'cmp.favorites_short': { hy: 'Նախընտրած', ru: 'Избранное', en: 'Favorites' },
  'cmp.orders': { hy: 'Պատվերներ', ru: 'Заказы', en: 'Orders' },
  'cmp.search_label': { hy: 'Որոնում', ru: 'Поиск', en: 'Search' },
  'cmp.menu': { hy: 'Մենյու', ru: 'Меню', en: 'Menu' },
  'cmp.find_part_fast': { hy: 'Գտեք ճիշտ պահեստամասը արագ', ru: 'Быстро найдите нужную запчасть', en: 'Find the right part fast' },

  // ─── Mobile tab bar / AI banner ───
  'cmp.close': { hy: 'Փակել', ru: 'Закрыть', en: 'Close' },
  'cmp.ai_assistant': { hy: 'AI օգնական', ru: 'AI-помощник', en: 'AI assistant' },
  'cmp.ai_ask': { hy: 'Հարցրեք ձեր հարցը', ru: 'Задайте свой вопрос', en: 'Ask your question' },

  // ─── Search command ───
  'cmp.img_no_exact': { hy: 'Ճշգրիտ համընկնում չգտնվեց — ճշտեք որոնումը', ru: 'Точное совпадение не найдено — уточните поиск', en: 'No exact match found — refine your search' },
  'cmp.img_no_recognize': { hy: 'Չհաջողվեց ճանաչել ապրանքը նկարից', ru: 'Не удалось распознать товар по фото', en: 'Could not recognize the product from the image' },
  'cmp.img_analyze_fail': { hy: 'Չհաջողվեց վերլուծել նկարը։ Փորձեք կրկին', ru: 'Не удалось проанализировать изображение. Попробуйте снова', en: 'Could not analyze the image. Try again' },
  'cmp.voice_unsupported': { hy: 'Ձեր բրաուզերը չի աջակցում ձայնագրությունը', ru: 'Ваш браузер не поддерживает запись звука', en: 'Your browser does not support audio recording' },
  'cmp.voice_permission': { hy: 'Թույլատրեք միկրոֆոնի օգտագործումը', ru: 'Разрешите доступ к микрофону', en: 'Allow microphone access' },
  'cmp.voice_start_fail': { hy: 'Չհաջողվեց սկսել ձայնագրությունը', ru: 'Не удалось начать запись', en: 'Could not start recording' },
  'cmp.voice_recognize_retry': { hy: 'Ձայնը չհաջողվեց ճանաչել, փորձեք կրկին', ru: 'Не удалось распознать голос, попробуйте снова', en: 'Could not recognize the audio, try again' },
  'cmp.voice_recognize_fail': { hy: 'Չհաջողվեց ճանաչել ձայնը', ru: 'Не удалось распознать голос', en: 'Could not recognize the audio' },
  'cmp.search_title': { hy: 'Որոնել', ru: 'Поиск', en: 'Search' },
  'cmp.search_products_placeholder': { hy: 'Որոնել ապրանքներ...', ru: 'Искать товары...', en: 'Search products...' },
  'cmp.image_search': { hy: 'Որոնում նկարով', ru: 'Поиск по фото', en: 'Image search' },
  'cmp.voice_search': { hy: 'Ձայնային որոնում', ru: 'Голосовой поиск', en: 'Voice search' },
  'cmp.analyzing_image': { hy: 'Վերլուծում ենք նկարը…', ru: 'Анализируем изображение…', en: 'Analyzing the image…' },
  'cmp.speak_now': { hy: 'Խոսեք հիմա…', ru: 'Говорите…', en: 'Speak now…' },
  'cmp.stop': { hy: 'Կանգնեցնել', ru: 'Остановить', en: 'Stop' },
  'cmp.recognizing_voice': { hy: 'Ճանաչում ենք ձայնը…', ru: 'Распознаём голос…', en: 'Recognizing voice…' },
  'cmp.recent_searches': { hy: 'Վերջին որոնումներ', ru: 'Недавние запросы', en: 'Recent searches' },
  'cmp.popular_products': { hy: 'Հայտնի ապրանքներ', ru: 'Популярные товары', en: 'Popular products' },
  'cmp.searching': { hy: 'Որոնում...', ru: 'Поиск...', en: 'Searching...' },
  'cmp.no_products_found': { hy: 'Ոչ մի ապրանք չի գտնվել', ru: 'Товары не найдены', en: 'No products found' },
  'cmp.products': { hy: 'Ապրանքներ', ru: 'Товары', en: 'Products' },

  // ─── Cookie consent ───
  'cmp.details': { hy: 'Մանրամասներ', ru: 'Подробнее', en: 'Details' },
  'cmp.accept': { hy: 'Ընդունել', ru: 'Принять', en: 'Accept' },
  'cmp.decline': { hy: 'Մերժել', ru: 'Отклонить', en: 'Decline' },

  // ─── Push notifications ───
  'cmp.push_blocked': { hy: 'Ծանուցումները արգելափակված են', ru: 'Уведомления заблокированы', en: 'Notifications are blocked' },
  'cmp.push_enabled': { hy: 'Ծանուցումները միացված են', ru: 'Уведомления включены', en: 'Notifications enabled' },
  'cmp.push_enable_fail': { hy: 'Չհաջողվեց միացնել ծանուցումները', ru: 'Не удалось включить уведомления', en: 'Could not enable notifications' },
  'cmp.push_disabled': { hy: 'Ծանուցումներն անջատված են', ru: 'Уведомления отключены', en: 'Notifications disabled' },
  'cmp.push_turn_off': { hy: 'Անջատել ծանուցումները', ru: 'Отключить уведомления', en: 'Turn off notifications' },
  'cmp.push_turn_on': { hy: 'Միացնել push ծանուցումները', ru: 'Включить push-уведомления', en: 'Enable push notifications' },

  // ─── Floating actions / AI chat ───
  'cmp.assistant_label': { hy: 'Օգնական', ru: 'Помощник', en: 'Assistant' },
  'cmp.how_can_help': { hy: 'Ինչպե՞ս կարող եմ օգնել', ru: 'Чем я могу помочь?', en: 'How can I help?' },
  'cmp.service_unavailable': { hy: 'Ծառայությունը անհասանելի է', ru: 'Сервис недоступен', en: 'The service is unavailable' },
  'cmp.write_message': { hy: 'Գրեք հաղորդագրություն...', ru: 'Напишите сообщение...', en: 'Write a message...' },

  // ─── Contact info ───
  'cmp.contact_email': { hy: 'Էլ. փոստ՝', ru: 'Эл. почта:', en: 'Email:' },
  'cmp.contact_phone': { hy: 'Հեռախոս՝', ru: 'Телефон:', en: 'Phone:' },
  'cmp.contact_address': { hy: 'Հասցե՝', ru: 'Адрес:', en: 'Address:' },
  'cmp.default_address': { hy: 'Երևան, Հայաստան', ru: 'Ереван, Армения', en: 'Yerevan, Armenia' },

  // ─── Cart reminder ───
  'cmp.reminder': { hy: 'Հիշեցում', ru: 'Напоминание', en: 'Reminder' },
  'cmp.items_in_cart': { hy: 'ապրանք(ներ) ձեր զամբյուղում', ru: 'товар(ы) в вашей корзине', en: 'item(s) in your cart' },
  'cmp.see_cart': { hy: 'Տեսնել զամբյուղը', ru: 'Посмотреть корзину', en: 'View cart' },

  // ─── Return/exchange status notifications ───
  'cmp.return_approved': { hy: 'Ձեր հայտը հաստատվել է', ru: 'Ваша заявка одобрена', en: 'Your request has been approved' },
  'cmp.return_completed': { hy: 'Ձեր հայտն ավարտված է', ru: 'Ваша заявка завершена', en: 'Your request is completed' },
  'cmp.return_rejected': { hy: 'Ձեր հայտը մերժվել է', ru: 'Ваша заявка отклонена', en: 'Your request was rejected' },

  // ─── Date picker ───
  'cmp.month_1': { hy: 'Հունվար', ru: 'Январь', en: 'January' },
  'cmp.month_2': { hy: 'Փետրվար', ru: 'Февраль', en: 'February' },
  'cmp.month_3': { hy: 'Մարտ', ru: 'Март', en: 'March' },
  'cmp.month_4': { hy: 'Ապրիլ', ru: 'Апрель', en: 'April' },
  'cmp.month_5': { hy: 'Մայիս', ru: 'Май', en: 'May' },
  'cmp.month_6': { hy: 'Հունիս', ru: 'Июнь', en: 'June' },
  'cmp.month_7': { hy: 'Հուլիս', ru: 'Июль', en: 'July' },
  'cmp.month_8': { hy: 'Օգոստոս', ru: 'Август', en: 'August' },
  'cmp.month_9': { hy: 'Սեպտեմբեր', ru: 'Сентябрь', en: 'September' },
  'cmp.month_10': { hy: 'Հոկտեմբեր', ru: 'Октябрь', en: 'October' },
  'cmp.month_11': { hy: 'Նոյեմբեր', ru: 'Ноябрь', en: 'November' },
  'cmp.month_12': { hy: 'Դեկտեմբեր', ru: 'Декабрь', en: 'December' },
  'cmp.weekday_1': { hy: 'Երկ', ru: 'Пн', en: 'Mon' },
  'cmp.weekday_2': { hy: 'Երք', ru: 'Вт', en: 'Tue' },
  'cmp.weekday_3': { hy: 'Չրք', ru: 'Ср', en: 'Wed' },
  'cmp.weekday_4': { hy: 'Հնգ', ru: 'Чт', en: 'Thu' },
  'cmp.weekday_5': { hy: 'Ուր', ru: 'Пт', en: 'Fri' },
  'cmp.weekday_6': { hy: 'Շբթ', ru: 'Сб', en: 'Sat' },
  'cmp.weekday_7': { hy: 'Կիր', ru: 'Вс', en: 'Sun' },
  'cmp.pick_date': { hy: 'Ընտրել ամսաթիվ', ru: 'Выбрать дату', en: 'Select date' },
  'cmp.clear': { hy: 'Մաքրել', ru: 'Очистить', en: 'Clear' },
  'cmp.today': { hy: 'Այսօր', ru: 'Сегодня', en: 'Today' },

  // ─── Wizard ───
  'cmp.create': { hy: 'Ստեղծել', ru: 'Создать', en: 'Create' },
  'cmp.back': { hy: 'Ետ', ru: 'Назад', en: 'Back' },
  'cmp.cancel': { hy: 'Չեղարկել', ru: 'Отмена', en: 'Cancel' },
  'cmp.saving': { hy: 'Պահպանվում է...', ru: 'Сохранение...', en: 'Saving...' },
  'cmp.next': { hy: 'Առաջ', ru: 'Далее', en: 'Next' },

  // ─── Error / not-found pages ───
  'cmp.error_title': { hy: 'Ինչ-որ բան սխալ է', ru: 'Что-то пошло не так', en: 'Something went wrong' },
  'cmp.error_desc': { hy: 'Կրկին փորձելու համար սեղմեք կոճակը', ru: 'Нажмите кнопку, чтобы попробовать снова', en: 'Press the button to try again' },
  'cmp.try_again': { hy: 'Կրկին փորձել', ru: 'Попробовать снова', en: 'Try again' },
  'cmp.code': { hy: 'Կոդ', ru: 'Код', en: 'Code' },
  'cmp.shop_error_title': { hy: 'Ինչ-որ սխալ տեղի ունեցավ', ru: 'Произошла ошибка', en: 'An error occurred' },
  'cmp.shop_error_desc': { hy: 'Խնդրում ենք փորձել կրկին։ Եթե խնդիրը պահպանվում է, կապվեք մեզ հետ։', ru: 'Пожалуйста, попробуйте снова. Если проблема не исчезнет, свяжитесь с нами.', en: 'Please try again. If the problem persists, contact us.' },
  'cmp.shop_try_again': { hy: 'Փորձել կրկին', ru: 'Попробовать снова', en: 'Try again' },
};
