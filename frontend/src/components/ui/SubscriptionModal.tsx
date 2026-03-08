import React, { useEffect, useMemo, useRef } from 'react';

type SubscriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onContinueFree?: () => void;
};

type Plan = {
  id: 'free' | 'pro';
  name: string;
  pricePrimary: string;
  priceSecondary?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaVariant: 'primary' | 'secondary';
  badge?: string;
};

type ComparisonRow = {
  label: string;
  free: string | boolean;
  pro: string | boolean;
};

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    pricePrimary: 'Rs. 0 / month',
    description: 'Access essential tourism analytics and forecasts.',
    features: [
      'Monthly Arrival Predictions (2026–2030)',
      'Daily Arrival Predictions (2026–2030)',
      'Tourist Flow Distribution',
      'Demographic Intelligence',
      'Revenue Intelligence (2026–2030)',
      'Market Source Intelligence (2026–2030)'
    ],
    ctaLabel: 'Continue Free',
    ctaVariant: 'secondary'
  },
  {
    id: 'pro',
    name: 'Pro',
    pricePrimary: 'Rs. 3,000 / month',
    priceSecondary: '$10 / month',
    description: 'Everything in Free, plus advanced intelligence tools.',
    features: [
      'Continuous ML prediction access beyond 2030',
      'AI Assistant with web-connected insights',
      'Strategic planning and scenario support',
      'Content generation assistance',
      'Chat with 2010–2025 Year in Review reports',
      'Chat with SLTDA reports for faster insight discovery'
    ],
    ctaLabel: 'Upgrade to Pro',
    ctaVariant: 'primary',
    badge: 'Most Popular'
  }
];

const comparisonRows: ComparisonRow[] = [
  { label: 'Monthly arrival predictions', free: true, pro: true },
  { label: 'Daily arrival predictions', free: true, pro: true },
  { label: 'Demographic intelligence', free: true, pro: true },
  { label: 'Revenue intelligence', free: true, pro: true },
  { label: 'Market source intelligence', free: true, pro: true },
  { label: 'Forecast window', free: '2026–2030', pro: 'Continuous' },
  { label: 'AI assistant', free: false, pro: true },
  { label: 'Web-connected insights', free: false, pro: true },
  { label: 'Report chat', free: false, pro: true }
];

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function formatCellValue(value: string | boolean): React.ReactNode {
  if (typeof value === 'boolean') {
    return (
      <span
        className={
          value
            ? 'inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300'
            : 'inline-flex items-center rounded-full bg-gray-700/40 px-2 py-0.5 text-xs font-semibold text-gray-300'
        }
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  return <span className="text-sm text-gray-200">{value}</span>;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  onUpgrade,
  onContinueFree
}: SubscriptionModalProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const continueFreeHandler = useMemo(
    () => onContinueFree ?? onClose,
    [onContinueFree, onClose]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimeout = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((node) => !node.hasAttribute('disabled'));

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-hidden={false}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-modal-title"
        aria-describedby="subscription-modal-description"
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-700/70 bg-[#0f1115] text-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-800 px-6 py-5">
          <div>
            <h2 id="subscription-modal-title" className="text-2xl font-bold tracking-tight">
              Upgrade to Pro
            </h2>
            <p id="subscription-modal-description" className="mt-2 text-sm text-gray-300">
              Unlock continuous forecasting, AI-powered planning, and report-based insight discovery.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-[#151922] text-gray-300 transition-colors hover:bg-[#1d2330] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close subscription modal"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {plans.map((plan) => {
              const isPro = plan.id === 'pro';
              return (
                <section
                  key={plan.id}
                  className={[
                    'relative rounded-xl border p-5',
                    isPro
                      ? 'border-blue-500/70 bg-gradient-to-b from-blue-500/10 to-[#151922] shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_20px_40px_-20px_rgba(59,130,246,0.45)]'
                      : 'border-gray-700 bg-[#151922]'
                  ].join(' ')}
                >
                  {plan.badge && (
                    <span className="absolute right-4 top-4 inline-flex rounded-full border border-blue-400/40 bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-200">
                      {plan.badge}
                    </span>
                  )}

                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <div className="text-2xl font-bold">{plan.pricePrimary}</div>
                    {plan.priceSecondary && <div className="text-xs text-gray-300">{plan.priceSecondary}</div>}
                  </div>
                  <p className="mt-3 text-sm text-gray-300">{plan.description}</p>

                  <ul className="mt-4 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-200">
                        <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={isPro ? onUpgrade : continueFreeHandler}
                    className={[
                      'mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      plan.ctaVariant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'border border-gray-600 bg-[#11161f] text-gray-100 hover:bg-[#1b2230]'
                    ].join(' ')}
                  >
                    {plan.ctaLabel}
                  </button>
                </section>
              );
            })}
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-800">
            <div className="bg-[#151922] px-4 py-3 text-sm font-semibold text-gray-100">Plan comparison</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#10151f] text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Feature</th>
                    <th className="px-4 py-3 font-medium">Free</th>
                    <th className="px-4 py-3 font-medium text-blue-300">Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-[#0f1115]">
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-sm text-gray-200">{row.label}</td>
                      <td className="px-4 py-3">{formatCellValue(row.free)}</td>
                      <td className="px-4 py-3">{formatCellValue(row.pro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-5 text-xs text-gray-400">
            Ideal for researchers, tourism planners, and decision-makers. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
