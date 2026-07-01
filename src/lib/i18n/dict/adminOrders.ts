import type { DictModule } from '../types';

/** Admin: orders & returns pages. Keys prefixed `ao.`. */
export const adminOrders: DictModule = {
  // Bulk selection / actions
  'ao.refunded': { hy: 'Վերադարձված', ru: 'Возвращено', en: 'Refunded' },
  'ao.bulk.select': { hy: 'Ընտրել', ru: 'Выбрать', en: 'Select' },
  'ao.bulk.exit': { hy: 'Չեղարկել ընտրությունը', ru: 'Отменить выбор', en: 'Cancel selection' },
  'ao.bulk.selected': { hy: 'Ընտրված է', ru: 'Выбрано', en: 'Selected' },
  'ao.bulk.all': { hy: 'Ընտրել բոլորը', ru: 'Выбрать все', en: 'Select all' },
  'ao.bulk.clear': { hy: 'Մաքրել', ru: 'Очистить', en: 'Clear' },
  'ao.bulk.status': { hy: 'Կարգավիճակ →', ru: 'Статус →', en: 'Status →' },
  'ao.bulk.payment': { hy: 'Վճարում →', ru: 'Оплата →', en: 'Payment →' },
  'ao.bulk.apply': { hy: 'Կիրառել', ru: 'Применить', en: 'Apply' },
  'ao.bulk.applying': { hy: 'Կիրառվում է...', ru: 'Применение...', en: 'Applying...' },
  'ao.bulk.export': { hy: 'Ներբեռնել CSV', ru: 'Экспорт CSV', en: 'Export CSV' },
  'ao.bulk.done': { hy: 'Թարմացվեց', ru: 'Обновлено', en: 'Updated' },
  'ao.bulk.failed': { hy: 'ձախողվեց', ru: 'ошибок', en: 'failed' },
  'ao.bulk.error': { hy: 'Խմբակային գործողության սխալ', ru: 'Ошибка массового действия', en: 'Bulk action failed' },

  // Order status
  'ao.status.pending': { hy: 'Սպասում', ru: 'Ожидание', en: 'Pending' },
  'ao.status.confirmed': { hy: 'Հաստատվել է', ru: 'Подтверждён', en: 'Confirmed' },
  'ao.status.processing': { hy: 'Կատարվում է', ru: 'В обработке', en: 'Processing' },
  'ao.status.shipped': { hy: 'Ուղարկվել է', ru: 'Отправлен', en: 'Shipped' },
  'ao.status.delivered': { hy: 'Առաքված', ru: 'Доставлен', en: 'Delivered' },
  'ao.status.cancelled': { hy: 'Չեղյալ', ru: 'Отменён', en: 'Cancelled' },

  // Payment status
  'ao.pay.paid': { hy: 'Վճարվել է', ru: 'Оплачен', en: 'Paid' },
  'ao.pay.refunded': { hy: 'Վերադարձվել է', ru: 'Возвращён', en: 'Refunded' },
  'ao.pay.refundedAlt': { hy: 'Վերադառնվել է', ru: 'Возвращён', en: 'Refunded' },

  // Payment methods
  'ao.method.cash': { hy: 'Կանխիկ', ru: 'Наличные', en: 'Cash' },
  'ao.method.transfer': { hy: 'Բանկային փոխանցում', ru: 'Банковский перевод', en: 'Bank transfer' },
  'ao.method.card': { hy: 'Քարտ', ru: 'Карта', en: 'Card' },
  'ao.method.cardWith': { hy: 'Քարտով', ru: 'Картой', en: 'By card' },

  // Periods
  'ao.period.today': { hy: 'Այսօր', ru: 'Сегодня', en: 'Today' },
  'ao.period.yesterday': { hy: 'Երեկ', ru: 'Вчера', en: 'Yesterday' },
  'ao.period.7d': { hy: '7 օր', ru: '7 дней', en: '7 days' },
  'ao.period.30d': { hy: '30 օր', ru: '30 дней', en: '30 days' },
  'ao.period.thisMonth': { hy: 'Այս ամիս', ru: 'Этот месяц', en: 'This month' },
  'ao.period.lastMonth': { hy: 'Անցած ամիս', ru: 'Прошлый месяц', en: 'Last month' },
  'ao.period.custom': { hy: 'Ընտրել օրերը', ru: 'Выбрать даты', en: 'Select dates' },

  // Cancel reasons
  'ao.reason.changed_mind': { hy: 'Հաճախորդը մտափոխվել է', ru: 'Клиент передумал', en: 'Customer changed their mind' },
  'ao.reason.no_answer': { hy: 'Չհաջողվեց կապվել', ru: 'Не удалось связаться', en: 'Could not reach customer' },
  'ao.reason.out_of_stock': { hy: 'Ապրանքը չկա', ru: 'Товара нет в наличии', en: 'Out of stock' },
  'ao.reason.expensive': { hy: 'Թանկ է', ru: 'Дорого', en: 'Too expensive' },
  'ao.reason.slow_delivery': { hy: 'Երկար առաքում', ru: 'Долгая доставка', en: 'Slow delivery' },
  'ao.reason.order_error': { hy: 'Սխալ պատվերում', ru: 'Ошибка в заказе', en: 'Order error' },
  'ao.reason.duplicate': { hy: 'Կրկնվող պատվեր', ru: 'Повторный заказ', en: 'Duplicate order' },
  'ao.reason.other': { hy: 'Այլ', ru: 'Другое', en: 'Other' },
  'ao.reason.unknown': { hy: 'Պատճառը նշված չէ', ru: 'Причина не указана', en: 'Reason not specified' },

  // Toasts
  'ao.toast.selectCancelReason': { hy: 'Ընտրեք չեղարկման պատճառը', ru: 'Выберите причину отмены', en: 'Select a cancellation reason' },
  'ao.toast.orderCancelled': { hy: 'Պատվերը չեղարկվեց', ru: 'Заказ отменён', en: 'Order cancelled' },
  'ao.toast.cancelFailed': { hy: 'Չեղարկումը չհաջողվեց', ru: 'Не удалось отменить', en: 'Cancellation failed' },

  // Card actions
  'ao.action.call': { hy: 'Զանգել', ru: 'Позвонить', en: 'Call' },
  'ao.action.history': { hy: 'Պատմություն', ru: 'История', en: 'History' },
  'ao.details.open': { hy: 'Մանրամասներ', ru: 'Подробнее', en: 'Details' },
  'ao.details.title': { hy: 'Պատվեր', ru: 'Заказ', en: 'Order' },
  'ao.btn.markPaid': { hy: 'Նշել վճարած', ru: 'Отметить оплаченным', en: 'Mark as paid' },
  'ao.paid': { hy: 'Վճարված', ru: 'Оплачено', en: 'Paid' },

  // Cancel info & history
  'ao.cancel.reasonLabel': { hy: 'Չեղարկման պատճառը:', ru: 'Причина отмены:', en: 'Cancellation reason:' },
  'ao.history.title': { hy: 'Գործողությունների պատմություն', ru: 'История действий', en: 'Activity history' },
  'ao.loading': { hy: 'Բեռնվում է...', ru: 'Загрузка...', en: 'Loading...' },
  'ao.history.empty': { hy: 'Գրառումներ չկան', ru: 'Записей нет', en: 'No records' },
  'ao.evt.created': { hy: 'Պատվերը ստեղծվեց', ru: 'Заказ создан', en: 'Order created' },
  'ao.evt.status': { hy: 'Կարգավիճակ', ru: 'Статус', en: 'Status' },
  'ao.evt.cancelled': { hy: 'Չեղարկվեց', ru: 'Отменён', en: 'Cancelled' },
  'ao.evt.reopened': { hy: 'Վերաբացվեց', ru: 'Возобновлён', en: 'Reopened' },
  'ao.evt.payment': { hy: 'Վճարում', ru: 'Оплата', en: 'Payment' },

  // Cancel dialog
  'ao.dialog.cancelTitle': { hy: 'Չեղարկել պատվերը', ru: 'Отменить заказ', en: 'Cancel order' },
  'ao.dialog.cancelDesc': { hy: 'Ընտրեք պատճառը, որպեսզի հետագայում տեսանելի լինի՝ ինչու է վաճառքը կորել։', ru: 'Выберите причину, чтобы позже было видно, почему продажа была потеряна.', en: 'Select a reason so you can later see why the sale was lost.' },
  'ao.label.reason': { hy: 'Պատճառ', ru: 'Причина', en: 'Reason' },
  'ao.cancel.selectReason': { hy: 'Ընտրեք պատճառը', ru: 'Выберите причину', en: 'Select a reason' },
  'ao.label.comment': { hy: 'Մեկնաբանություն', ru: 'Комментарий', en: 'Comment' },
  'ao.placeholder.comment': { hy: 'Լրացուցիչ մանրամասներ', ru: 'Дополнительные детали', en: 'Additional details' },
  'ao.btn.close': { hy: 'Փակել', ru: 'Закрыть', en: 'Close' },
  'ao.btn.cancelling': { hy: 'Չեղարկվում է...', ru: 'Отмена...', en: 'Cancelling...' },

  // Page header & finance period
  'ao.title': { hy: 'Պատվերների վահանակ', ru: 'Панель заказов', en: 'Orders dashboard' },
  'ao.finance.period': { hy: 'Ֆինանսական ժամանակահատված', ru: 'Финансовый период', en: 'Financial period' },
  'ao.finance.periodHint': { hy: 'Քարտերը հաշվարկվում են ըստ ընտրված պատվերի ամսաթվի', ru: 'Карточки рассчитываются по дате выбранного заказа', en: 'Cards are calculated by the selected order date' },
  'ao.placeholder.from': { hy: 'Սկիզբ', ru: 'Начало', en: 'Start' },
  'ao.placeholder.to': { hy: 'Ավարտ', ru: 'Конец', en: 'End' },

  // Stat cards
  'ao.stat.total': { hy: 'Ընդհանուր', ru: 'Всего', en: 'Total' },
  'ao.awaitingPayment': { hy: 'Վճարման սպասող', ru: 'Ожидают оплаты', en: 'Awaiting payment' },
  'ao.cancelled': { hy: 'Չեղարկված', ru: 'Отменённые', en: 'Cancelled' },
  'ao.revenue': { hy: 'Եկամուտ', ru: 'Доход', en: 'Revenue' },
  'ao.avgOrder': { hy: 'Միջին հաշիվ', ru: 'Средний чек', en: 'Average order' },

  // Finance rows
  'ao.orderCountWord': { hy: 'պատվեր', ru: 'заказов', en: 'orders' },
  'ao.refunds': { hy: 'Վերադարձներ', ru: 'Возвраты', en: 'Refunds' },
  'ao.netRevenue': { hy: 'Մաքուր եկամուտ', ru: 'Чистый доход', en: 'Net revenue' },
  'ao.note.paidMinusRefunds': { hy: 'վճարված - վերադարձներ', ru: 'оплачено - возвраты', en: 'paid - refunds' },
  'ao.note.byPaidOrders': { hy: 'վճարված պատվերներով', ru: 'по оплаченным заказам', en: 'by paid orders' },
  'ao.cost': { hy: 'Ինքնարժեք', ru: 'Себестоимость', en: 'Cost' },
  'ao.note.ordersCost': { hy: 'պատվերների ինքնարժեք', ru: 'себестоимость заказов', en: 'cost of orders' },
  'ao.grossProfit': { hy: 'Ընդհանուր շահույթ', ru: 'Валовая прибыль', en: 'Gross profit' },
  'ao.margin': { hy: 'Մարժան', ru: 'Маржа', en: 'Margin' },
  'ao.note.marginOverPaid': { hy: 'մարժան / վճարված', ru: 'маржа / оплачено', en: 'margin / paid' },

  // Finance breakdown & payment methods sections
  'ao.finance.breakdown': { hy: 'Ֆինանսական բաժանում', ru: 'Финансовая разбивка', en: 'Financial breakdown' },
  'ao.finance.byPeriod': { hy: 'Ըստ ընտրված ժամանակահատվածի', ru: 'По выбранному периоду', en: 'By selected period' },
  'ao.payMethods.title': { hy: 'Վճարման եղանակներ', ru: 'Способы оплаты', en: 'Payment methods' },
  'ao.payMethods.hint': { hy: 'Միայն վճարված և չեղարկված չհանդիսացող պատվերներ', ru: 'Только оплаченные и не отменённые заказы', en: 'Only paid, non-cancelled orders' },
  'ao.cancelReasons.title': { hy: 'Չեղարկումների պատճառներ', ru: 'Причины отмен', en: 'Cancellation reasons' },
  'ao.cancelReasons.hint': { hy: 'Վերլուծություն ըստ ընտրված ժամանակահատվածի', ru: 'Анализ по выбранному периоду', en: 'Analysis by selected period' },
  'ao.cancelReasons.empty': { hy: 'Այս ժամանակահատվածում չեղարկումներ չկան', ru: 'За этот период отмен нет', en: 'No cancellations in this period' },

  // Search, filter & empty state
  'ao.search.placeholder': { hy: 'Որոնել պատվեր...', ru: 'Поиск заказа...', en: 'Search order...' },
  'ao.all': { hy: 'Բոլորը', ru: 'Все', en: 'All' },
  'ao.empty': { hy: 'Պատվերներ չեն գտնվել', ru: 'Заказы не найдены', en: 'No orders found' },

  // Returns / exchanges page
  'ao.ret.status.pending': { hy: 'Քննարկվում է', ru: 'На рассмотрении', en: 'Under review' },
  'ao.ret.status.approved': { hy: 'Հաստատված', ru: 'Подтверждён', en: 'Approved' },
  'ao.ret.status.rejected': { hy: 'Մերժված', ru: 'Отклонён', en: 'Rejected' },
  'ao.ret.status.completed': { hy: 'Ավարտված', ru: 'Завершён', en: 'Completed' },
  'ao.ret.toast.updated': { hy: 'Թարմացված', ru: 'Обновлено', en: 'Updated' },
  'ao.ret.toast.error': { hy: 'Սխալ', ru: 'Ошибка', en: 'Error' },
  'ao.ret.title': { hy: 'Վերադարձներ / Փոխանակումներ', ru: 'Возвраты / Обмены', en: 'Returns / Exchanges' },
  'ao.ret.requestWord': { hy: 'հայտ', ru: 'заявок', en: 'requests' },
  'ao.ret.empty': { hy: 'Հայտեր չկան', ru: 'Заявок нет', en: 'No requests' },
  'ao.ret.typeReturn': { hy: '↩ Վերադարձ', ru: '↩ Возврат', en: '↩ Return' },
  'ao.ret.typeExchange': { hy: '⇄ Փոխանակում', ru: '⇄ Обмен', en: '⇄ Exchange' },
  'ao.ret.reasonLabel': { hy: 'Պատճառ՝', ru: 'Причина:', en: 'Reason:' },
  'ao.ret.approve': { hy: 'Հաստատել', ru: 'Подтвердить', en: 'Approve' },
  'ao.ret.complete': { hy: 'Ավարտել', ru: 'Завершить', en: 'Complete' },
  'ao.ret.reject': { hy: 'Մերժել', ru: 'Отклонить', en: 'Reject' },
};
