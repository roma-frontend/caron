import * as XLSX from 'xlsx-js-style';

// Re-export the styled SheetJS fork so route handlers use one consistent build.
export { XLSX };

const BRAND = '0066AE';
const THIN = { style: 'thin', color: { rgb: 'E5E9EF' } } as const;
const BORDER_ALL = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const MONEY_FMT = '#,##0" ֏"';

type StyleOpts = {
  /** Column widths in characters (per column, in order). */
  widths?: number[];
  /** 0-based column indexes to format as currency. */
  moneyCols?: number[];
  /** Header row index (default 0). */
  headerRow?: number;
  /** When true, only style the header (cheap) — used for very large/round-trip
   *  sheets where per-cell styling would bloat the file. */
  headerOnly?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sheet = Record<string, any>;

/**
 * Apply a branded, professional look (header fill, borders, zebra rows, money
 * formatting, autofilter, sized columns) to a header+body worksheet in place.
 */
export function styleSheet(ws: Sheet, opts: StyleOpts = {}): void {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headerRow = opts.headerRow ?? 0;
  const ncols = range.e.c + 1;

  if (opts.widths) ws['!cols'] = opts.widths.map((w) => ({ wch: w }));
  ws['!rows'] = ws['!rows'] ?? [];
  ws['!rows'][headerRow] = { hpt: 22 };
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: range.e.r, c: range.e.c } }),
  };

  const set = (r: number, c: number, s: Record<string, unknown>) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = { ...(ws[addr].s || {}), ...s };
  };

  // Header row
  for (let c = 0; c < ncols; c++) {
    set(headerRow, c, {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: BRAND } },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
      border: BORDER_ALL,
    });
  }

  if (opts.headerOnly) return;

  // Body rows: subtle borders + zebra striping + currency formatting
  const money = new Set(opts.moneyCols ?? []);
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const zebra = (r - headerRow) % 2 === 0;
    for (let c = 0; c < ncols; c++) {
      const s: Record<string, unknown> = { border: BORDER_ALL, alignment: { vertical: 'center' } };
      if (zebra) s.fill = { fgColor: { rgb: 'F7FAFC' } };
      set(r, c, s);
      if (money.has(c)) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) ws[addr].z = MONEY_FMT;
      }
    }
  }
}
