type FlyTargetKind = 'cart' | 'favorites';

const TARGET_SELECTORS: Record<FlyTargetKind, string[]> = {
  cart: ['[data-cart-icon]', '[data-mobile-cart-icon]'],
  favorites: ['[data-fav-icon]', '[data-mobile-fav-icon]'],
};

const SOURCE_SELECTORS = '[data-product-fly-source], [data-product-card], [data-cart-row], [data-favorite-card], article, .group';

function isRectInViewport(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

function isRenderableImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  const value = src.trim();
  if (!value) return false;
  return value.startsWith('http://')
    || value.startsWith('https://')
    || value.startsWith('/')
    || value.startsWith('data:')
    || value.startsWith('blob:');
}

function resolveSourceElement(triggerEl: HTMLElement): HTMLElement {
  return (triggerEl.closest(SOURCE_SELECTORS) as HTMLElement | null) ?? triggerEl;
}

function getBestImageElement(triggerEl: HTMLElement): HTMLImageElement | null {
  const sourceRoot = resolveSourceElement(triggerEl);
  const candidates = Array.from(sourceRoot.querySelectorAll('img')) as HTMLImageElement[];
  if (candidates.length === 0) return null;

  const triggerRect = triggerEl.getBoundingClientRect();

  return candidates
    .map((img) => {
      const r = img.getBoundingClientRect();
      const area = Math.max(0, r.width) * Math.max(0, r.height);
      const visibleArea = Math.max(0, Math.min(window.innerWidth, r.right) - Math.max(0, r.left))
        * Math.max(0, Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top));
      const dx = r.left + r.width / 2 - (triggerRect.left + triggerRect.width / 2);
      const dy = r.top + r.height / 2 - (triggerRect.top + triggerRect.height / 2);
      const distance = Math.hypot(dx, dy);
      const hasSource = isRenderableImageSrc(img.currentSrc) || isRenderableImageSrc(img.src);
      const score = (hasSource ? 1000000 : 0) + visibleArea * 2 + area - distance * 8;
      return { img, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.img ?? null;
}

function getFirstVisibleTarget(kind: FlyTargetKind): HTMLElement | null {
  const selectors = TARGET_SELECTORS[kind];
  for (const selector of selectors) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (isRectInViewport(rect)) return el;
  }
  return null;
}

function getAnyTarget(kind: FlyTargetKind): HTMLElement | null {
  const selectors = TARGET_SELECTORS[kind];
  for (const selector of selectors) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) return el;
  }
  return null;
}

function resolveImageSource(triggerEl: HTMLElement, explicitSrc?: string | null): string | null {
  const bestImg = getBestImageElement(triggerEl);
  const domSrc = bestImg?.currentSrc ?? bestImg?.src ?? null;

  if (isRenderableImageSrc(domSrc)) return domSrc as string;
  if (isRenderableImageSrc(explicitSrc)) return explicitSrc as string;
  if (isRenderableImageSrc(domSrc)) return domSrc as string;
  return null;
}

function resolveSourceRect(triggerEl: HTMLElement): DOMRect {
  const sourceEl = resolveSourceElement(triggerEl);
  const rect = sourceEl.getBoundingClientRect();
  if (rect.width >= 120 && rect.height >= 120) return rect;
  return triggerEl.getBoundingClientRect();
}

