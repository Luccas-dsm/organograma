import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, LayoutDashboard, ScanLine, Package } from 'lucide-angular';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <main>
      <router-outlet />
    </main>

    <nav class="hgo-bottom-nav">
      <a routerLink="/dashboard" routerLinkActive="active">
        <lucide-icon [img]="DashboardIcon" />
        <span>Dashboard</span>
      </a>
      <a routerLink="/scanner" routerLinkActive="active">
        <lucide-icon [img]="ScannerIcon" />
        <span>Scanner</span>
      </a>
      <a routerLink="/inventory" routerLinkActive="active">
        <lucide-icon [img]="StockIcon" />
        <span>Estoque</span>
      </a>
    </nav>
  `,
})
export class LayoutComponent {
  readonly DashboardIcon = LayoutDashboard;
  readonly ScannerIcon = ScanLine;
  readonly StockIcon = Package;
}
