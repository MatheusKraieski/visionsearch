export interface Supplier {
  id: string;
  name: string;
  contact: string;
  address?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  imageUrl?: string;
  supplierId: string;
  category?: string;
  tags?: string[];
}

export interface SearchResult {
  product: Product;
  supplier: Supplier;
  confidence: number;
}
