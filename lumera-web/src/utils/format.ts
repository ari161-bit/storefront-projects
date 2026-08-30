export function fmtGBP(n: number): string {
  return `£${n.toFixed(2)}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
