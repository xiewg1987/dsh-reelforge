import { attachWorkbenchUi } from './workbench-ui.jsx';
import { Alert, AlertDescription } from './components/ui/alert.jsx';
import { Badge } from './components/ui/badge.jsx';
import { Button } from './components/ui/button.jsx';
import { Card } from './components/ui/card.jsx';
import { Input } from './components/ui/input.jsx';
import { Label } from './components/ui/label.jsx';
import { Progress } from './components/ui/progress.jsx';
import { cn } from './lib/utils.js';
import { stageStepClass, tw } from './layout-tw.js';

/**
 * shadcn 原语挂 RF.Button / RF.Card …；页签 JSX 用自由变量 Button（build-client 注入）。
 * 工作台 Card 选态/色：RF.workbenchCard()；RF.ui 只留工作台复合件。
 */
export function attachReelforgeUi(RF) {
  RF.ui = {};
  RF.cn = cn;
  RF.tw = tw;
  RF.stageStepClass = stageStepClass;

  RF.Button = Button;
  RF.Input = Input;
  RF.Label = Label;
  RF.Card = Card;
  RF.Badge = Badge;
  RF.Progress = Progress;
  RF.Alert = Alert;
  RF.AlertDescription = AlertDescription;

  /** @param {string} [tone] */
  RF.statusToneClass = function statusToneClass(tone) {
    const map = {
      accent: 'border-transparent bg-accent text-primary',
      running: 'border-transparent bg-accent text-primary',
      ok: 'border-transparent bg-secondary text-[var(--rf-ok)]',
      done: 'border-transparent bg-secondary text-[var(--rf-ok)]',
      warn: 'border-transparent bg-secondary text-[var(--rf-warn)]',
      error: 'border-transparent bg-secondary text-destructive',
      failed: 'border-transparent bg-secondary text-destructive',
      neutral: 'border-transparent bg-secondary text-muted-foreground',
      queued: 'border-transparent bg-secondary text-muted-foreground',
    };
    return map[tone ?? 'queued'] ?? map.queued;
  };

  /**
   * ReelForge 工作台 Card 布局 + 可选选态/可点（shadcn Card 上 spread）。
   * @param {{
   *   state?: 'default' | 'selected' | 'disabled',
   *   tone?: 'warn' | 'error' | 'warn-border',
   *   accent?: boolean,
   *   className?: string,
   *   onClick?: (event: unknown) => void,
   * }} options
   */
  RF.workbenchCard = function workbenchCard(options) {
    const props = options ?? {};
    const state = props.state === 'selected' || props.state === 'disabled' ? props.state : 'default';
    const clickable = state !== 'disabled' && typeof props.onClick === 'function';
    return {
      className: cn(
        'rf-ui-card flex flex-col gap-2.5 rounded-[10px] border bg-card p-3.5 shadow-none',
        state === 'selected' && 'border-primary',
        props.accent === true && 'border-l-4 border-l-primary',
        props.tone === 'warn' && 'border-[var(--rf-warn)] bg-[color-mix(in_srgb,var(--rf-warn)_10%,var(--card))]',
        props.tone === 'error' && 'border-destructive bg-destructive/10',
        props.tone === 'warn-border' && 'border-[var(--rf-warn)]',
        state === 'disabled' && 'pointer-events-none border-border/60 bg-muted text-muted-foreground',
        clickable && 'cursor-pointer',
        props.className,
      ),
      onClick: clickable ? props.onClick : undefined,
      role: clickable ? 'button' : undefined,
      tabIndex: clickable ? 0 : undefined,
      onKeyDown: clickable
        ? (event) => {
          if (event?.target !== event?.currentTarget) return;
          const key = event?.key;
          if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
          if (event?.preventDefault) event.preventDefault();
          props.onClick(event);
        }
        : undefined,
    };
  };

  RF.ui.SectionLabel = function SectionLabel(props) {
    return (
      <div className="my-1 text-xs text-muted-foreground">{props.children}</div>
    );
  };

  RF.ui.MetaRow = function MetaRow(props) {
    return (
      <div className="flex gap-2 py-0.5 text-[11px]">
        <span className="shrink-0 text-muted-foreground">{props.label}</span>
        <span className="min-w-0 text-foreground/80">{props.value}</span>
      </div>
    );
  };

  attachWorkbenchUi(RF);
}
