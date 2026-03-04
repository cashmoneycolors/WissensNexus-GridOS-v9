import React from 'react';

type Classy = { className?: string };

type CardProps = React.PropsWithChildren<
  Classy & React.HTMLAttributes<HTMLDivElement>
>;

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={
        'rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur ' +
        className
      }
      {...rest}
    >
      {children}
    </div>
  );
}

type BadgeProps = React.PropsWithChildren<
  Classy & React.HTMLAttributes<HTMLSpanElement>
> & {
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
};

export function Badge({ className = '', tone = 'neutral', children, ...rest }: BadgeProps) {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
      : tone === 'warn'
        ? 'border-amber-500/30 bg-amber-950/30 text-amber-200'
        : tone === 'bad'
          ? 'border-rose-500/30 bg-rose-950/30 text-rose-200'
          : 'border-slate-700/50 bg-slate-900/30 text-slate-200';

  return (
    <span
      className={
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ' +
        toneClass +
        ' ' +
        className
      }
      {...rest}
    >
      {children}
    </span>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'soft' | 'ghost';
};

export function Button({ className = '', variant = 'solid', ...rest }: ButtonProps) {
  const v =
    variant === 'ghost'
      ? 'bg-transparent hover:bg-slate-900/40 border border-slate-800/80'
      : variant === 'soft'
        ? 'bg-slate-900/40 hover:bg-slate-900/55 border border-slate-800/80'
        : 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/30';

  return (
    <button
      className={
        'rounded-full px-4 py-2 text-sm font-bold text-slate-100 transition-colors ' +
        v +
        ' ' +
        className
      }
      {...rest}
    />
  );
}