export function flyProductAway(options: {
  triggerEl: HTMLElement | null;
  imageSrc?: string | null;
}) {
  const { triggerEl } = options;
  if (!triggerEl || typeof window === 'undefined') return;

  const sourceEl = resolveSourceElement(triggerEl);
  const rect = sourceEl.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;

  const ghost = sourceEl.cloneNode(true) as HTMLElement;
  ghost.style.position = 'fixed';
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.margin = '0';
  ghost.style.transformOrigin = 'center center';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '9999';
  ghost.style.overflow = 'hidden';
  ghost.style.boxShadow = '0 24px 60px -24px rgba(0, 0, 0, 0.34)';
  ghost.style.background = 'var(--card)';
  ghost.style.borderRadius = getComputedStyle(sourceEl).borderRadius || '18px';

  document.body.appendChild(ghost);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ghost.remove();
    return;
  }

  const dx = Math.max(36, Math.min(96, rect.width * 0.16));
  const dy = -Math.max(22, Math.min(64, rect.height * 0.12));
  const durationMs = 520;

  const animation = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, filter: 'blur(0px)' },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(0.96)`, opacity: 0.82, filter: 'blur(0.4px)' },
      { transform: `translate(${dx}px, ${dy}px) scale(0.88)`, opacity: 0, filter: 'blur(1.5px)' },
    ],
    {
      duration: durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    },
  );

  const cleanup = () => ghost.remove();
  animation.addEventListener('finish', cleanup, { once: true });
  animation.addEventListener('cancel', cleanup, { once: true });
}

export function flyProductToTarget(options: {
  triggerEl: HTMLElement | null;
  kind: FlyTargetKind;
  imageSrc?: string | null;
}) {
  const { triggerEl, kind, imageSrc } = options;
  if (!triggerEl || typeof window === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targetEl = getFirstVisibleTarget(kind) ?? getAnyTarget(kind);
  if (!targetEl) return;

  const fromRect = resolveSourceRect(triggerEl);
  const toRect = targetEl.getBoundingClientRect();

  if (fromRect.width < 2 || fromRect.height < 2) return;

  const sourceAspect = Math.max(0.62, Math.min(1.5, fromRect.width / Math.max(1, fromRect.height)));
  const startWidth = Math.max(240, Math.min(420, fromRect.width * 0.9));
  const startHeight = Math.max(260, Math.min(520, startWidth / sourceAspect));
  const endSize = Math.max(18, Math.min(28, Math.min(toRect.width, toRect.height) * 0.9));

  const startX = fromRect.left + fromRect.width / 2 - startWidth / 2;
  const startY = fromRect.top + fromRect.height / 2 - startHeight / 2;

  const viewportMargin = 14;
  const hasVisibleTarget = isRectInViewport(toRect);
  const fallbackCenterX = kind === 'cart' ? window.innerWidth - 32 : window.innerWidth - 76;
  const fallbackCenterY = 30;
  const rawCenterX = hasVisibleTarget ? toRect.left + toRect.width / 2 : fallbackCenterX;
  const rawCenterY = hasVisibleTarget ? toRect.top + toRect.height / 2 : fallbackCenterY;
  const targetCenterX = Math.max(viewportMargin, Math.min(window.innerWidth - viewportMargin, rawCenterX));
  const targetCenterY = Math.max(viewportMargin, Math.min(window.innerHeight - viewportMargin, rawCenterY));
  const safeEndX = targetCenterX - endSize / 2;
  const safeEndY = targetCenterY - endSize / 2;

  const ghost = document.createElement('div');
  ghost.style.position = 'fixed';
  ghost.style.left = `${startX}px`;
  ghost.style.top = `${startY}px`;
  ghost.style.width = `${startWidth}px`;
  ghost.style.height = `${startHeight}px`;
  ghost.style.borderRadius = '18px';
  ghost.style.transformOrigin = 'top left';
  ghost.style.overflow = 'hidden';
  ghost.style.zIndex = '9999';
  ghost.style.pointerEvents = 'none';
  ghost.style.boxShadow = '0 24px 60px -24px rgba(0, 0, 0, 0.48)';
  ghost.style.border = '1px solid color-mix(in oklab, var(--border) 80%, white 20%)';
  ghost.style.background = 'var(--card)';

  const resolvedSrc = resolveImageSource(triggerEl, imageSrc);
  if (resolvedSrc) {
    const media = document.createElement('div');
    media.style.position = 'relative';
    media.style.height = '100%';
    media.style.width = '100%';
    media.style.background = 'color-mix(in oklab, var(--muted) 90%, white 10%)';

    const sourceImg = getBestImageElement(triggerEl);
    const img = sourceImg ? sourceImg.cloneNode(false) as HTMLImageElement : document.createElement('img');
    img.alt = '';
    img.decoding = 'sync';
    img.loading = 'eager';
    img.fetchPriority = 'high';
    if (!isRenderableImageSrc(img.currentSrc) && !isRenderableImageSrc(img.src)) {
      img.src = resolvedSrc;
    }
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.background = 'color-mix(in oklab, var(--muted) 94%, white 6%)';
    media.appendChild(img);

    const shade = document.createElement('div');
    shade.style.position = 'absolute';
    shade.style.left = '0';
    shade.style.right = '0';
    shade.style.bottom = '0';
    shade.style.height = '28%';
    shade.style.background = 'linear-gradient(to top, rgba(0,0,0,0.22), rgba(0,0,0,0))';
    media.appendChild(shade);

    ghost.appendChild(media);
  } else {
    const fallback = document.createElement('div');
    fallback.style.height = '100%';
    fallback.style.width = '100%';
    fallback.style.background = 'linear-gradient(145deg, color-mix(in oklab, var(--primary) 22%, var(--card) 78%), color-mix(in oklab, var(--accent) 30%, var(--card) 70%))';
    ghost.appendChild(fallback);
  }

  document.body.appendChild(ghost);

  if (prefersReducedMotion) {
    ghost.remove();
    return;
  }

  const dx = safeEndX - startX;
  const dy = safeEndY - startY;
  const distance = Math.hypot(dx, dy);
  const durationMs = Math.max(900, Math.min(2000, 620 + distance * 0.58));
  const scaleX = endSize / startWidth;
  const scaleY = endSize / startHeight;
  const arcLift = Math.max(24, Math.min(120, distance * 0.16));
  const startRadius = 18;
  const midRadius = 18;
  const endRadius = 50;

  ghost.style.borderRadius = `${startRadius}px`;

  const animation = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1, 1)', opacity: 1, borderRadius: `${startRadius}px`, offset: 0 },
      { transform: `translate(${dx * 0.56}px, ${dy * 0.56 - arcLift}px) scale(${Math.max(0.4, scaleX * 2.25)}, ${Math.max(0.4, scaleY * 2.25)})`, opacity: 0.96, borderRadius: `${midRadius}px`, offset: 0.58 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`, opacity: 0.84, borderRadius: `${endRadius}px`, offset: 1 },
    ],
    {
      duration: durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    },
  );

  const cleanup = () => {
    ghost.remove();
    if (!hasVisibleTarget) return;
    const pulseClass = kind === 'cart' ? 'cart-bounce' : 'heart-pulse';
    targetEl.classList.add(pulseClass);
    window.setTimeout(() => targetEl.classList.remove(pulseClass), 400);
  };

  animation.addEventListener('finish', cleanup, { once: true });
  animation.addEventListener('cancel', cleanup, { once: true });
}
