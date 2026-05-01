import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string;
  name: string;
  category: 'Mantimentos' | 'Objetos' | 'Limpeza' | 'Higiene' | 'Outros';
  current_stock: number;
  min_stock: number;
  average_price: number;
  image_url: string | null;
  last_purchase_date: string | null;
}

export interface PurchaseItem {
  product_id: string;
  qty: number;
  price: number;
}

export interface Purchase {
  id: string;
  date: string;
  origin: string;
  total_value: number;
  items: PurchaseItem[];
}

export interface ProcessedReceiptItem {
  raw_name: string;
  clean_name: string;
  qty: number;
  unit_price: number;
  category: string;
}

export interface ProcessedReceipt {
  market: string;
  items: ProcessedReceiptItem[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // OCR
  processReceipt(file: File): Observable<ProcessedReceipt> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ProcessedReceipt>(`${this.base}/ocr/process-receipt`, form);
  }

  // Products
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/inventory/products`);
  }

  createProduct(data: Omit<Product, 'id' | 'last_purchase_date'>): Observable<Product> {
    return this.http.post<Product>(`${this.base}/inventory/products`, data);
  }

  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/inventory/products/${id}`, data);
  }

  deductStock(id: string, qty = 1): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/inventory/products/${id}/deduct`, { qty });
  }

  // Purchases
  savePurchase(data: { origin: string; total_value: number; items: PurchaseItem[] }): Observable<Purchase> {
    return this.http.post<Purchase>(`${this.base}/inventory/purchases`, data);
  }

  getPurchasesByMonth(year: number, month: number): Observable<Purchase[]> {
    return this.http.get<Purchase[]>(`${this.base}/inventory/purchases?year=${year}&month=${month}`);
  }

  // Image discovery
  findProductImage(name: string, category: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${this.base}/images/search?name=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`
    );
  }
}
