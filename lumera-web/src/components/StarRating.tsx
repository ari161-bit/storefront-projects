interface Props {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
}

export default function StarRating({ rating, count, size = 'sm' }: Props) {
  const textSize = size === 'md' ? 'text-base' : 'text-xs';
  if (!rating || rating <= 0) {
    return <span className={`${textSize} text-espresso/40`}>New</span>;
  }
  return (
    <span className={`${textSize} inline-flex items-center gap-1 text-champagneDark`}>
      <span>
        {'★★★★★'.split('').map((_, i) => (
          <span key={i} className={i < Math.round(rating) ? '' : 'text-espresso/20'}>
            ★
          </span>
        ))}
      </span>
      {count !== undefined && <span className="text-espresso/40">({count})</span>}
    </span>
  );
}
