import type { AdminLang } from '@/store/adminLang';

/** One translation entry: a string per supported language. */
export type Tr = Record<AdminLang, string>;

/** A dictionary module: a flat map of dotted keys to translations. */
export type DictModule = Record<string, Tr>;
