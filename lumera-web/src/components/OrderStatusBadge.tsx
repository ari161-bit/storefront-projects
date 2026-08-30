import type { OrderStatus } from '../types';

const COLORS: Record<OrderStatus, string> = {
  Pending: 'bg-beige text-espresso/70',
  Confirmed: 'bg-champagne/30 text-champagneDark',
  Processing: 'bg-champagne/30 text-champagneDark',
  Shipped: 'bg-espresso/10 text-espressoDark',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`text-[11px] uppercase tracking-wide px-3 py-1 rounded-full ${COLORS[status] || 'bg-beige text-espresso/70'}`}>
      {status}
    </span>
  );
}
