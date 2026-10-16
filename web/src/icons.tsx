const svg = (d: string, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const CheckIcon = () => svg('M4 12.5l5 5L20 6.5', 16);
export const CloseIcon = () => svg('M6 6l12 12M18 6L6 18', 16);
export const PlusIcon = () => svg('M12 4v16M4 12h16', 20);
export const PrevIcon = () => svg('M15 5l-7 7 7 7');
export const NextIcon = () => svg('M9 5l7 7-7 7');
export const CalendarIcon = () => svg('M4 6h16v14H4zM4 10h16M8 3v6M16 3v6', 16);
