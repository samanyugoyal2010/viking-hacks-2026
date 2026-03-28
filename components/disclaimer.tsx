export function MedicalDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 ${className}`}
    >
      FuelScan provides estimates only and is not medical advice. Confirm portions
      and nutrition with a professional or verified sources before changing your
      diet or health plan.
    </p>
  );
}
