import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { LucideAngularModule, Minus, Plus, Search, Filter } from 'lucide-angular';
import { ApiService, Product } from '../../core/services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    FormsModule,
    DataViewModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    DialogModule,
    InputNumberModule,
    LucideAngularModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />

    <div class="page-header">
      <h1>Estoque</h1>
      <p>{{ filteredProducts().length }} produto(s)</p>
    </div>

    <div class="page-content">

      <!-- Filters -->
      <div class="flex gap-2 mb-4">
        <span class="p-input-icon-left flex-1">
          <lucide-icon [img]="SearchIcon" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
          <input
            pInputText
            [(ngModel)]="searchQuery"
            placeholder="Buscar produto..."
            class="w-full pl-9 text-sm"
          />
        </span>
        <p-select
          [(ngModel)]="selectedCategory"
          [options]="categoryOptions"
          placeholder="Categoria"
          [showClear]="true"
          styleClass="text-sm"
          style="min-width: 130px"
        />
      </div>

      <!-- Product List -->
      <p-dataview
        [value]="filteredProducts()"
        layout="list"
        [emptyMessage]="'Nenhum produto encontrado'"
      >
        <ng-template pTemplate="list" let-items>
          <div class="flex flex-col gap-2">
            @for (product of items; track product.id) {
              <div class="hgo-card flex items-center gap-3">

                <!-- Product Image -->
                <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  @if (product.image_url) {
                    <img
                      [src]="product.image_url"
                      [alt]="product.name"
                      class="w-full h-full object-cover"
                      (error)="onImageError($event)"
                    />
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-gray-300 text-lg">
                      📦
                    </div>
                  }
                </div>

                <!-- Product Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 truncate">{{ product.name }}</p>
                  <p class="text-xs text-gray-400">{{ product.category }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="stock-badge" [ngClass]="getStockClass(product)">
                      {{ product.current_stock }} un.
                    </span>
                    <span class="text-xs text-gray-400">
                      mín: {{ product.min_stock }}
                    </span>
                  </div>
                </div>

                <!-- Price & Actions -->
                <div class="flex flex-col items-end gap-2 flex-shrink-0">
                  <span class="text-sm font-bold text-gray-700">
                    {{ product.average_price | currency:'BRL' }}
                  </span>
                  <div class="flex items-center gap-1">
                    <p-button
                      [icon]="'pi pi-minus'"
                      size="small"
                      severity="secondary"
                      [outlined]="true"
                      [rounded]="true"
                      [loading]="isDeducting(product.id)"
                      (click)="deductStock(product)"
                    />
                    <span class="text-sm font-semibold w-6 text-center">
                      {{ product.current_stock }}
                    </span>
                    <p-button
                      [icon]="'pi pi-plus'"
                      size="small"
                      severity="success"
                      [outlined]="true"
                      [rounded]="true"
                      (click)="openAddDialog(product)"
                    />
                  </div>
                </div>

              </div>
            }
          </div>
        </ng-template>
      </p-dataview>

    </div>

    <!-- Add Stock Dialog -->
    <p-dialog
      [(visible)]="addDialogVisible"
      [modal]="true"
      [draggable]="false"
      [style]="{ width: '90vw', maxWidth: '360px' }"
      header="Adicionar ao Estoque"
    >
      @if (dialogProduct()) {
        <div class="flex flex-col gap-4 pt-2">
          <p class="text-sm text-gray-600">
            Quantas unidades de <strong>{{ dialogProduct()!.name }}</strong> deseja adicionar?
          </p>
          <p-inputnumber
            [(ngModel)]="dialogQty"
            [min]="1"
            [showButtons]="true"
            buttonLayout="horizontal"
            class="w-full"
          />
          <p-button
            label="Confirmar"
            (click)="confirmAdd()"
            class="w-full"
          />
        </div>
      }
    </p-dialog>
  `,
})
export class InventoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly messageService = inject(MessageService);

  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;

  readonly products = signal<Product[]>([]);
  readonly deductingIds = signal<Set<string>>(new Set());

  searchQuery = '';
  selectedCategory: string | null = null;
  addDialogVisible = false;
  dialogProduct = signal<Product | null>(null);
  dialogQty = 1;

  readonly categoryOptions = [
    { label: 'Mantimentos', value: 'Mantimentos' },
    { label: 'Objetos', value: 'Objetos' },
    { label: 'Limpeza', value: 'Limpeza' },
    { label: 'Higiene', value: 'Higiene' },
    { label: 'Outros', value: 'Outros' },
  ];

  readonly filteredProducts = computed(() =>
    this.products().filter((p) => {
      const matchSearch =
        !this.searchQuery ||
        p.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchCategory =
        !this.selectedCategory || p.category === this.selectedCategory;
      return matchSearch && matchCategory;
    })
  );

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.api.getProducts().subscribe({
      next: (data) => this.products.set(data),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar o estoque',
          life: 4000,
        });
      },
    });
  }

  deductStock(product: Product): void {
    if (product.current_stock <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Estoque zerado',
        detail: `${product.name} já está com estoque zerado`,
        life: 3000,
      });
      return;
    }

    const ids = new Set(this.deductingIds());
    ids.add(product.id);
    this.deductingIds.set(ids);

    this.api.deductStock(product.id, 1).subscribe({
      next: (updated) => {
        this.products.update((list) =>
          list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        );
        const idsAfter = new Set(this.deductingIds());
        idsAfter.delete(product.id);
        this.deductingIds.set(idsAfter);
      },
      error: () => {
        const idsAfter = new Set(this.deductingIds());
        idsAfter.delete(product.id);
        this.deductingIds.set(idsAfter);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível abater o estoque',
          life: 4000,
        });
      },
    });
  }

  openAddDialog(product: Product): void {
    this.dialogProduct.set(product);
    this.dialogQty = 1;
    this.addDialogVisible = true;
  }

  confirmAdd(): void {
    const product = this.dialogProduct();
    if (!product) return;
    this.addDialogVisible = false;
    // For manual add, we update directly
    this.api.updateProduct(product.id, {
      current_stock: product.current_stock + this.dialogQty,
    }).subscribe({
      next: (updated) => {
        this.products.update((list) =>
          list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Estoque atualizado',
          detail: `${this.dialogQty} un. adicionadas a ${product.name}`,
          life: 3000,
        });
      },
    });
  }

  isDeducting(productId: string): boolean {
    return this.deductingIds().has(productId);
  }

  getStockClass(product: Product): string {
    if (product.current_stock === 0) return 'out';
    if (product.current_stock <= product.min_stock) return 'low';
    return 'ok';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
