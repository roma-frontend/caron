import type { DictModule } from '../types';

/** Admin: settings & delivery pages. Keys prefixed `as.`. */
export const adminSettings: DictModule = {
  // ─── Common ───
  'as.save': { hy: 'Պահպանել', ru: 'Сохранить', en: 'Save' },
  'as.saved': { hy: 'Պահպանվեց', ru: 'Сохранено', en: 'Saved' },
  'as.error': { hy: 'Սխալ', ru: 'Ошибка', en: 'Error' },
  'as.delivery': { hy: 'Առաքում', ru: 'Доставка', en: 'Delivery' },
  'as.mb': { hy: 'ՄԲ', ru: 'МБ', en: 'MB' },

  // ─── Settings: toasts ───
  'as.badgesSaved': { hy: 'Բեյջերը պահպանվեցին', ru: 'Бейджи сохранены', en: 'Badges saved' },
  'as.textRequired': { hy: 'Տեքստը պարտադիր է', ru: 'Текст обязателен', en: 'Text is required' },
  'as.announcementSaved': { hy: 'Հայտարարությունը պահպանվեց', ru: 'Объявление сохранено', en: 'Announcement saved' },
  'as.settingsSaved': { hy: 'Կարգավորումները պահպանվել են', ru: 'Настройки сохранены', en: 'Settings saved' },
  'as.sessionExpired': { hy: 'Սեսիան ավարտվել է, մուտք գործեք կրկին', ru: 'Сессия истекла, войдите снова', en: 'Session expired, please log in again' },
  'as.errorOccurred': { hy: 'Սխալ տեղի ունեցավ', ru: 'Произошла ошибка', en: 'An error occurred' },

  // ─── Settings: preview banner fallbacks ───
  'as.promo': { hy: 'Ակցիա', ru: 'Акция', en: 'Promo' },
  'as.promoDesc': { hy: 'Շահավետ առաջարկ ընտրված ապրանքների վրա', ru: 'Выгодное предложение на выбранные товары', en: 'Great offer on selected products' },

  // ─── Settings: header ───
  'as.settings': { hy: 'Կարգավորումներ', ru: 'Настройки', en: 'Settings' },
  'as.settingsSubtitle': { hy: 'Խանութի կարգավորումներ — թարմացվում է իրական ժամանակում', ru: 'Настройки магазина — обновляются в реальном времени', en: 'Store settings — updated in real time' },

  // ─── Settings: tab labels ───
  'as.tabStore': { hy: 'Խանութ', ru: 'Магазин', en: 'Store' },
  'as.tabSales': { hy: 'Վաճառք', ru: 'Продажа', en: 'Sales' },
  'as.marketing': { hy: 'Մարքեթինգ', ru: 'Маркетинг', en: 'Marketing' },
  'as.notifications': { hy: 'Ծանուցումներ', ru: 'Уведомления', en: 'Notifications' },
  'as.advanced': { hy: 'Լրացուցիչ', ru: 'Дополнительно', en: 'Advanced' },

  // ─── Settings: store info ───
  'as.storeData': { hy: 'Խանութի տվյալներ', ru: 'Данные магазина', en: 'Store info' },
  'as.storeNameLabel': { hy: 'Անվանում', ru: 'Название', en: 'Name' },
  'as.phone': { hy: 'Հեռախոս', ru: 'Телефон', en: 'Phone' },
  'as.email': { hy: 'Էլ. փոստ', ru: 'Эл. почта', en: 'Email' },
  'as.workingHours': { hy: 'Աշխատանքային ժամեր', ru: 'Часы работы', en: 'Working hours' },
  'as.address': { hy: 'Հասցե', ru: 'Адрес', en: 'Address' },
  'as.mapUrl': { hy: 'Քարտեզի URL (Google Maps embed)', ru: 'URL карты (Google Maps embed)', en: 'Map URL (Google Maps embed)' },

  // ─── Settings: social ───
  'as.social': { hy: 'Սոցիալական ցանցեր', ru: 'Социальные сети', en: 'Social networks' },

  // ─── Settings: announcement ───
  'as.announcement': { hy: 'Հայտարարություն', ru: 'Объявление', en: 'Announcement' },
  'as.announcementJsonHint': { hy: 'JSON-ը կգեներացվի ստորև նշված դաշտերից և կպահպանվի ՀԱՅՏԱՐԱՐՈՒԹՅՈԻՆ դաշտում', ru: 'JSON будет сгенерирован из полей ниже и сохранён в поле ОБЪЯВЛЕНИЕ', en: 'The JSON is generated from the fields below and saved in the ANNOUNCEMENT field' },
  'as.topBarText': { hy: 'Վերին գոտու տեքստ', ru: 'Текст верхней полосы', en: 'Top bar text' },
  'as.topBarTextRu': { hy: 'Տեքստ (ռուսերեն)', ru: 'Текст (RU)', en: 'Text (RU)' },
  'as.topBarTextEn': { hy: 'Տեքստ (անգլերեն)', ru: 'Текст (EN)', en: 'Text (EN)' },
  'as.freeShippingPh': { hy: 'Անվճար առաքում 30.000֏-ից...', ru: 'Бесплатная доставка от 30.000֏...', en: 'Free shipping from 30,000֏...' },
  'as.presetsHint': { hy: 'Պատրաստի տարբերակներ (սեղմել → խմբագրել)', ru: 'Готовые варианты (нажмите → редактировать)', en: 'Presets (click → edit)' },

  // ─── Settings: announcement presets ───
  'as.preset1': { hy: '🚚 Անվճար առաքում 30.000 ֏-ից սկսած', ru: '🚚 Бесплатная доставка от 30.000 ֏', en: '🚚 Free shipping from 30,000 ֏' },
  'as.preset2': { hy: '🔥 Մինչև -40% զեղչ ամառային ակցիայի շրջանակներում', ru: '🔥 Скидки до -40% в рамках летней акции', en: '🔥 Up to -40% off during the summer sale' },
  'as.preset3': { hy: '⚡ Ակցիա․ ամեն 3-րդ ապրանքը՝ -15%', ru: '⚡ Акция: каждый 3-й товар -15%', en: '⚡ Sale: every 3rd item -15%' },
  'as.preset4': { hy: '🎁 Գնիր 2 ապրանք և ստացիր 1-ը նվեր', ru: '🎁 Купи 2 товара и получи 1 в подарок', en: '🎁 Buy 2 items and get 1 free' },
  'as.preset5': { hy: '💥 Սահմանափակ առաջարկ․ զեղչեր մինչև -50%', ru: '💥 Ограниченное предложение: скидки до -50%', en: '💥 Limited offer: discounts up to -50%' },
  'as.preset6': { hy: '⭐ Միայն օրիգինալ որակի պահեստամասեր', ru: '⭐ Только оригинальные качественные запчасти', en: '⭐ Only original quality spare parts' },
  'as.preset7': { hy: '❄️ Ձմեռային անվադողեր՝ մեծ զեղչերով', ru: '❄️ Зимние шины с большими скидками', en: '❄️ Winter tires at big discounts' },
  'as.preset8': { hy: '🔧 Գարնանային տեխզննության հատուկ առաջարկ', ru: '🔧 Специальное предложение на весенний техосмотр', en: '🔧 Special offer on spring inspection' },

  // ─── Settings: announcement style/icon ───
  'as.style': { hy: 'Ոճ', ru: 'Стиль', en: 'Style' },
  'as.optInfo': { hy: 'Տեղեկատվություն', ru: 'Информация', en: 'Information' },
  'as.optSale': { hy: 'Վաճառք', ru: 'Распродажа', en: 'Sale' },
  'as.optPromo': { hy: 'Պրոմո', ru: 'Промо', en: 'Promo' },
  'as.optDark': { hy: 'Մուգ', ru: 'Тёмный', en: 'Dark' },
  'as.icon': { hy: 'Պատկերակ', ru: 'Иконка', en: 'Icon' },
  'as.linkUrl': { hy: 'Հղում (URL)', ru: 'Ссылка (URL)', en: 'Link (URL)' },
  'as.buttonText': { hy: 'Կոճակի տեքստ', ru: 'Текст кнопки', en: 'Button text' },
  'as.buttonTextRu': { hy: 'Կոճակի տեքստ (ռուսերեն)', ru: 'Текст кнопки (RU)', en: 'Button text (RU)' },
  'as.buttonTextEn': { hy: 'Կոճակի տեքստ (անգլերեն)', ru: 'Текст кнопки (EN)', en: 'Button text (EN)' },
  'as.buy': { hy: 'Գնել', ru: 'Купить', en: 'Buy' },
  'as.allowDismiss': { hy: 'Հնարավորություն տալ փակելու', ru: 'Разрешить закрытие', en: 'Allow dismissing' },

  // ─── Settings: nav badges ───
  'as.navBadges': { hy: 'Նավիգացիոն բեյջեր', ru: 'Навигационные бейджи', en: 'Navigation badges' },
  'as.navBadgesHint': { hy: 'Բեյջի տեքստեր և ստիլներ', ru: 'Тексты и стили бейджей', en: 'Badge texts and styles' },
  'as.text': { hy: 'Տեքստ', ru: 'Текст', en: 'Text' },

  // ─── Settings: delivery tab ───
  'as.yerevanAmd': { hy: 'Երևան (֏)', ru: 'Ереван (֏)', en: 'Yerevan (֏)' },
  'as.regionsAmd': { hy: 'Մարզեր (֏)', ru: 'Регионы (֏)', en: 'Regions (֏)' },
  'as.freeShippingAmd': { hy: 'Անվճար առաքում (֏)', ru: 'Бесплатная доставка (֏)', en: 'Free shipping (֏)' },
  'as.deliveryTime': { hy: 'Առաքման ժամկետ', ru: 'Срок доставки', en: 'Delivery time' },
  'as.deliveryTimeHint': { hy: 'Ցուցադրվում է ապրանքի քարտի վրա (օր.՝ «Առաքում 1-2 օր»)', ru: 'Отображается на карточке товара (напр.: «Доставка 1-2 дня»)', en: 'Shown on the product card (e.g.: "Delivery 1-2 days")' },
  'as.estimateYerevan': { hy: 'Ժամկետ՝ Երևան', ru: 'Срок: Ереван', en: 'Time: Yerevan' },
  'as.estimateRegions': { hy: 'Ժամկետ՝ Մարզեր', ru: 'Срок: Регионы', en: 'Time: Regions' },
  'as.deliveryDays': { hy: 'Առաքման օրեր (թվով)', ru: 'Дни доставки (числом)', en: 'Delivery days (number)' },
  'as.deliveryDaysHint': { hy: 'Եթե նշված է, քարտի վրա ցուցադրվում է իրական ամսաթիվ (օր.՝ «Առաքում մինչև 21 հունիսի»)։ 0 = ցույց տալ տեքստային ժամկետը', ru: 'Если указано, на карточке отображается реальная дата (напр.: «Доставка до 21 июня»). 0 = показывать текстовый срок', en: 'If set, the card shows a real date (e.g.: "Delivery by June 21"). 0 = show the text estimate' },
  'as.daysYerevan': { hy: 'Օրեր՝ Երևան', ru: 'Дни: Ереван', en: 'Days: Yerevan' },
  'as.daysRegions': { hy: 'Օրեր՝ Մարզեր', ru: 'Дни: Регионы', en: 'Days: Regions' },
  'as.estimateYerevanPh': { hy: '1-2 օր', ru: '1-2 дня', en: '1-2 days' },
  'as.estimateRegionsPh': { hy: '2-4 օր', ru: '2-4 дня', en: '2-4 days' },

  // ─── Settings: loyalty ───
  'as.loyaltyProgram': { hy: 'Բոնուսային ծրագիր', ru: 'Бонусная программа', en: 'Loyalty program' },
  'as.enableLoyalty': { hy: 'Միացնել բոնուսային բալերը', ru: 'Включить бонусные баллы', en: 'Enable loyalty points' },
  'as.cashbackOrder': { hy: 'Cashback պատվերից (%)', ru: 'Кэшбэк с заказа (%)', en: 'Cashback per order (%)' },
  'as.pointsReview': { hy: 'Բալ կարծիքի համար', ru: 'Баллы за отзыв', en: 'Points per review' },
  'as.pointsReviewPhoto': { hy: 'Բոնուս լուսանկարով կարծիքի', ru: 'Бонус за отзыв с фото', en: 'Bonus for review with photo' },
  'as.referralPoints': { hy: 'Բոնուս հրավերի համար (բալ)', ru: 'Бонус за приглашение (баллы)', en: 'Bonus per referral (points)' },
  'as.cashbackByQty': { hy: 'Cashback ըստ քանակի (շեմեր)', ru: 'Кэшбэк по количеству (пороги)', en: 'Cashback by quantity (tiers)' },
  'as.cashbackByQtyHint': { hy: 'Գործում է ամենաբարձր շեմի տոկոսը, որին հասել է քանակը (ստորին շեմից ցածր՝ բազային %)։ Օր.՝ բազա 0%, ≥10 հատ → 3%, ≥50 հատ → 5% ⇒ 1–9 հատ՝ 0%, 10–49 հատ՝ 3%, 50+ հատ՝ 5%։ Բալերը = տոկոս × պատվերի գումար։', ru: 'Применяется процент наивысшего достигнутого порога (ниже минимального порога — базовый %). Напр.: база 0%, ≥10 шт → 3%, ≥50 шт → 5% ⇒ 1–9 шт: 0%, 10–49 шт: 3%, 50+ шт: 5%. Баллы = процент × сумма заказа.', en: 'The percentage of the highest reached tier applies (below the lowest tier — base %). E.g.: base 0%, ≥10 pcs → 3%, ≥50 pcs → 5% ⇒ 1–9 pcs: 0%, 10–49 pcs: 3%, 50+ pcs: 5%. Points = percent × order amount.' },
  'as.pcs': { hy: 'հատ', ru: 'шт', en: 'pcs' },
  'as.pcsArrow': { hy: 'հատ →', ru: 'шт →', en: 'pcs →' },
  'as.addTier': { hy: '+ Ավելացնել շեմ', ru: '+ Добавить порог', en: '+ Add tier' },

  // ─── Settings: cart tab ───
  'as.cartPayment': { hy: 'Զամբյուղ և վճարում', ru: 'Корзина и оплата', en: 'Cart & payment' },
  'as.minOrderAmd': { hy: 'Նվազագույն պատվեր (֏)', ru: 'Минимальный заказ (֏)', en: 'Minimum order (֏)' },
  'as.productsPerPage': { hy: 'Ապրանքներ էջում', ru: 'Товаров на странице', en: 'Products per page' },
  'as.defaultWarranty': { hy: 'Երաշխիք (լռությամբ)', ru: 'Гарантия (по умолчанию)', en: 'Warranty (default)' },
  'as.quickBuy': { hy: 'Արագ գնում', ru: 'Быстрая покупка', en: 'Quick buy' },
  'as.breadcrumbs': { hy: 'Հացի փշրանքներ', ru: 'Хлебные крошки', en: 'Breadcrumbs' },
  'as.scrollTop': { hy: 'Կոճակ Վերև', ru: 'Кнопка «Наверх»', en: 'Scroll-to-top button' },
  'as.shareButton': { hy: 'Կոճակ Կիսվել', ru: 'Кнопка «Поделиться»', en: 'Share button' },
  'as.backInStock': { hy: 'Տեղեկացնել առկայության մասին', ru: 'Уведомлять о поступлении', en: 'Notify when back in stock' },
  'as.priceAlert': { hy: 'Զեղչի մասին ծանուցում', ru: 'Уведомление о скидке', en: 'Discount notification' },
  'as.pickup': { hy: 'Ինքնահանում խանութից', ru: 'Самовывоз из магазина', en: 'Store pickup' },
  'as.orderTimeline': { hy: 'Պատվերի ժամանակացույց', ru: 'Хронология заказа', en: 'Order timeline' },
  'as.paymentMethods': { hy: 'Վճարման եղանակներ', ru: 'Способы оплаты', en: 'Payment methods' },
  'as.cash': { hy: 'Կանխիկ', ru: 'Наличными', en: 'Cash' },
  'as.card': { hy: 'Քարտով', ru: 'Картой', en: 'By card' },
  'as.bankTransfer': { hy: 'Բանկային փոխանցում', ru: 'Банковский перевод', en: 'Bank transfer' },

  // ─── Settings: marketing tab ───
  'as.cookieConsent': { hy: 'Cookie Համաձայնություն', ru: 'Согласие на Cookie', en: 'Cookie consent' },
  'as.newsletter': { hy: 'Նորություններ (footer)', ru: 'Новости (footer)', en: 'Newsletter (footer)' },
  'as.registration': { hy: 'Գրանցում', ru: 'Регистрация', en: 'Registration' },
  'as.cookieConsentText': { hy: 'Cookie Consent տեքստ', ru: 'Текст согласия на Cookie', en: 'Cookie consent text' },

  // ─── Settings: notifications tab ───
  'as.notificationsTelegram': { hy: 'Ծանուցումներ (Telegram Bot)', ru: 'Уведомления (Telegram Bot)', en: 'Notifications (Telegram Bot)' },
  'as.sending': { hy: 'Ուղարկվում է...', ru: 'Отправка...', en: 'Sending...' },
  'as.sendTest': { hy: 'Ուղարկել թեստ', ru: 'Отправить тест', en: 'Send test' },
  'as.testSent': { hy: 'Թեստային ծանուցումն ուղարկվեց', ru: 'Тестовое уведомление отправлено', en: 'Test notification sent' },
  'as.sendFailed': { hy: 'Չհաջողվեց ուղարկել', ru: 'Не удалось отправить', en: 'Failed to send' },

  // ─── Settings: UI / control center ───
  'as.controlCenter': { hy: 'Կառավարման կենտրոն', ru: 'Центр управления', en: 'Control center' },
  'as.maintenance': { hy: 'Տեխնիկական աշխատանքներ', ru: 'Технические работы', en: 'Maintenance' },
  'as.maintenanceHint': { hy: 'Փակում է խանութը այցելուների համար', ru: 'Закрывает магазин для посетителей', en: 'Closes the store for visitors' },
  'as.messagePh': { hy: 'Հաղորդագրություն...', ru: 'Сообщение...', en: 'Message...' },
  'as.announcementZone': { hy: 'Հայտարարության գոտի', ru: 'Полоса объявления', en: 'Announcement bar' },
  'as.stories': { hy: 'Սթորիզ (գլխավոր)', ru: 'Истории (главная)', en: 'Stories (home)' },
  'as.bannersCarousel': { hy: 'Բաններների կարուսել (գլխավոր)', ru: 'Карусель баннеров (главная)', en: 'Banner carousel (home)' },
  'as.categoriesSection': { hy: 'Կատեգորիաների բաժին (գլխավոր)', ru: 'Раздел категорий (главная)', en: 'Categories section (home)' },
  'as.forYou': { hy: '«Ձեզ համար» անհատական (գլխավոր)', ru: '«Для вас» персональное (главная)', en: '"For you" personalized (home)' },
  'as.newArrivals': { hy: 'Նորույթներ (գլխավոր)', ru: 'Новинки (главная)', en: 'New arrivals (home)' },
  'as.featured': { hy: 'Առաջարկվող ապրանքներ (գլխավոր)', ru: 'Рекомендуемые товары (главная)', en: 'Featured products (home)' },
  'as.bestsellers': { hy: 'Բեսթսելլերներ (գլխավոր)', ru: 'Бестселлеры (главная)', en: 'Bestsellers (home)' },
  'as.discounts': { hy: 'Զեղչեր (գլխավոր)', ru: 'Скидки (главная)', en: 'Discounts (home)' },
  'as.categoryShelves': { hy: 'Կատեգորիաների շարքեր (գլխավոր)', ru: 'Ряды категорий (главная)', en: 'Category shelves (home)' },
  'as.brandsRow': { hy: 'Բրենդների շարք (գլխավոր)', ru: 'Ряд брендов (главная)', en: 'Brands row (home)' },
  'as.featuresSection': { hy: 'Առավելությունների բաժին (գլխավոր)', ru: 'Раздел преимуществ (главная)', en: 'Features section (home)' },
  'as.carSelector': { hy: 'Ավտոյի ընտրիչ', ru: 'Подбор по авто', en: 'Car selector' },
  'as.priceFilter': { hy: 'Գնի ֆիլտր', ru: 'Фильтр по цене', en: 'Price filter' },
  'as.productReviews': { hy: 'Ապրանքի գնահատականներ', ru: 'Оценки товаров', en: 'Product reviews' },

  // ─── Settings: banner designer ───
  'as.bannerHome': { hy: 'Բաններ (գլխավոր)', ru: 'Баннер (главная)', en: 'Banner (home)' },
  'as.preview': { hy: 'Նախադիտում', ru: 'Предпросмотр', en: 'Preview' },
  'as.template': { hy: 'Ձևանմուշ', ru: 'Шаблон', en: 'Template' },
  'as.autoplay': { hy: 'Ավտո-փոխում (վրկ, 0=անջատ)', ru: 'Автопрокрутка (сек, 0=выкл)', en: 'Autoplay (sec, 0=off)' },
  'as.accentColor': { hy: 'Ակցենտ գույն', ru: 'Акцентный цвет', en: 'Accent color' },
  'as.textOnImage': { hy: 'Տեքստ նկարի վրա', ru: 'Текст поверх изображения', en: 'Text over image' },
  'as.kenBurns': { hy: 'Դանդաղ խոշորացում (Ken Burns)', ru: 'Медленное увеличение (Ken Burns)', en: 'Slow zoom (Ken Burns)' },
  'as.rounded': { hy: 'Կլորացված անկյուններ', ru: 'Скруглённые углы', en: 'Rounded corners' },
  'as.bannerEffectsHint': { hy: 'Էֆեկտները (Cinematic, Spotlight, Ken Burns, օverlay) կիրառվում են գլխավորի բոլոր բаннерների վրա։ Համամասնությունը (ձևը) որոշվում է յուրաքանչյուր ակցիայի մեջ՝ ստեղծելիս։', ru: 'Эффекты (Cinematic, Spotlight, Ken Burns, overlay) применяются ко всем баннерам на главной. Пропорции (форма) задаются при создании каждой акции.', en: 'Effects (Cinematic, Spotlight, Ken Burns, overlay) apply to all banners on the home page. The aspect ratio (shape) is set when creating each promotion.' },

  // ─── Settings: branding ───
  'as.brandColor': { hy: 'Բրենդ / Գույն', ru: 'Бренд / Цвет', en: 'Brand / Color' },
  'as.accentColorHint': { hy: 'Ակցենտ գույնը՝ փոխվում է ողջ կայքում իրական ժամանակում', ru: 'Акцентный цвет — меняется по всему сайту в реальном времени', en: 'Accent color — changes across the whole site in real time' },
  'as.reset': { hy: 'Վերականգնել', ru: 'Сбросить', en: 'Reset' },

  // ─── Settings: advanced tab ───
  'as.advancedSettings': { hy: 'Լրացուցիչ կարգավորումներ', ru: 'Дополнительные настройки', en: 'Advanced settings' },
  'as.logoUrl': { hy: 'Logo URL (թափուր = SVG լոգո)', ru: 'Logo URL (пусто = SVG логотип)', en: 'Logo URL (empty = SVG logo)' },
  'as.vinDecoder': { hy: 'VIN-դեկոդեր', ru: 'VIN-декодер', en: 'VIN decoder' },
  'as.oemSearch': { hy: 'OEM որոնում', ru: 'Поиск по OEM', en: 'OEM search' },

  // ─── Settings: bottom save button ───
  'as.saving': { hy: 'Պահպանվում է...', ru: 'Сохранение...', en: 'Saving...' },
  'as.saveSettings': { hy: 'Պահպանել կարգավորումները', ru: 'Сохранить настройки', en: 'Save settings' },

  // ─── Settings: filter migration card ───
  'as.migrateConfirm': { hy: 'Սա կգծանցի բոլոր ապրանքների ֆիլտր հատկանիշները նոր համակարգին:\n\nՑանց ընդհանուր սխալ առաջացի՞ք:', ru: 'Это перенесёт атрибуты фильтров всех товаров в новую систему:\n\nПродолжить?', en: 'This will migrate the filter attributes of all products to the new system:\n\nContinue?' },
  'as.filterMigration': { hy: 'Ֆիլտրի համակարգ միգրացիա', ru: 'Миграция системы фильтров', en: 'Filter system migration' },
  'as.filterMigrationDesc': { hy: 'Արդիական ֆիլտրային համակարգը կօգտագործի ֆիլտրի ID-ը շարականմամբ, այլ ոչ թե slug-ը: Սա թույլ կտա անվտանգ փոփոխել ֆիլտրի անունը, առանց համակարգի խախտման:', ru: 'Современная система фильтров использует ID фильтра вместо slug. Это позволит безопасно менять название фильтра, не нарушая работу системы.', en: 'The modern filter system uses the filter ID instead of the slug. This makes it safe to change a filter name without breaking the system.' },
  'as.filterMigrationNote': { hy: 'Սա կվերանվանի բոլոր product.attributes բանալիները «slug» -ից «filter_id» -ի:', ru: 'Это переименует все ключи product.attributes с «slug» на «filter_id».', en: 'This will rename all product.attributes keys from "slug" to "filter_id".' },
  'as.migrating': { hy: 'Գծանցվում է...', ru: 'Миграция...', en: 'Migrating...' },
  'as.runMigration': { hy: 'Գործարկել միգրացիա', ru: 'Запустить миграцию', en: 'Run migration' },
  'as.migrateSuccess': { hy: 'Գծանցում հաջողված։', ru: 'Миграция выполнена.', en: 'Migration succeeded.' },
  'as.productsUpdated': { hy: 'ապրանք թարմացվել է', ru: 'товаров обновлено', en: 'products updated' },
  'as.migrateFailed': { hy: 'Գծանցում ձախողվեց։', ru: 'Миграция не удалась.', en: 'Migration failed.' },

  // ─── Settings: normalize brands card ───
  'as.normalizeBrands': { hy: 'Նորմալացնել բրենդները', ru: 'Нормализовать бренды', en: 'Normalize brands' },
  'as.normalizeBrandsDesc': { hy: 'Համաժամացնի բոլոր ապրանքների brand արժեքը filterDef-ի options-ի հետ (case-insensitive)։ Օրինակ՝ HITO → Hito:', ru: 'Синхронизирует значение brand всех товаров с options из filterDef (без учёта регистра). Например: HITO → Hito.', en: 'Syncs the brand value of all products with the filterDef options (case-insensitive). E.g.: HITO → Hito.' },
  'as.working': { hy: 'Աշխատում է...', ru: 'Выполняется...', en: 'Working...' },
  'as.run': { hy: 'Գործարկել', ru: 'Запустить', en: 'Run' },

  // ─── Settings: image cleanup card ───
  'as.cleanupImages': { hy: 'Մաքրել չօգտագործվող նկարները', ru: 'Очистить неиспользуемые изображения', en: 'Clean up unused images' },
  'as.translateAll': { hy: 'Թարգմանել ամբողջ բովանդակությունը', ru: 'Перевести весь контент', en: 'Translate all content' },
  'as.translateAllDesc': { hy: 'Ավտոմատ կերպով լրացնում է ապրանքների և կատեգորիաների ռուսերեն/անգլերեն թարգմանությունները (անուն և նկարագրություն)։ Աշխատում է ֆոնում։', ru: 'Автоматически заполняет русские/английские переводы товаров и категорий (название и описание). Выполняется в фоне.', en: 'Automatically fills Russian/English translations for products and categories (name and description). Runs in the background.' },
  'as.translateAllRun': { hy: 'Թարգմանել ամբողջը', ru: 'Перевести всё', en: 'Translate all' },
  'as.translateMissing': { hy: 'Թարգմանել պակասողները', ru: 'Перевести недостающие', en: 'Translate missing' },
  'as.translateForce': { hy: 'Թարգմանել նորից (վերագրել)', ru: 'Перевести заново (перезаписать)', en: 'Re-translate (overwrite)' },
  'as.translateForceConfirm': { hy: 'Վերագրե՞լ բոլոր առկա ռուսերեն/անգլերեն թարգմանությունները։', ru: 'Перезаписать все существующие русские/английские переводы?', en: 'Overwrite all existing Russian/English translations?' },
  'as.translateAllRunning': { hy: 'Մշակվում է...', ru: 'Запуск...', en: 'Starting...' },
  'as.translateAllScheduled': { hy: 'Հերթագրված է թարգմանության', ru: 'Запланировано на перевод', en: 'Scheduled for translation' },
  'as.minutes': { hy: 'րոպե', ru: 'мин', en: 'min' },
  'as.cleanupImagesDesc': { hy: 'Կհեռացնի Cloudflare R2-ից այն նկարները, որոնք այլևս չեն օգտագործվում ոչ մի ապրանքում, կատեգորիայում, ակցիայում կամ էջում։ Պաշտպանված են hero/poster ֆայլերը և վերջին 7 օրում վերբեռնվածները։', ru: 'Удалит из Cloudflare R2 изображения, которые больше не используются ни в одном товаре, категории, акции или странице. Защищены файлы hero/poster и загруженные за последние 7 дней.', en: 'Removes from Cloudflare R2 the images that are no longer used in any product, category, promotion or page. Hero/poster files and those uploaded in the last 7 days are protected.' },
  'as.noUnusedImages': { hy: 'Չօգտագործվող նկարներ չկան', ru: 'Неиспользуемых изображений нет', en: 'No unused images' },
  'as.found': { hy: 'Գտնվեց', ru: 'Найдено', en: 'Found' },
  'as.unusedImage': { hy: 'չօգտագործվող նկար', ru: 'неиспользуемых изображений', en: 'unused images' },
  'as.removeQ': { hy: 'Հեռացնե՞լ։', ru: 'Удалить?', en: 'Remove?' },
  'as.removed': { hy: 'Հեռացվեց', ru: 'Удалено', en: 'Removed' },
  'as.image': { hy: 'նկար', ru: 'изображений', en: 'images' },
  'as.cleaning': { hy: 'Մաքրվում է...', ru: 'Очистка...', en: 'Cleaning...' },
  'as.removeImages': { hy: 'Հեռացնել նկարները', ru: 'Удалить изображения', en: 'Remove images' },

  // ─── Settings: image reoptimize card ───
  'as.reoptimizeImages': { hy: 'Վերաօպտիմիզացնել հին նկարները', ru: 'Переоптимизировать старые изображения', en: 'Re-optimize old images' },
  'as.reoptimizeImagesDesc': { hy: 'Հին (ոչ-WebP) ապրանքների նկարները կվերածվեն WebP-ի և կթարմացվեն (նոր բեռնվածներն արդեն օպտիմիզացված են)։ Կարող է տևել մի քանի րոպե։', ru: 'Старые (не WebP) изображения товаров будут преобразованы в WebP и обновлены (новые загрузки уже оптимизированы). Может занять несколько минут.', en: 'Old (non-WebP) product images will be converted to WebP and updated (new uploads are already optimized). May take a few minutes.' },
  'as.checked': { hy: 'ստուգված', ru: 'проверено', en: 'checked' },
  'as.optimized': { hy: 'օպտիմիզացված', ru: 'оптимизировано', en: 'optimized' },
  'as.done': { hy: 'Ավարտված։', ru: 'Готово.', en: 'Done.' },
  'as.imageOptimized': { hy: 'նկար օպտիմիզացվեց', ru: 'изображений оптимизировано', en: 'images optimized' },
  'as.reoptimize': { hy: 'Վերաօպտիմիզացնել', ru: 'Переоптимизировать', en: 'Re-optimize' },

  // ─── Delivery page ───
  'as.deliveryScheduleTitle': { hy: 'Առաքման ժամանակացույց', ru: 'График доставки', en: 'Delivery schedule' },
  'as.deliverySubtitle': { hy: 'խմբագրեք առաքման ժամկետները՝ ըստ վայրի', ru: 'редактируйте сроки доставки по локациям', en: 'edit delivery times by location' },
  'as.yerevanCommunities': { hy: 'Երևանի համայնքներ', ru: 'Общины Еревана', en: 'Yerevan communities' },
  'as.regions': { hy: 'Մարզեր', ru: 'Регионы', en: 'Regions' },
  'as.del': { hy: 'Ջնջել', ru: 'Удалить', en: 'Delete' },
  'as.deleted': { hy: 'Ջնջվեց', ru: 'Удалено', en: 'Deleted' },
  'as.addZone': { hy: 'Ավելացնել վայր', ru: 'Добавить локацию', en: 'Add location' },
  'as.seed': { hy: 'Ստեղծել սկզբնական ցանկը', ru: 'Создать начальный список', en: 'Create initial list' },
  'as.zoneName': { hy: 'Անուն', ru: 'Название', en: 'Name' },
  'as.active': { hy: 'Ակտիվ', ru: 'Активно', en: 'Active' },
  'as.noZones': { hy: 'Դեռ վայրեր չկան', ru: 'Локаций пока нет', en: 'No locations yet' },
  'as.schedulePh': { hy: 'Օրինակ՝ Ամեն օր, երկուշաբթի և հինգշաբթի', ru: 'Например: каждый день, понедельник и четверг', en: 'E.g.: Every day, Monday and Thursday' },
  'as.confirmDel': { hy: 'Ջնջե՞լ', ru: 'Удалить?', en: 'Delete?' },
};
