import { describe, it, expect } from 'vitest';
import {
  addProduct,
  changeQuantity,
  removeProduct,
  clearCart,
  cartTotal,
  restoreCart,
} from './cart.logic';
import { Product } from './models';
const product: Product = {
  id: 1,
  name: 'Churros',
  description: 'Seis churros',
  priceCents: 350,
  category: 'clasicos',
  available: true,
  image: 'clasicos',
  portion: '6 unidades',
};
describe('carrito: operaciones y límites', () => {
  it('añade y acumula el mismo producto sin mutar el estado anterior', () => {
    const first = addProduct([], product),
      second = addProduct(first, product);
    expect(first[0].quantity).toBe(1);
    expect(second).toHaveLength(1);
    expect(second[0].quantity).toBe(2);
  });
  it('mantiene separados los productos distintos', () => {
    expect(addProduct(addProduct([], product), { ...product, id: 2 })).toHaveLength(2);
  });
  it('rechaza productos agotados y más de 99 unidades', () => {
    expect(() => addProduct([], { ...product, available: false })).toThrow();
    expect(() => addProduct([{ product, quantity: 99 }], product)).toThrow();
  });
  it('limita a 50 productos diferentes', () => {
    const lines = Array.from({ length: 50 }, (_, i) => ({
      product: { ...product, id: i + 1 },
      quantity: 1,
    }));
    expect(() => addProduct(lines, { ...product, id: 51 })).toThrow();
  });
  it('cambia cantidades y elimina al llegar a cero', () => {
    const lines = addProduct([], product);
    expect(changeQuantity(lines, 1, 3)[0].quantity).toBe(3);
    expect(changeQuantity(lines, 1, 0)).toEqual([]);
    expect(changeQuantity(lines, 999, 3)).toEqual(lines);
  });
  it('rechaza cantidades fraccionarias, negativas, infinitas y excesivas', () => {
    for (const quantity of [-1, 100, 1.5, NaN, Infinity])
      expect(() => changeQuantity([], 1, quantity)).toThrow();
  });
  it('elimina solo el artículo seleccionado y vacía todo', () => {
    const lines = [
      { product, quantity: 2 },
      { product: { ...product, id: 2 }, quantity: 3 },
    ];
    expect(removeProduct(lines, 1)).toEqual([lines[1]]);
    expect(removeProduct(lines, 9)).toEqual(lines);
    expect(clearCart()).toEqual([]);
  });
  it('calcula total exacto en céntimos incluyendo carrito vacío', () => {
    expect(
      cartTotal([
        { product, quantity: 3 },
        { product: { ...product, priceCents: 220 }, quantity: 2 },
      ]),
    ).toBe(1490);
    expect(cartTotal([])).toBe(0);
  });
  it('restaura un carrito válido', () => {
    const lines = [{ product, quantity: 3 }];
    expect(restoreCart(JSON.stringify(lines))).toEqual(lines);
  });
  it('tolera JSON roto, datos incorrectos y estados demasiado grandes', () => {
    for (const value of [
      null,
      'bad',
      '{}',
      'null',
      '42',
      JSON.stringify(Array(51).fill({ product, quantity: 1 })),
    ])
      expect(restoreCart(value)).toEqual([]);
  });
  it('descarta entradas inválidas y duplicadas sin perder las válidas', () => {
    const line = { product, quantity: 2 };
    expect(
      restoreCart(
        JSON.stringify([
          null,
          line,
          line,
          { product, quantity: -1 },
          { product: { ...product, id: 2, priceCents: -20 }, quantity: 1 },
        ]),
      ),
    ).toEqual([line]);
  });
});
