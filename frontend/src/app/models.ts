export interface Product {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  available: boolean;
  image: string;
  portion: string;
}
export interface Category {
  id: string;
  name: string;
}
export interface CartLine {
  product: Product;
  quantity: number;
}
export interface User {
  id: number;
  email: string;
  createdAt?: string;
}
export interface Session {
  user: User;
  token: string;
}
export interface Order {
  id: string;
  totalCents: number;
  demo: boolean;
  message: string;
}
