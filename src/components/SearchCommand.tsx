'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';
import { formatPrice } from '@/lib/formatters';
import { Package, Clock, TrendingUp, Mic, ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { normalizeImageUrl } from '../../convex/lib/imageUrl';
import { useT } from '@/lib/i18n/admin';

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

/** Live microphone equalizer — bars driven by real audio, with an animated fallback. */
function VoiceVisualizer({ analyserRef, active }: { analyserRef: { current: AnalyserNode | null }; active: boolean }) {
  const N = 32;
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    const data = new Uint8Array(256);
    const loop = () => {
      const an = analyserRef.current;
      if (an) {
        an.getByteFrequencyData(data);
        const bins = an.frequencyBinCount;
        for (let i = 0; i < N; i++) {
          const idx = Math.min(bins - 1, 2 + Math.floor((i / N) * bins * 0.7));
          const v = data[idx] / 255;
          const h = 4 + Math.pow(v, 1.3) * 44;
          const el = barsRef.current[i];
          if (el) el.style.height = `${h}px`;
        }
      } else {
        const t = performance.now() / 220;
        for (let i = 0; i < N; i++) {
          const v = (Math.sin(t + i * 0.5) * 0.5 + 0.5) * (0.45 + 0.55 * (Math.sin(t * 0.8 + i * 0.3) * 0.5 + 0.5));
          const h = 5 + v * 30;
          const el = barsRef.current[i];
          if (el) el.style.height = `${h}px`;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, analyserRef]);

  return (
    <div className="flex h-12 items-end justify-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-[3px] rounded-full bg-gradient-to-t from-primary/50 to-primary"
          style={{ height: '4px', transition: 'height 80ms linear' }}
        />
      ))}
    </div>
  );
}

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

/** Pick an audio mime type the browser can record and Whisper accepts. */
function pickAudioMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t));
}

