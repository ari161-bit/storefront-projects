export function productImageSrc(product: { id: string; imageUrl: string | null }): string {
  return product.imageUrl || `/images/candles/${product.id}.jpg`;
}
