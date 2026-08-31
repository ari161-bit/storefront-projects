import { Link } from 'react-router-dom';
import type { Product } from '../types';
import StarRating from './StarRating';
import WishlistHeartButton from './WishlistHeartButton';
import { useCart } from '../context/CartContext';
import { fmtGBP } from '../utils/format';
import { productImageSrc } from '../utils/image';

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const effectivePrice = product.salePrice ?? product.price;

  return (
    <div className="group bg-ivory rounded-2xl overflow-hidden border border-espresso/8 shadow-card hover:shadow-cardHover transition-shadow duration-500">
      <Link to={`/product/${product.id}`} className="relative block aspect-[4/5] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(150deg, ${product.color}cc, ${product.color}55)` }}
        >
          <img
            src={productImageSrc(product)}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        {product.salePrice && (
          <span className="absolute top-3 left-3 text-[10px] tracking-wide uppercase bg-espressoDark text-ivory px-2.5 py-1 rounded-full">
            Sale
          </span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute top-3 left-3 mt-7 text-[10px] tracking-wide uppercase bg-ivory/90 text-espresso px-2.5 py-1 rounded-full">
            Only {product.stock} left
          </span>
        )}
        <WishlistHeartButton
          productId={product.id}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-ivory/90 flex items-center justify-center"
        />
      </Link>
      <div className="p-5">
        <StarRating rating={product.rating} count={product.ratingCount} />
        <Link to={`/product/${product.id}`}>
          <h3 className="font-serif-display text-xl mt-1.5 text-espressoDark leading-snug hover:text-champagneDark transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-espresso/55 text-xs mt-1 line-clamp-2">{product.blurb}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-espressoDark">{fmtGBP(effectivePrice)}</span>
            {product.salePrice && <span className="text-xs text-espresso/40 line-through">{fmtGBP(product.price)}</span>}
          </div>
          <button
            onClick={() => addItem({ id: product.id, name: product.name, price: effectivePrice, qty: 1 })}
            disabled={product.stock === 0}
            className="px-4 py-2 rounded-full border border-espresso/25 text-espressoDark text-[11px] uppercase tracking-wide hover:bg-espressoDark hover:text-ivory hover:border-espressoDark transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {product.stock === 0 ? 'Sold Out' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
