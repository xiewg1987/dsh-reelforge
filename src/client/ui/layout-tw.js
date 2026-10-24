/** 工作台 Tailwind 类名（替代原 rf-* CSS）。 */
export const tw = {
  root: 'rf-root flex h-full box-border flex-col overflow-hidden bg-background text-foreground text-[13px] leading-normal font-sans',
  header: 'flex h-[60px] shrink-0 items-center gap-3 px-5 bg-background',
  headerLogo:
    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent after:block after:h-3 after:w-3 after:rounded-sm after:bg-primary',
  headerLogoBtn: 'border-0 p-0 cursor-pointer',
  headerText: 'min-w-0 flex-1',
  headerTitle: 'text-sm font-semibold text-foreground',
  headerSubtitle: 'text-[10px] text-muted-foreground',
  stagebar: 'flex h-[50px] shrink-0 items-center gap-5 overflow-x-auto bg-muted px-5 pl-6',
  stageStep: 'inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-inherit text-[10px] whitespace-nowrap',
  stageDot: 'h-[7px] w-[7px] shrink-0 rounded-full bg-border',
  stageCount: 'ml-auto shrink-0 text-[10px] text-muted-foreground',
  tabs: 'flex h-11 shrink-0 items-center gap-3 overflow-x-auto bg-background px-5',
  tabItem: 'cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 font-inherit text-xs text-muted-foreground whitespace-nowrap',
  tabItemActive: 'bg-accent font-semibold text-primary',
  scroll: 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5',
  stack: 'flex flex-col gap-4',
  footer: 'flex h-[70px] shrink-0 items-center gap-3 border-t border-border px-5 bg-background',
  footerText: 'min-w-0 flex-1',
  footerLabel: 'text-[10px] text-muted-foreground',
  footerValue: 'text-xs font-medium text-foreground',
  row: 'flex items-center gap-3 py-2',
  rowMain: 'min-w-0 flex-1',
  rowTitle: 'text-xs text-foreground',
  rowSub: 'text-[11px] text-muted-foreground',
  grid: 'grid grid-cols-1 gap-3',
  gridTwo: 'grid grid-cols-2 gap-3',
  gridThree: 'grid grid-cols-3 gap-3',
  hubstrip: 'flex flex-row items-center gap-3.5',
  divider: 'h-[42px] w-px shrink-0 bg-border',
  note: 'mt-2 text-[11px] text-muted-foreground',
  noteWarn: 'mt-2 text-[11px] text-[var(--rf-warn)]',
  chatrow: 'mb-2 rounded-lg border border-border bg-card p-3',
  chatrowHead: 'flex items-center gap-2',
  chatrowKind: 'rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground',
  chatrowTitle: 'text-[11px] text-foreground',
  chatrowToggle: 'cursor-pointer border-0 bg-transparent text-[11px] text-primary',
  chatrowBody: 'mt-2 text-[11px] text-muted-foreground',
  chips: 'flex flex-wrap gap-2',
  chip: 'cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 font-inherit text-[10px] text-muted-foreground whitespace-nowrap',
  chipOn: 'bg-accent font-semibold text-primary',
  shotrow:
    'flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-left font-inherit text-foreground',
  shotrowOn: 'border-primary bg-accent',
  textarea: 'block min-h-[120px] w-full resize-y rounded-lg border border-input bg-secondary px-2.5 py-1.5 font-inherit text-xs leading-normal',
  positionCard: 'block cursor-pointer focus-within:[&_.rf-ui-card]:border-primary',
  pickerItem: 'flex cursor-pointer justify-center border-0 bg-transparent p-0',
  pickerItemOn: '[&_.thumb-target]:outline [&_.thumb-target]:outline-2 [&_.thumb-target]:outline-primary [&_.thumb-target]:outline-offset-2',
};

export function stageStepClass(tone) {
  if (tone === 'current') {
    return 'font-semibold text-primary [&_.stage-dot]:bg-primary [&_.stage-label]:rounded-md [&_.stage-label]:bg-accent [&_.stage-label]:px-1.5 [&_.stage-label]:py-0.5';
  }
  if (tone === 'passed') return 'text-muted-foreground [&_.stage-dot]:bg-[var(--rf-ok)]';
  return 'text-muted-foreground [&_.stage-dot]:bg-border';
}
