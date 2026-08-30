import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistContextValue {
  ids: Set<string>;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = 'lumera_wishlist_guest';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      api
        .get<string[]>('/wishlist')
        .then((res) => setIds(new Set(res.data)))
        .catch(() => setIds(new Set()));
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setIds(new Set(raw ? JSON.parse(raw) : []));
      } catch {
        setIds(new Set());
      }
    }
  }, [user]);

  function persistGuest(next: Set<string>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  async function toggle(productId: string) {
    const next = new Set(ids);
    const wasIn = next.has(productId);
    if (wasIn) next.delete(productId);
    else next.add(productId);
    setIds(next);
    showToast(wasIn ? 'Removed from wishlist' : 'Saved to wishlist');

    if (user) {
      try {
        if (wasIn) await api.delete(`/wishlist/${encodeURIComponent(productId)}`);
        else await api.post('/wishlist', { productId });
      } catch {
        setIds(ids); // revert on failure
      }
    } else {
      persistGuest(next);
    }
  }

  function has(productId: string) {
    return ids.has(productId);
  }

  return <WishlistContext.Provider value={{ ids, toggle, has }}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
