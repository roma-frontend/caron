# TODO / Backlog

Отложенные задачи проекта Caron. Делаем по мере приоритета.

## Инфраструктура / стоимость

### [ ] Перевести отдачу картинок R2 на custom domain (путь A)

**Контекст.** Сейчас картинки отдаются напрямую с Cloudflare через публичный
**dev-URL** бакета:

```
R2_PUBLIC_HOST = https://pub-21da6611c49e416480be7cc2d42af249.r2.dev
```

(переменная задана в Convex prod; код в `convex/lib/imageUrl.ts` переписывает
сохранённые в БД прокси-пути `/api/r2-image?url=...` на этот хост на лету).

**Проблема dev-URL (`*.r2.dev`):**
- Cloudflare **ограничивает скорость** (rate-limit) dev-URL.
- dev-URL **не кэшируется** на CDN Cloudflare (нет edge-кэша).
- Cloudflare сам помечает его как «not recommended for production».

Для старта и небольшого трафика — приемлемо. При росте трафика нужно перейти
на **custom domain** (например `img.caron.group`): без rate-limit, с полным
CDN-кэшем Cloudflare.

**Что мешает сейчас:** домен `caron.group` **не управляется через Cloudflare
DNS** (R2 Custom Domains требует, чтобы зона домена была в Cloudflare).
Поэтому нужно сначала перенести DNS домена на Cloudflare.

**План (без даунтайма):**
1. Добавить `caron.group` как сайт (zone) в Cloudflare.
2. Cloudflare просканирует и импортирует текущие DNS-записи — **сверить, что
   все записи (особенно записи Vercel: A/CNAME на `caron.group` и `www`, MX,
   TXT/SPF/DKIM почты) перенесены корректно.** Это критично, чтобы сайт и
   почта не легли.
3. У регистратора домена сменить nameservers на те, что выдаст Cloudflare.
4. Дождаться активации зоны в Cloudflare (обычно минуты–часы).
5. Проверить, что сайт `caron.group` и `www.caron.group` открываются, почта
   ходит.
6. R2 → бакет `autoparts` → Settings → **Custom Domains → + Add** →
   `img.caron.group` → дождаться статуса Active (DNS-запись и сертификат
   Cloudflare создаст сам).
7. Поменять переменную:
   ```
   npx convex env set R2_PUBLIC_HOST https://img.caron.group --prod
   npx convex deploy -y
   ```
8. Проверить `curl -I https://img.caron.group/products/<id>` → 200 image/webp.
9. `img.caron.group` уже добавлен в `remotePatterns` в `next.config.mjs`.

**Откат:** если что-то пойдёт не так — вернуть `R2_PUBLIC_HOST` на dev-URL
(`https://pub-21da6611c49e416480be7cc2d42af249.r2.dev`) и redeploy Convex.

---

## Заметки

- Прокси-роут `/api/r2-image` оставлен как **fallback** — если
  `R2_PUBLIC_HOST` не задан или URL не распознан, картинки идут через него.
  Удалять не нужно.
- Vercel-переменная для картинок не требуется: перезапись URL целиком на
  стороне Convex (`normalizeImageUrl`).
