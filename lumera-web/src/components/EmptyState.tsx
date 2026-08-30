import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
}

export default function EmptyState({ icon, title, message, actionLabel, actionTo }: Props) {
  return (
    <div className="text-center py-20 px-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-beige flex items-center justify-center mb-5 text-champagneDark">
        {icon}
      </div>
      <h3 className="font-serif-display text-2xl text-espressoDark mb-2">{title}</h3>
      <p className="text-espresso/55 text-sm max-w-sm mx-auto mb-6">{message}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-block px-7 py-3 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
