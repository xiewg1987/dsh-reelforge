# RF7 设计令牌 → 宿主 token（档案）

| RF7 令牌 | 暗色稿 | 浅色稿 | 宿主 token |
| --- | --- | --- | --- |
| rf-bg | #0A0C10 | #F4F5F7 | --dsw-alias-bg-base（浅色 color-mix 压深） |
| rf-surface | #141820 | #FFFFFF | --dsw-alias-bg-base |
| rf-surface-2 | #10141C | #EBEDF2 | color-mix(bg-base) |
| rf-surface-3 | #1C2230 | #DDE1E8 | color-mix(bg-base) |
| rf-line | #252A34 | #D0D4DC | --dsw-alias-border-l2 |
| rf-text-1 | #EEF1F6 | #121418 | --dsw-alias-label-primary |
| rf-text-2 | #9AA3B2 | #5C6370 | --dsw-alias-label-secondary |
| rf-text-3 | #6B7380 | #8B919C | --dsw-alias-label-tertiary |
| rf-accent | #5B8DEF | #3568D4 | --dsw-alias-brand-primary-new-colorprimary-new-color |
| rf-accent-dim | #1A2744 | #E3EBFA | color-mix(accent 14%, surface) |
| rf-ok | #3DDC84 | #1F9D55 | --dsw-alias-state-success-primary |
| rf-warn | #E5A045 | #C7841A | --dsw-alias-state-warn-label |
| rf-error | #F07178 | #D92D20 | --dsw-alias-state-error-primary |
| rf-on-accent | #FFFFFF | #FFFFFF | --dsw-alias-toast-label |

实现：`workbench-layout.css`（布局/复合件）+ shadcn 语义变量（`globals.css` @layer base）。
