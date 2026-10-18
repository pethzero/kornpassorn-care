import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// แถบสลับหน้า สินค้า <-> ล็อตสินค้า — วางไว้บนสุดของทั้งสองหน้าให้รู้ว่าเป็นหมวดเดียวกัน
@Component({
  selector: 'app-inventory-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="inventory-tabs" aria-label="คลังสินค้า">
      <a routerLink="/inventory/products" routerLinkActive="active" class="tab">
        <i class="pi pi-tags"></i> สินค้า / ยี่ห้อ
      </a>
      <a routerLink="/inventory/lots" routerLinkActive="active" class="tab">
        <i class="pi pi-box"></i> ล็อตสินค้า / สต็อก
      </a>
    </nav>
  `,
  styles: `
    .inventory-tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0.25rem;
      background: #f1f5f9;
      border-radius: 0.75rem;
      width: fit-content;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1rem;
      border-radius: 0.6rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: #475569;
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }
    .tab:hover {
      color: #0d9488;
    }
    .tab.active {
      background: #fff;
      color: #0d9488;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }
  `,
})
export class InventoryTabsComponent {}
