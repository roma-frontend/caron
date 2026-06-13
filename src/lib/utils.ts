import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Use on price/discount inputs: type="text" but only digits & one dot allowed */
export function numericInputProps(allowDecimal = true) {
  return {
    type: 'text' as const,
    inputMode: 'decimal' as const,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
      if (allowed.includes(e.key)) return;
      if (allowDecimal && e.key === '.' && !(e.currentTarget.value.includes('.'))) return;
      if (!/^\d$/.test(e.key)) e.preventDefault();
    },
  };
}
