import React from 'react';

type Props = React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}>;

export default function ViewLayout({ title, subtitle, right, children }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[clamp(1.1rem,3.4vw,1.8rem)] font-black tracking-tight text-slate-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}
