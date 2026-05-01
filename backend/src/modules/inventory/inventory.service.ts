import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CreateProductDto } from './dto/create-product.dto';
import { SavePurchaseDto } from './dto/save-purchase.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private db: admin.firestore.Firestore;

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    this.db = admin.firestore();
  }

  async getAllProducts() {
    const snapshot = await this.db.collection('products').orderBy('name').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getProductById(id: string) {
    const doc = await this.db.collection('products').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Product ${id} not found`);
    return { id: doc.id, ...doc.data() };
  }

  async createProduct(dto: CreateProductDto) {
    const data = {
      ...dto,
      last_purchase_date: null,
      image_url: dto.image_url ?? null,
      created_at: FieldValue.serverTimestamp(),
    };
    const ref = await this.db.collection('products').add(data);
    return { id: ref.id, ...data };
  }

  async updateProduct(id: string, dto: Partial<CreateProductDto>) {
    const ref = this.db.collection('products').doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException(`Product ${id} not found`);
    await ref.update({ ...dto, updated_at: FieldValue.serverTimestamp() });
    return { id, ...doc.data(), ...dto };
  }

  async deductStock(id: string, qty: number = 1) {
    const ref = this.db.collection('products').doc(id);
    await ref.update({ current_stock: FieldValue.increment(-qty) });
    const updated = await ref.get();
    return { id, ...updated.data() };
  }

  async savePurchase(dto: SavePurchaseDto) {
    // Duplicate check: same origin + total_value within same day
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.db
      .collection('purchases')
      .where('origin', '==', dto.origin)
      .where('total_value', '==', dto.total_value)
      .where('date', '>=', today)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictException('Duplicate purchase detected (same origin, value, and date)');
    }

    // Read existing products to compute weighted average prices
    const productSnapshots = await Promise.all(
      dto.items.map((item) =>
        this.db.collection('products').doc(item.product_id).get(),
      ),
    );

    const batch = this.db.batch();

    const purchaseRef = this.db.collection('purchases').doc();
    const purchaseData = {
      date: dto.date ?? today,
      origin: dto.origin,
      total_value: dto.total_value,
      items: dto.items,
      created_at: FieldValue.serverTimestamp(),
    };
    batch.set(purchaseRef, purchaseData);

    // Increment stock for each item; compute weighted average_price
    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const productRef = this.db.collection('products').doc(item.product_id);
      const snap = productSnapshots[i];

      let weightedAvgPrice = item.price;
      if (snap.exists) {
        const current = snap.data()!;
        const currentStock: number = current['current_stock'] ?? 0;
        const prevAvg: number = current['average_price'] ?? item.price;
        const newStock = currentStock + item.qty;
        weightedAvgPrice =
          newStock > 0
            ? (currentStock * prevAvg + item.qty * item.price) / newStock
            : item.price;
      }

      // Use set with merge so the document is created if it doesn't exist yet
      batch.set(
        productRef,
        {
          current_stock: FieldValue.increment(item.qty),
          last_purchase_date: today,
          average_price: Math.round(weightedAvgPrice * 100) / 100,
        },
        { merge: true },
      );
    }

    await batch.commit();
    this.logger.log(`Purchase saved: ${purchaseRef.id} (${dto.items.length} items)`);
    return { id: purchaseRef.id, ...purchaseData };
  }

  async getPurchasesByMonth(year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const snapshot = await this.db
      .collection('purchases')
      .where('date', '>=', start)
      .where('date', '<', end)
      .orderBy('date')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}
