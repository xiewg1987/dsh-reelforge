import { Card } from './components/ui/card.jsx';
import { cn } from './lib/utils.js';

/**
 * 工作台复合零件 → RF.ui（纯 Tailwind + shadcn 语义色）。
 */
export function attachWorkbenchUi(RF) {
  const { tw } = RF;

  RF.ui.SectionHead = function SectionHead(title, sub) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        {sub === undefined || sub === null || sub === '' ? null : (
          <div className="text-[10px] text-muted-foreground">{sub}</div>
        )}
      </div>
    );
  };

  RF.ui.KvRow = function KvRow(label, value, state, tone, right) {
    const stateClass = {
      ok: 'text-[var(--rf-ok)]',
      warn: 'text-[var(--rf-warn)]',
      error: 'text-destructive',
      muted: 'text-muted-foreground',
    }[['ok', 'warn', 'error', 'muted'].includes(tone) ? tone : 'muted'];
    return (
      <div className="flex items-center gap-2.5">
        <span className="w-[104px] shrink-0 text-[11px] text-muted-foreground">{label}</span>
        <span className="min-w-0 flex-1 text-[11px] text-foreground">{value}</span>
        {state !== undefined && state !== null && state !== '' ? (
          <span className={cn('shrink-0 text-[11px]', stateClass)}>{state}</span>
        ) : null}
        {right !== undefined && right !== null ? right : null}
      </div>
    );
  };

  RF.ui.ChipRow = function ChipRow(items, activeIndex, onSelect, disabledTitle) {
    const list = Array.isArray(items) ? items : [];
    const usable = typeof onSelect === 'function';
    return (
      <div className={tw.chips}>
        {list.map((label, index) => (
          <button
            key={`${label}-${index}`}
            type="button"
            className={cn(tw.chip, index === activeIndex && tw.chipOn)}
            disabled={!usable}
            title={usable ? undefined : disabledTitle}
            onClick={usable ? () => onSelect(index) : undefined}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  RF.ui.Thumb = function Thumb(label, options) {
    const opts = options ?? {};
    const size = Number(opts.size) > 0 ? Number(opts.size) : 48;
    return (
      <div
        className={cn(
          'thumb-target inline-flex shrink-0 items-center justify-center rounded-lg bg-secondary text-[9px] text-muted-foreground',
          opts.picked === true && 'bg-accent text-primary',
        )}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {label}
      </div>
    );
  };

  RF.ui.Notice = function Notice(main, sub) {
    return (
      <div className="flex flex-col gap-1 rounded-[10px] border-0 bg-muted p-3">
        <div className="text-[11px] text-muted-foreground">{main}</div>
        {sub === undefined || sub === null || sub === '' ? null : (
          <div className="text-[10px] text-muted-foreground">{sub}</div>
        )}
      </div>
    );
  };

  RF.ui.PlayerBar = function PlayerBar(duration) {
    return (
      <div className="inline-flex h-8 items-center gap-2 rounded-2xl bg-secondary px-3 text-[10px] text-muted-foreground">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" />
        <span>{`0:00 / ${duration}`}</span>
      </div>
    );
  };

  RF.ui.CodeBox = function CodeBox(lines) {
    const list = Array.isArray(lines) ? lines : [];
    return (
      <div className="flex flex-col gap-1 break-all rounded-lg bg-muted p-2.5 text-[10px] text-muted-foreground">
        {list.map((line, index) => (
          <div key={`${index}`}>{line}</div>
        ))}
      </div>
    );
  };

  RF.ui.RadioInput = function RadioInput(props) {
    return (
      <input
        type="radio"
        className="h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
        name={props.name}
        value={props.value}
        checked={props.checked === true}
        disabled={props.disabled === true}
        onChange={props.onChange}
      />
    );
  };

  RF.ui.CheckboxIndicator = function CheckboxIndicator(checked) {
    return (
      <span
        className={cn(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-card',
          checked === true && 'border-primary bg-primary',
        )}
        aria-hidden
      >
        {checked === true ? <span className="h-1.5 w-1.5 rounded-sm bg-primary-foreground" /> : null}
      </span>
    );
  };

  RF.ui.Track = function Track(ratio, tone) {
    const value = Math.max(0, Math.min(1, Number(ratio) || 0));
    const fillClass = tone === 'ok'
      ? 'bg-[var(--rf-ok)]'
      : (tone === 'warn' ? 'bg-[var(--rf-warn)]' : 'bg-primary');
    return (
      <div className="h-1.5 overflow-hidden rounded-sm bg-secondary">
        <div
          className={cn('h-full rounded-sm', fillClass)}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    );
  };

  RF.ui.Stat = function Stat(caption, value, sub) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-[10px] text-muted-foreground">{caption}</div>
        <div className="text-[13px] font-semibold text-foreground">{value}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </div>
    );
  };

  RF.ui.ShotChip = function ShotChip(id, size, state, tone) {
    const dotClass = tone === 'ok'
      ? 'bg-[var(--rf-ok)]'
      : (tone === 'accent' ? 'bg-primary' : 'bg-border');
    return (
      <Card {...RF.workbenchCard({ className: 'gap-1.5 p-3' })}>
        <div className="text-[10px] text-muted-foreground">{id}</div>
        <div className="text-xs font-semibold text-foreground">{size}</div>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} />
          <span className="text-[10px] text-muted-foreground">{state}</span>
        </div>
      </Card>
    );
  };

  RF.ui.ChatSync = function ChatSync(props) {
    const t = props.t;
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const text = String(project.input?.text ?? '').trim();
    const position = String(project.runPosition ?? '');
    let message = t('rf7.chatSync.empty');
    if (chapters.length > 0) {
      message = t('rf7.chatSync.imported', {
        count: chapters.length,
        pending: position === '' ? t('rf7.chatSync.needRun') : t('rf7.chatSync.ready'),
      });
    } else if (text !== '') {
      message = t('rf7.chatSync.captured');
    }
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">{message}</div>
    );
  };

  RF.ui.EmptyState = function EmptyState(props) {
    const isError = props.tone === 'error';
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed p-4 text-center',
          isError ? 'border-destructive' : 'border-border',
        )}
      >
        <div className="text-xs font-medium text-foreground">{props.title}</div>
        {props.hint === undefined ? null : (
          <div className="mt-1 text-[11px] text-muted-foreground">{props.hint}</div>
        )}
        {props.action === undefined || props.action === null ? null : (
          <div className="mt-3 flex justify-center">{props.action}</div>
        )}
      </div>
    );
  };

  RF.ui.FieldBox = function FieldBox(text, kind) {
    const muted = kind === 'placeholder' || kind === 'masked';
    return (
      <div
        className={cn(
          'flex min-h-8 items-center rounded-lg bg-secondary px-2.5 py-1.5 text-[11px]',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {text}
      </div>
    );
  };
}
