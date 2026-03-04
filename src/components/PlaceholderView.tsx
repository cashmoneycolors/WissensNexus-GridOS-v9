import React from 'react';
import ViewLayout from './ViewLayout';
import { Card } from './ui';

type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export default function PlaceholderView({ title, subtitle, children }: Props) {
  return (
    <ViewLayout title={title} subtitle={subtitle}>
      <Card className="p-4">
        <div className="text-sm text-slate-200">
          {children ?? (
            <div className="space-y-2">
              <div className="font-bold">Bereit für Ausbau</div>
              <div className="text-slate-400">
                Dieser Screen ist absichtlich kompakt (keine riesigen px-Werte) und passt auf Desktop/Tablet/Smartphone.
              </div>
            </div>
          )}
        </div>
      </Card>
    </ViewLayout>
  );
}
