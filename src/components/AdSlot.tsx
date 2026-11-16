/** Espacio publicitario reservado con marcado de AdSense opcional. */

/** Formato estándar del espacio publicitario. */
export type AdSlotVariant =
  | 'tower'
  | 'tower-wide'
  | 'tower-large'
  | 'rectangle'
  | 'leaderboard'
  | 'mobile-banner';

interface AdSize {
  width: number;
  height: number;
  slot: string;
}

const AD_SIZES: Record<AdSlotVariant, AdSize> = {
  tower: { width: 120, height: 600, slot: '1234567890' },
  'tower-wide': { width: 160, height: 600, slot: '1234567891' },
  'tower-large': { width: 300, height: 600, slot: '1234567895' },
  rectangle: { width: 300, height: 250, slot: '1234567892' },
  leaderboard: { width: 728, height: 90, slot: '1234567893' },
  'mobile-banner': { width: 320, height: 100, slot: '1234567894' },
};

/** Props de `AdSlot`. */
export interface AdSlotProps {
  variant: AdSlotVariant;
  className?: string;
}

function readClient(): string {
  return (import.meta.env.VITE_ADSENSE_CLIENT ?? '').trim();
}

/** Recuadro de reserva o `ins.adsbygoogle` si hay cliente configurado. */
export function AdSlot({ variant, className = '' }: AdSlotProps) {
  const size = AD_SIZES[variant];
  const client = readClient();

  return (
    <aside
      aria-label="Espacio publicitario"
      data-ad-variant={variant}
      className={`ad-slot shrink-0 ${className}`.trim()}
    >
      <div
        className="ad-slot-frame relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-surface text-center shadow-pressed"
        style={{ width: size.width, height: size.height }}
        data-ad-reserved={client === '' ? 'true' : 'false'}
      >
        {client !== '' ? (
          <ins
            className="adsbygoogle absolute inset-0 block"
            style={{ display: 'block', width: size.width, height: size.height }}
            data-ad-client={client}
            data-ad-slot={size.slot}
            aria-hidden="true"
          />
        ) : null}
        <span className="px-2 text-sm font-semibold text-muted">
          Espacio publicitario · {size.width}×{size.height}
        </span>
      </div>
    </aside>
  );
}
