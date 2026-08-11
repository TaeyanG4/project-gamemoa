import { type ReactNode } from "react";

export interface GameShellProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly onBack?: (() => void) | undefined;
}

export function GameShell({ title, children, onBack }: GameShellProps) {
  return (
    <div className="game-shell">
      <div className="game-shell-header">
        {onBack && (
          <button onClick={onBack} className="game-shell-back" aria-label="뒤로 가기">
            ← 뒤로
          </button>
        )}
        <h1 className="game-shell-title">{title}</h1>
      </div>
      <div className="game-shell-content">
        {children}
      </div>
    </div>
  );
}
