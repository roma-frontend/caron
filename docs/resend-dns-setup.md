# Настройка DNS для Resend (домен caron.group)

Цель: верифицировать домen в Resend, чтобы письма уходили с твоего домена
(например `noreply@caron.group`), а не через `onboarding@resend.dev`.

## ВАЖНО: где добавлять записи

DNS домена `caron.group` управляется в **Cloudflare** (Vercel сам пишет:
"Update your DNS records on Cloudflare"). Значит ВСЕ записи Resend добавляются
**в Cloudflare**, а не в Vercel.

Домен зарегистрирован под чужим аккаунтом Cloudflare — значит записи добавляет
владелец аккаунта Cloudflare. Передай ему таблицу ниже (раздел "Записи для
Cloudflare"). Этого достаточно, доступа к Resend ему не нужно.

Путь в Cloudflare: Dashboard -> зона `caron.group` -> DNS -> Records -> Add record.

---

## Записи для Cloudflare

Точные значения (особенно DKIM-ключ и регион amazonses) бери из своей панели
Resend: https://resend.com/domains -> домен caron.group. Ниже — структура.

### 1. DKIM (верификация домена)
- Type:     TXT
- Name:     resend._domainkey
- Content:  p=MIGfMA0GCSqG...TisLrEQIDAQAB   (скопировать ЦЕЛИКОМ из Resend, одной строкой)
- TTL:      Auto
- Proxy:    выключен / неприменимо

### 2. SPF (MX-запись)
- Type:     MX
- Name:     send
- Content:  feedback-smtp.eu-west-1.amazonses.com   (полное значение из Resend; регион может отличаться)
- Priority: 10
- TTL:      Auto

### 3. SPF (TXT-запись)
- Type:     TXT
- Name:     send
- Content:  v=spf1 include:amazonses.com ~all
- TTL:      Auto

### 4. DMARC (опционально, но рекомендуется)
- Type:     TXT
- Name:     _dmarc
- Content:  v=DMARC1; p=none;
- TTL:      Auto

---

## Критичные нюансы для Cloudflare

1. Name вводить БЕЗ домена. Cloudflare сам дописывает `.caron.group`.
   Пишешь `send`, `resend._domainkey`, `_dmarc` — ровно как в колонке Name у Resend.
   НЕ писать `send.caron.group` (иначе получится `send.caron.group.caron.group`).

2. Proxy (оранжевое облачко) — для TXT и MX не применяется, это нормально.
   Нигде не включай оранжевый прокси на этих записях (должно быть серое "DNS only").

3. DKIM-ключ копировать одной строкой, без переносов и лишних пробелов.
   Самая частая причина провала верификации. Жми иконку копирования в Resend,
   не выделяй мышкой.

4. Проверить существующий SPF: если на корне `caron.group` уже есть TXT
   `v=spf1 ...` от другого почтового сервиса — это ок, запись Resend идёт на
   поддомен `send`, не конфликтует. Но двух TXT с `v=spf1` на ОДНОМ имени быть
   не должно.

---

## После добавления записей

1. В Resend нажать "Verify DNS Records" (или подождать — статусы "Not Started"
   сменятся на "Verified").
2. Cloudflare применяет записи за минуты, но дай до ~30 мин на распространение.
3. Проверка из терминала:

   nslookup -type=TXT resend._domainkey.caron.group
   nslookup -type=TXT send.caron.group
   nslookup -type=MX send.caron.group

---

## ВАЖНО: настройки в коде проекта (caron)

Письма отправляются из Convex action (`convex/email.ts`), НЕ из Next.js/Vercel.

1. RESEND_API_KEY задаётся в деплое Convex (не в Vercel):
   npx convex env set RESEND_API_KEY re_xxxxx

2. Несоответствие домена: в `convex/email.ts` дефолтный отправитель сейчас
   зашит как `Caron <noreply@caron.am>`, а верифицируется `caron.group`.
   Если основной домен — caron.group, нужно выставить EMAIL_FROM под него,
   иначе Resend отклонит отправку с неверифицированного caron.am:

   npx convex env set EMAIL_FROM "Caron <noreply@caron.group>"

   (Адрес в EMAIL_FROM должен быть на ВЕРИФИЦИРОВАННОМ в Resend домене.)

3. Письмо уйдёт только если у получателя реальный email
   (адреса `*@telegram.local` пропускаются намеренно).

---

## Чек-лист

- [ ] Владелец Cloudflare добавил 4 записи (DKIM TXT, MX send, SPF TXT, DMARC)
- [ ] В Resend домен caron.group -> статус Verified
- [ ] RESEND_API_KEY задан в Convex env
- [ ] EMAIL_FROM в Convex env совпадает с верифицированным доменом
- [ ] Тестовое письмо дошло (например, оформить тестовый заказ)
