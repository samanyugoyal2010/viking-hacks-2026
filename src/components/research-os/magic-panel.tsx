import type { CSSProperties, ReactNode } from "react";
import styles from "./magic-panel.module.css";
import { cn } from "@/lib/utils";

type MagicPanelProps = {
  gradient: string;
  accent: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function MagicPanel({
  gradient,
  accent,
  children,
  className,
  innerClassName,
}: MagicPanelProps) {
  const cssVars = {
    "--background": gradient,
    "--accent": accent,
  } as CSSProperties;

  return (
    <div className={cn(styles.panel, className)} style={cssVars}>
      <div className={cn(styles.inner, innerClassName)}>{children}</div>
    </div>
  );
}
