import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import styles from "./magic-tool-card.module.css";

type MagicToolCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  accent: string;
};

export function MagicToolCard({
  href,
  title,
  description,
  icon: Icon,
  gradient,
  accent,
}: MagicToolCardProps) {
  const cssVars = {
    "--background": gradient,
    "--accent": accent,
  } as CSSProperties;

  return (
    <Link
      href={href}
      className="block h-full min-h-[17.5rem]"
      aria-label={`Open ${title}`}
    >
      <div className={styles.card} style={cssVars}>
        <div className={styles.cardInfo}>
          <div className={styles.iconWrap}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <p className={styles.cardTitle}>{title}</p>
          <p className={styles.cardDesc}>{description}</p>
          <span className={styles.cta}>Open →</span>
        </div>
      </div>
    </Link>
  );
}