export function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [history, setHistory] = useState(getHistory);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const lastLoudRef = useRef(0);
  const silenceTimerRef = useRef<number | undefined>(undefined);
  const maxTimerRef = useRef<number | undefined>(undefined);
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
        if (!data.found) setImgErr(t('cmp.img_no_exact'));
      } else {
        setImgErr(t('cmp.img_no_recognize'));
      }
    } catch {
      setImgErr(t('cmp.img_analyze_fail'));
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Voice search (record → server-side Whisper transcription) ───
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearInterval(silenceTimerRef.current); silenceTimerRef.current = undefined; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = undefined; }
  }, []);

  const releaseAudio = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  // Stop recording → triggers transcription (onstop handler).
  const stopRecording = useCallback(() => {
    clearTimers();
    const mr = recorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try { mr.stop(); } catch { /* noop */ }
    } else {
      setListening(false);
      releaseAudio();
    }
  }, [clearTimers, releaseAudio]);

  // Abort and discard (e.g. dialog closed / unmount) — no transcription.
  const cancelRecording = useCallback(() => {
    clearTimers();
    const mr = recorderRef.current;
    if (mr) {
      mr.onstop = null;
      if (mr.state !== 'inactive') { try { mr.stop(); } catch { /* noop */ } }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    releaseAudio();
    setListening(false);
    setTranscribing(false);
  }, [clearTimers, releaseAudio]);

  const startVoice = async () => {
    if (transcribing) return;
    if (listening) { stopRecording(); return; }
    setVoiceErr(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceErr(t('cmp.voice_unsupported'));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceErr(t('cmp.voice_permission'));
      return;
    }
    streamRef.current = stream;

    // Live amplitude analyser (optional — visualizer falls back if unavailable).
    try {
      const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const AC = window.AudioContext || w.webkitAudioContext;
      if (AC) {
        const ac = new AC();
        audioCtxRef.current = ac;
        if (ac.state === 'suspended') await ac.resume().catch(() => {});
        const src = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.7;
        src.connect(analyser);
        analyserRef.current = analyser;
      }
    } catch { /* visualization optional */ }

    const mime = pickAudioMime();
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      releaseAudio();
      setVoiceErr(t('cmp.voice_start_fail'));
      return;
    }
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      clearTimers();
      const type = mr.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      releaseAudio();
      setListening(false);
      if (blob.size < 1500) return; // nothing meaningful captured
      setTranscribing(true);
      try {
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const fd = new FormData();
        fd.append('file', blob, `audio.${ext}`);
        const res = await fetch('/api/voice-search', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'failed');
        const text = String(data.text ?? '').trim();
        if (text) setQ(text);
        else setVoiceErr(t('cmp.voice_recognize_retry'));
      } catch {
        setVoiceErr(t('cmp.voice_recognize_fail'));
      } finally {
        setTranscribing(false);
      }
    };
    recorderRef.current = mr;
    try {
      mr.start();
    } catch {
      releaseAudio();
      setVoiceErr(t('cmp.voice_start_fail'));
      return;
    }
    setListening(true);

    // Auto-stop on silence (when amplitude is available) + hard safety cap.
    recStartRef.current = performance.now();
    lastLoudRef.current = performance.now();
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      silenceTimerRef.current = window.setInterval(() => {
        const a = analyserRef.current;
        if (!a) return;
        a.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        const now = performance.now();
        if (avg > 10) lastLoudRef.current = now;
        if (now - recStartRef.current > 1000 && now - lastLoudRef.current > 1600) stopRecording();
      }, 150);
    }
    maxTimerRef.current = window.setTimeout(() => stopRecording(), 12000);
  };

  // Cleanup on unmount.
  useEffect(() => () => {
    clearTimers();
    const mr = recorderRef.current;
    if (mr) { mr.onstop = null; if (mr.state !== 'inactive') { try { mr.stop(); } catch { /* noop */ } } }
    releaseAudio();
  }, [clearTimers, releaseAudio]);

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
    else cancelRecording();
    onOpenChange(v);
  };

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title={t('cmp.search_title')}>
      <Command shouldFilter={false} className="relative">
        <CommandInput value={q} onValueChange={setQ} placeholder={t('cmp.search_products_placeholder')} className="pr-20" />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelected} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={analyzing} aria-label={t('cmp.image_search')} title={t('cmp.image_search')}
          className={`absolute right-12 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${analyzing ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-primary'}`}>
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <button type="button" onClick={startVoice} disabled={transcribing} aria-label={t('cmp.voice_search')} title={t('cmp.voice_search')}
          className={`absolute right-4 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${listening ? 'scale-110 bg-destructive text-white shadow-[0_0_0_4px_rgba(239,68,68,0.25)]' : 'text-muted-foreground hover:bg-accent hover:text-primary'}`}>
          {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        </button>
        {(analyzing || imgErr || voiceErr) && (
          <div className={`px-4 pb-1 text-xs ${imgErr || voiceErr ? 'text-destructive' : 'text-muted-foreground'}`}>
            {analyzing ? t('cmp.analyzing_image') : (imgErr ?? voiceErr)}
          </div>
        )}
        {(listening || transcribing) && (
          <div className="mx-3 mb-2 flex flex-col items-center gap-3 rounded-2xl border bg-card/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            {listening ? (
              <>
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                  <span className="absolute inset-0 rounded-full bg-destructive/10 animate-pulse" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-white shadow-lg">
                    <Mic className="h-5 w-5" />
                  </span>
                </div>
                <VoiceVisualizer analyserRef={analyserRef} active={listening} />
                <p className="text-center text-sm font-medium text-foreground">{q ? `«${q}»` : t('cmp.speak_now')}</p>
                <button type="button" onClick={stopRecording}
                  className="rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  {t('cmp.stop')}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('cmp.recognizing_voice')}
              </div>
            )}
          </div>
        )}
        <CommandList>
          {term.length < 2 ? (
            <>
              {history.length > 0 && (
                <CommandGroup heading={t('cmp.recent_searches')}>
                  {history.map((h) => (
                    <CommandItem key={h} value={h} onSelect={() => searchAll(h)} className="gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{h}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup heading={t('cmp.popular_products')}>
                {POPULAR.map((p) => (
                  <CommandItem key={p} value={p} onSelect={() => searchAll(p)} className="gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{p}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : results === undefined ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{t('cmp.searching')}</div>
          ) : results.length === 0 ? (
            <CommandEmpty>{t('cmp.no_products_found')}</CommandEmpty>
          ) : (
            <CommandGroup heading={t('cmp.products')}>
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
