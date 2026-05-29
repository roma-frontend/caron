'use client';

import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function RichEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="min-h-[300px] rounded-lg border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: value }}
      onBlur={() => {
        if (ref.current) onChange(ref.current.innerHTML);
      }}
    />
  );
}
