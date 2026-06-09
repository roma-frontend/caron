'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from '@/lib/motion';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactElement;
  validation?: (data: Record<string, unknown>) => boolean;
}

interface WizardProps {
  steps: WizardStep[];
  onComplete: (data: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  defaultData?: Record<string, unknown>;
  renderStickySummary?: (ctx: { data: Record<string, unknown>; update: (key: string, value: unknown) => void }) => React.ReactNode;
  submitOnly?: boolean;
  hideProgress?: boolean;
}

const WizardContext = React.createContext<{
  data: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
} | null>(null);

export function useWizardData() {
  const ctx = React.useContext(WizardContext);
  if (!ctx) throw new Error('useWizardData must be used inside Wizard');
  return ctx;
}

export function Wizard({ steps, onComplete, onCancel, submitLabel = 'Ստեղծել', defaultData = {}, renderStickySummary, submitOnly = false, hideProgress = false }: WizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>(defaultData);
  const [submitting, setSubmitting] = useState(false);

  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;
  const canNext = current?.validation ? current.validation(data) : true;

  const update = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const next = async () => {
    if (step < steps.length - 1) { setStep((s) => s + 1); return; }
    setSubmitting(true);
    try { await onComplete(data); } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {renderStickySummary && (
          <div
            className={cn(
              'sticky top-0 z-20 -mx-4 mb-4 bg-background/95 px-4 pt-4 pb-3 backdrop-blur md:-mx-6 md:px-6 md:pt-6',
              hideProgress ? 'mt-1 rounded-xl border' : '-mt-4 border-b md:-mt-6',
            )}
          >
            {renderStickySummary({ data, update })}
          </div>
        )}

        {!hideProgress && (
          <div className="mb-6">
            <div className="relative h-1.5 rounded-full bg-muted overflow-hidden mb-4">
              <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease' }} />
            </div>
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.id} className="flex flex-col items-center flex-1 min-w-0">
                  <div className={cn('flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 text-[10px] sm:text-xs font-semibold transition-all', i < step ? 'border-primary bg-primary text-primary-foreground' : i === step ? 'border-primary text-primary scale-110' : 'border-muted-foreground/30 text-muted-foreground')}>
                    {i < step ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : i + 1}
                  </div>
                  <span className={cn('mt-1 text-[10px] sm:text-[11px] font-medium text-center truncate max-w-full px-0.5', i === step ? 'text-primary' : 'text-muted-foreground')}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <h2 className="text-lg font-bold mb-1">{current?.title}</h2>
            {current?.description && <p className="text-sm text-muted-foreground mb-4">{current.description}</p>}
            <WizardContext.Provider value={{ data, update }}>
              {current?.content}
            </WizardContext.Provider>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t p-4 md:p-6 flex items-center gap-3">
        {!submitOnly && (
          <Button variant="outline" onClick={step > 0 ? () => setStep((s) => s - 1) : onCancel} disabled={submitting}>
            <ChevronLeft className="h-4 w-4 mr-1" /> {step > 0 ? 'Առաջ' : 'Ետ'}
          </Button>
        )}
        <Button onClick={next} disabled={!canNext || submitting} className={cn(submitOnly && 'w-full')}>
          {submitting ? 'Հարցազրույց...' : step === steps.length - 1 || submitOnly ? submitLabel : <><span>Առաջ</span><ChevronRight className="h-4 w-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}
