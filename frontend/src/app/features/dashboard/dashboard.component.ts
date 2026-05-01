import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { LucideAngularModule, TrendingUp, ShoppingBag, Package, AlertTriangle } from 'lucide-angular';
import { ApiService, Product, Purchase } from '../../core/services/api.service';

interface CategoryStat {
  category: string;
  total: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ChartModule,
    CardModule,
    TagModule,
    ButtonModule,
    ProgressBarModule,
    LucideAngularModule,
  ],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>{{ currentMonthLabel() }}</p>
    </div>

    <div class="page-content">

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="hgo-card">
          <div class="flex items-center gap-2 mb-1">
            <lucide-icon [img]="SpendingIcon" class="w-4 h-4 text-indigo-500" />
            <span class="text-xs text-gray-500 font-medium">Gasto no Mês</span>
          </div>
          <p class="text-xl font-bold text-gray-900">{{ monthlyTotal() | currency:'BRL' }}</p>
        </div>
        <div class="hgo-card">
          <div class="flex items-center gap-2 mb-1">
            <lucide-icon [img]="PurchasesIcon" class="w-4 h-4 text-green-500" />
            <span class="text-xs text-gray-500 font-medium">Compras</span>
          </div>
          <p class="text-xl font-bold text-gray-900">{{ purchases().length }}</p>
        </div>
        <div class="hgo-card">
          <div class="flex items-center gap-2 mb-1">
            <lucide-icon [img]="ProductsIcon" class="w-4 h-4 text-blue-500" />
            <span class="text-xs text-gray-500 font-medium">Produtos</span>
          </div>
          <p class="text-xl font-bold text-gray-900">{{ products().length }}</p>
        </div>
        <div class="hgo-card">
          <div class="flex items-center gap-2 mb-1">
            <lucide-icon [img]="AlertIcon" class="w-4 h-4 text-amber-500" />
            <span class="text-xs text-gray-500 font-medium">Estoque Baixo</span>
          </div>
          <p class="text-xl font-bold text-gray-900">{{ lowStockCount() }}</p>
        </div>
      </div>

      <!-- Category Chart -->
      @if (chartData()) {
        <div class="hgo-card mb-4">
          <h2 class="text-sm font-semibold text-gray-700 mb-3">Gastos por Categoria</h2>
          <p-chart
            type="doughnut"
            [data]="chartData()"
            [options]="chartOptions"
            height="220px"
          />
        </div>
      }

      <!-- Category Breakdown -->
      @if (categoryStats().length > 0) {
        <div class="hgo-card mb-4">
          <h2 class="text-sm font-semibold text-gray-700 mb-3">Detalhamento</h2>
          @for (stat of categoryStats(); track stat.category) {
            <div class="mb-3">
              <div class="flex justify-between text-sm mb-1">
                <span class="text-gray-600">{{ stat.category }}</span>
                <span class="font-semibold">{{ stat.total | currency:'BRL' }}</span>
              </div>
              <p-progressbar
                [value]="getCategoryPercent(stat.total)"
                [showValue]="false"
                styleClass="h-1.5"
              />
            </div>
          }
        </div>
      }

      <!-- Low Stock Alert -->
      @if (lowStockProducts().length > 0) {
        <div class="hgo-card">
          <div class="flex items-center gap-2 mb-3">
            <lucide-icon [img]="AlertIcon" class="w-4 h-4 text-amber-500" />
            <h2 class="text-sm font-semibold text-gray-700">Itens com Estoque Baixo</h2>
          </div>
          @for (product of lowStockProducts(); track product.id) {
            <div class="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p class="text-sm font-medium text-gray-800">{{ product.name }}</p>
                <p class="text-xs text-gray-400">{{ product.category }}</p>
              </div>
              <span class="stock-badge" [class]="product.current_stock === 0 ? 'out' : 'low'">
                {{ product.current_stock }}/{{ product.min_stock }}
              </span>
            </div>
          }
        </div>
      }

    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly SpendingIcon = TrendingUp;
  readonly PurchasesIcon = ShoppingBag;
  readonly ProductsIcon = Package;
  readonly AlertIcon = AlertTriangle;

  readonly products = signal<Product[]>([]);
  readonly purchases = signal<Purchase[]>([]);

  readonly now = new Date();
  readonly currentMonthLabel = signal(
    this.now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  );

  readonly monthlyTotal = computed(() =>
    this.purchases().reduce((acc, p) => acc + p.total_value, 0)
  );

  readonly lowStockCount = computed(
    () => this.products().filter((p) => p.current_stock <= p.min_stock).length
  );

  readonly lowStockProducts = computed(() =>
    this.products()
      .filter((p) => p.current_stock <= p.min_stock)
      .sort((a, b) => a.current_stock - b.current_stock)
  );

  readonly categoryStats = computed<CategoryStat[]>(() => {
    const map: Record<string, number> = {};
    for (const purchase of this.purchases()) {
      // aggregate by product category using item prices
      map['Total'] = (map['Total'] ?? 0) + purchase.total_value;
    }
    // For detailed category breakdown, we'd need to join with products
    // Here we show total per purchase origin as a simplified view
    const originMap: Record<string, number> = {};
    for (const p of this.purchases()) {
      originMap[p.origin] = (originMap[p.origin] ?? 0) + p.total_value;
    }
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];
    return Object.entries(originMap).map(([category, total], i) => ({
      category,
      total,
      color: colors[i % colors.length],
    }));
  });

  readonly chartData = computed(() => {
    const stats = this.categoryStats();
    if (stats.length === 0) return null;
    return {
      labels: stats.map((s) => s.category),
      datasets: [
        {
          data: stats.map((s) => s.total),
          backgroundColor: stats.map((s) => s.color),
          hoverBackgroundColor: stats.map((s) => s.color + 'cc'),
          borderWidth: 0,
        },
      ],
    };
  });

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { size: 11 }, padding: 16 },
      },
    },
    cutout: '70%',
  };

  ngOnInit(): void {
    this.api.getProducts().subscribe({
      next: (data) => this.products.set(data),
      error: () => {},
    });
    this.api.getPurchasesByMonth(this.now.getFullYear(), this.now.getMonth() + 1).subscribe({
      next: (data) => this.purchases.set(data),
      error: () => {},
    });
  }

  getCategoryPercent(total: number): number {
    const max = this.monthlyTotal();
    if (max === 0) return 0;
    return Math.round((total / max) * 100);
  }
}
