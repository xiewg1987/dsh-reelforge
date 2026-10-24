import { attachWorkbenchUi } from './workbench-ui.jsx';
import { Alert, AlertDescription } from './components/ui/alert.jsx';
import { Badge } from './components/ui/badge.jsx';
import { Button as ShadcnButton } from './components/ui/button.jsx';
import {
  Card as ShadcnCard,
} from './components/ui/card.jsx';
import { Input as ShadcnInput } from './components/ui/input.jsx';
import { Label } from './components/ui/label.jsx';
import { Progress as ShadcnProgress } from './components/ui/progress.jsx';
import { cn } from './lib/utils.js';
import { stageStepClass, tw } from './layout-tw.js';

/**
 * RF.ui — shadcn/ui + Tailwind（样式由 build-ui PostCSS 打进 RF.TAILWIND_STYLES）。
 */
export function attachReelforgeUi(RF) {
  RF.ui = {};
  RF.cn = cn;
  RF.tw = tw;
  RF.stageStepClass = stageStepClass;

  const mapButtonVariant = (variant) => {
    if (variant === 'danger') return 'destructive';
    if (variant === 'secondary') return 'secondary';
    if (variant === 'ghost') return 'ghost';
    return 'default';
  };

  RF.Button = function Button(props) {
    const disabled = props.disabled === true;
    return (
      <ShadcnButton
        type="button"
        variant={mapButtonVariant(props.variant)}
        size={props.variant === 'primary' || props.variant === undefined ? 'lg' : 'sm'}
        className={cn(
          props.variant === 'primary' || props.variant === undefined ? 'h-10 font-semibold' : 'h-7 text-[10px]',
          disabled && 'pointer-events-none opacity-50',
        )}
        disabled={disabled}
        title={props.title}
        onClick={disabled ? undefined : props.onClick}
      >
        {props.label}
      </ShadcnButton>
    );
  };

  RF.Input = function InputField(props) {
    const state = props.state === 'error' ? 'error' : 'default';
    return (
      <div className="flex flex-col gap-1">
        {props.label === undefined ? null : (
          <Label className="text-[10px] text-muted-foreground">{props.label}</Label>
        )}
        <ShadcnInput
          className={cn(
            'h-9 bg-secondary text-xs',
            state === 'error' && 'border-destructive text-destructive focus-visible:ring-destructive',
          )}
          value={props.value ?? ''}
          placeholder={props.placeholder ?? ''}
          onChange={props.onChange}
        />
      </div>
    );
  };

  RF.Pill = function Pill(props) {
    const tone = props.tone ?? 'queued';
    const toneClass = {
      accent: 'border-transparent bg-accent text-primary',
      running: 'border-transparent bg-accent text-primary',
      ok: 'border-transparent bg-secondary text-[var(--rf-ok)]',
      done: 'border-transparent bg-secondary text-[var(--rf-ok)]',
      warn: 'border-transparent bg-secondary text-[var(--rf-warn)]',
      error: 'border-transparent bg-secondary text-destructive',
      failed: 'border-transparent bg-secondary text-destructive',
      neutral: 'border-transparent bg-secondary text-muted-foreground',
      queued: 'border-transparent bg-secondary text-muted-foreground',
    }[tone] ?? 'border-transparent bg-secondary text-muted-foreground';
    return (
      <Badge variant="outline" className={cn('rounded-md px-2.5 py-1 text-[10px] font-normal', toneClass)}>
        {props.label}
      </Badge>
    );
  };

  RF.Progress = function ProgressBar(props) {
    const ratio = Math.max(0, Math.min(1, Number(props.value ?? 0)));
    const value = Math.round(ratio * 100);
    const indicatorClass = props.tone === 'done'
      ? '[&>div]:bg-[var(--rf-ok)]'
      : (props.tone === 'failed' ? '[&>div]:bg-destructive' : '');
    return (
      <div className="relative">
        <ShadcnProgress value={value} className={cn('h-1.5', indicatorClass)} />
        {props.label === undefined ? null : (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
            {props.label}
          </span>
        )}
      </div>
    );
  };

  RF.EmptyState = function EmptyState(props) {
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

  RF.Toast = function Toast(props) {
    const tone = props.tone ?? 'info';
    const variant = tone === 'error' ? 'destructive' : 'default';
    return (
      <Alert variant={variant} className="flex flex-row items-center justify-between gap-2 py-2">
        <AlertDescription className="text-xs">{props.message}</AlertDescription>
        {props.onDismiss === undefined ? null : (
          <ShadcnButton type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={props.onDismiss}>
            ×
          </ShadcnButton>
        )}
      </Alert>
    );
  };

  RF.Card = function CardWrap(props) {
    const state = props.state === 'selected' || props.state === 'disabled' ? props.state : 'default';
    const clickable = state !== 'disabled' && typeof props.onClick === 'function';
    return (
      <ShadcnCard
        className={cn(
          'rf-ui-card flex flex-col gap-2.5 rounded-[10px] border bg-card p-3.5 shadow-none',
          state === 'selected' && 'border-primary',
          props.accent === true && 'border-l-4 border-l-primary',
          props.tone === 'warn' && 'border-[var(--rf-warn)] bg-[color-mix(in_srgb,var(--rf-warn)_10%,var(--card))]',
          props.tone === 'error' && 'border-destructive bg-destructive/10',
          props.tone === 'warn-border' && 'border-[var(--rf-warn)]',
          state === 'disabled' && 'pointer-events-none border-border/60 bg-muted text-muted-foreground',
          clickable && 'cursor-pointer',
          props.className,
        )}
        onClick={clickable ? props.onClick : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (event) => {
              if (event?.target !== event?.currentTarget) return;
              const key = event?.key;
              if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
              if (event?.preventDefault) event.preventDefault();
              props.onClick(event);
            }
            : undefined
        }
      >
        {props.children}
      </ShadcnCard>
    );
  };

  RF.SectionLabel = function SectionLabel(props) {
    return (
      <div className="my-1 text-xs text-muted-foreground">{props.children}</div>
    );
  };

  RF.MetaRow = function MetaRow(props) {
    return (
      <div className="flex gap-2 py-0.5 text-[11px]">
        <span className="shrink-0 text-muted-foreground">{props.label}</span>
        <span className="min-w-0 text-foreground/80">{props.value}</span>
      </div>
    );
  };

  attachWorkbenchUi(RF);

  RF.ui.Button = RF.Button;
  RF.ui.Input = RF.Input;
  RF.ui.Pill = RF.Pill;
  RF.ui.Progress = RF.Progress;
  RF.ui.EmptyState = RF.EmptyState;
  RF.ui.Toast = RF.Toast;
  RF.ui.Card = RF.Card;
  RF.ui.SectionLabel = RF.SectionLabel;
  RF.ui.MetaRow = RF.MetaRow;
}
