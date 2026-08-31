import { useState } from 'react';
import { useWishlist } from '../context/WishlistContext';

interface Props {
  productId: string;
  size?: number;
  className?: string;
}

export default function WishlistHeartButton({ productId, size = 16, className = '' }: Props) {
  const { has, toggle } = useWishlist();
  const [popping, setPopping] = useState(false);
  const active = has(productId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(productId);
    setPopping(true);
    setTimeout(() => setPopping(false), 320);
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Toggle wishlist"
      aria-pressed={active}
      className={`transition-transform duration-200 active:scale-90 ${popping ? 'scale-125' : 'scale-100'} ${className}`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? '#B0473A' : 'none'} stroke={active ? '#B0473A' : 'currentColor'} strokeWidth="1.8" className="transition-colors duration-200">
        <path d="M12 20.2s-7.4-4.6-9.8-9A5.4 5.4 0 0 1 12 6.4 5.4 5.4 0 0 1 21.8 11.2c-2.4 4.4-9.8 9-9.8 9Z" />
      </svg>
    </button>
  );
}
