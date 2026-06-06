'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

interface OemNumbersInputProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function OemNumbersInput({ value, onChange }: OemNumbersInputProps) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed || value.includes(trimmed)) {
      setInput('');
      return;
    }
    onChange([...value, trimmed]);
    setInput('');
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label>OEM համարներ</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="90919-01253"
          className="h-11 font-mono tracking-wider"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((num, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-mono"
            >
              {num}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
