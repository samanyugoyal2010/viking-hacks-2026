import styles from "./prism-gradient-bg.module.css";

export function PrismGradientBg() {
  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.layerA} />
      <div className={styles.layerB} />
      <div className={styles.vignette} />
    </div>
  );
}
