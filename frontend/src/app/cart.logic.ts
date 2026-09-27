import { CartLine, Product } from './models';
export const CART_KEY = 'churreria.cart.v1';
export function addProduct(lines: CartLine[], product: Product): CartLine[] {
  if (!product.available) throw new Error('Este producto no está disponible.');
  const found = lines.find((line) => line.product.id === product.id);
  if (found && found.quantity >= 99) throw new Error('El máximo es de 99 unidades por producto.');
  if (!found && lines.length >= 50) throw new Error('El máximo es de 50 productos diferentes.');
  return found
    ? lines.map((line) =>
        line.product.id === product.id ? { product, quantity: line.quantity + 1 } : line,
      )
    : [...lines, { product, quantity: 1 }];
}
export function changeQuantity(lines: CartLine[], id: number, quantity: number): CartLine[] {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99)
    throw new Error('La cantidad debe estar entre 0 y 99.');
  return quantity === 0
    ? removeProduct(lines, id)
    : lines.map((line) => (line.product.id === id ? { ...line, quantity } : line));
}
export const removeProduct = (lines: CartLine[], id: number) =>
  lines.filter((line) => line.product.id !== id);
export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
export const clearCart = (): CartLine[] => [];
export function restoreCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 50) return [];
    const ids = new Set<number>();
    return parsed.filter((line): line is CartLine => {
      const p = line?.product;
      const valid =
        p &&
        Number.isSafeInteger(p.id) &&
        p.id > 0 &&
        !ids.has(p.id) &&
        typeof p.name === 'string' &&
        p.name.length > 0 &&
        p.name.length <= 200 &&
        typeof p.description === 'string' &&
        typeof p.category === 'string' &&
        typeof p.image === 'string' &&
        typeof p.portion === 'string' &&
        typeof p.available === 'boolean' &&
        Number.isSafeInteger(p.priceCents) &&
        p.priceCents >= 0 &&
        p.priceCents <= 1000000 &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0 &&
        line.quantity <= 99;
      if (valid) ids.add(p.id);
      return Boolean(valid);
    });
  } catch {
    return [];
  }
}
