'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';
import { formatPrice } from '@/lib/formatters';
import { Package, Clock, TrendingUp, Mic, ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { normalizeImageUrl } from '../../convex/lib/imageUrl';

/** Small product thumbnail for search results (falls back to an icon). */
function ResultThumb({ src, alt }: { src?: string | null; alt: string }) {
  const url = normalizeImageUrl(src);
  const [err, setErr] = useState(false);
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
      {url && !err ? (
        <Image src={url} alt={alt} fill sizes="40px" className="object-cover" onError={() => setErr(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <Package className="h-4 w-4 text-muted-foreground" />
        </span>
      )}
    </div>
  );
}

/** Animated equalizer shown while listening (a lively voice-wave). */
function VoiceVisualizer({ active }: { active: boolean }) {
  const N = 28;
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    const loop = () => {
      const t = performance.now() / 220;
      for (let i = 0; i < N; i++) {
        const v = (Math.sin(t + i * 0.5) * 0.5 + 0.5) * (0.45 + 0.55 * (Math.sin(t * 0.8 + i * 0.3) * 0.5 + 0.5));
        const h = 5 + v * 30;
        const el = barsRef.current[i];
        if (el) el.style.height = `${h}px`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  return (
    <div className="flex h-12 items-end justify-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-[3px] rounded-full bg-gradient-to-t from-primary/50 to-primary"
          style={{ height: '5px', transition: 'height 90ms linear' }}
        />
      ))}
    </div>
  );
}

type SpeechResultList = ArrayLike<ArrayLike<{ transcript: string }>>;
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((e: { results: SpeechResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

const HISTORY_KEY = 'search-history';
const MAX_HISTORY = 5;
const POPULAR = ['Շարժիչի յուղ', 'Արգելակման բարձիկներ', 'Յուղի ֆիլտր', 'Ակտիվատոր', 'Կայծային մոմեր'];

function getHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function addToHistory(term: string) {
  const prev = getHistory().filter((h) => h !== term);
  const next = [term, ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [history, setHistory] = useState(getHistory);
  const [listening, setListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const retriedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const term = q.trim();
  const results = useQuery(api.products.list, term.length >= 2 ? { search: term, limit: 8 } : 'skip');

  // ─── Image search ───
  const fileToDataUrl = async (file: File, max = 1024, quality = 0.8): Promise<string> => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', quality);
  };

  const onImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setImgErr(null);
    setAnalyzing(true);
    try {
      const image = await fileToDataUrl(file);
      const res = await fetch('/api/image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'failed');
      if (data.query) {
        setQ(data.query);
        if (!data.found) setImgErr('Ճշգրիտ համընկնում չգտնվեց — ճշտեք որոնումը');
      } else {
        setImgErr('Չհաջողվեց ճանաչել ապրանքը նկարից');
      }
    } catch {
      setImgErr('Չհաջողվեց վերլուծել նկարը։ Փորձեք կրկին');
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Voice search (browser SpeechRecognition; no getUserMedia to avoid mic
  //     contention). Tries Armenian first, falls back to Russian if the speech
  //     service does not support the language. ───
  const mapVoiceError = (code?: string) => {
    if (code === 'no-speech') return 'Ձայն չհայտնաբերվեց, փորձեք կրկին';
    if (code === 'not-allowed' || code === 'service-not-allowed') return 'Թույլատրեք միկրոֆոնի օգտագործումը';
    if (code === 'audio-capture') return 'Միկրոֆոն չի գտնվել';
    if (code === 'network') return 'Ցանցի սխալ, ստուգեք ինտերնետը';
    return 'Ձայնային որոնման սխալ';
  };

  const beginRecognition = (lang: string) => {
    const SR = getSpeechRecognition();
    if (!SR) { setVoiceErr('Ձեր բրաուզերը չի աջակցում ձայնային որոնումը'); return; }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i]?.[0]?.transcript ?? '';
      }
      if (transcript) setQ(transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = (ev) => {
      const code = ev?.error;
      // Armenian not supported by the speech service → retry once in Russian.
      if ((code === 'language-not-supported' || code === 'service-not-allowed') && !retriedRef.current && lang !== 'ru-RU') {
        retriedRef.current = true;
        recognitionRef.current = null;
        beginRecognition('ru-RU');
        return;
      }
      setVoiceErr(mapVoiceError(code));
      setListening(false);
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch { /* already started */ }
  };

  const startVoice = () => {
    if (listening) { try { recognitionRef.current?.stop(); } catch { /* noop */ } return; }
    setVoiceErr(null);
    if (!getSpeechRecognition()) { setVoiceErr('Ձեր բրաուզերը չի աջակցում ձայնային որոնումը'); return; }
    retriedRef.current = false;
    beginRecognition('hy-AM');
  };

  const stopVoice = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
    setListening(false);
  };

  // Cleanup on unmount.
  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* noop */ } }, []);

  const refreshHistory = () => setHistory(getHistory());

  const go = (slug: string, searchTerm?: string) => {
    if (searchTerm) addToHistory(searchTerm);
    onOpenChange(false);
    setQ('');
    router.push(`/products/${slug}`);
  };

  const searchAll = (searchTerm: string) => {
    addToHistory(searchTerm);
    onOpenChange(false);
    setQ('');
    router.push(`/products?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleOpenChange = (v: boolean) => {
    if (v) refreshHistory();
    else stopVoice();
    onOpenChange(v);
  };

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Որոնել">
      <Command shouldFilter={false} className="relative">
        <CommandInput value={q} onValueChange={setQ} placeholder="Որոնել ապրանքներ..." className="pr-20" />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelected} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={analyzing} aria-label="Որոնում նկարով" title="Որոնում նկարով"
          className={`absolute right-12 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${analyzing ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-primary'}`}>
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <button type="button" onClick={startVoice} aria-label="Ձայնային որոնում" title="Ձայնային որոնում"
          className={`absolute right-4 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${listening ? 'scale-110 bg-destructive text-white shadow-[0_0_0_4px_rgba(239,68,68,0.25)]' : 'text-muted-foreground hover:bg-accent hover:text-primary'}`}>
          <Mic className="h-4 w-4" />
        </button>
        {(analyzing || imgErr || voiceErr) && (
          <div className={`px-4 pb-1 text-xs ${imgErr || voiceErr ? 'text-destructive' : 'text-muted-foreground'}`}>
            {analyzing ? 'Վերլուծում ենք նկարը…' : (imgErr ?? voiceErr)}
          </div>
        )}
        {listening && (
          <div className="mx-3 mb-2 flex flex-col items-center gap-3 rounded-2xl border bg-card/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-destructive/10 animate-pulse" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-white shadow-lg">
                <Mic className="h-5 w-5" />
              </span>
            </div>
            <VoiceVisualizer active={listening} />
            <p className="text-center text-sm font-medium text-foreground">{q ? `«${q}»` : 'Խոսեք հիմա…'}</p>
            <button type="button" onClick={stopVoice}
              className="rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              Կանգնեցնել
            </button>
          </div>
        )}
        <CommandList>
          {term.length < 2 ? (
            <>
              {history.length > 0 && (
                <CommandGroup heading="Վերջին որոնումներ">
                  {history.map((h) => (
                    <CommandItem key={h} value={h} onSelect={() => searchAll(h)} className="gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{h}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup heading="Հայտնի ապրանքներ">
                {POPULAR.map((p) => (
                  <CommandItem key={p} value={p} onSelect={() => searchAll(p)} className="gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{p}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : results === undefined ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Որոնում...</div>
          ) : results.length === 0 ? (
            <CommandEmpty>Ոչ մի ապրանք չի գտնվել</CommandEmpty>
          ) : (
            <CommandGroup heading="Ապրանքներ">
              {results.map((p) => (
                <CommandItem key={p._id} value={p._id} onSelect={() => go(p.slug, term)} className="gap-3">
                  <ResultThumb src={p.images?.[0]} alt={p.name} />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-primary">{formatPrice(p.price)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
