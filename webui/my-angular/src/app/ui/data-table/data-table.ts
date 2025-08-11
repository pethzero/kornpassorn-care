import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  type?: 'text' | 'number' | 'date' | 'badge' | 'action';
  width?: string;
  badge?: {
    severity: 'success' | 'info' | 'warning' | 'danger';
    getValue: (data: any) => string;
  };
  action?: {
    icon: string;
    label: string;
    severity?: 'primary' | 'secondary' | 'success' | 'info' | 'danger';
    action: (data: any) => void;
  }[];
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, ButtonModule, TagModule],
  template: `
    <p-card class="data-table-widget h-full">
      <ng-template pTemplate="header">
        <div class="flex justify-content-between align-items-center p-3">
          <div>
            <h3 class="m-0 text-900">{{ title }}</h3>
            <p class="text-600 mt-1 mb-0">{{ subtitle }}</p>
          </div>
          @if (showActions) {
            <div class="table-actions">
              <p-button 
                icon="pi pi-plus" 
                label="เพิ่ม" 
                size="small"
                (onClick)="onAdd()"
                [severity]="'primary'">
              </p-button>
            </div>
          }
        </div>
      </ng-template>

      <p-table 
        [value]="data" 
        [paginator]="showPaginator"
        [rows]="rowsPerPage"
        [totalRecords]="totalRecords"
        [loading]="loading"
        [sortMode]="'multiple'"
        [globalFilterFields]="getFilterFields()"
        [tableStyle]="{'min-width': '50rem'}"
        styleClass="p-datatable-sm p-datatable-gridlines">
        
        <ng-template pTemplate="header">
          <tr>
            @for (col of columns; track col.field) {
              <th [pSortableColumn]="col.sortable ? col.field : undefined">
                {{ col.header }}
                @if (col.sortable) {
                  <p-sortIcon [field]="col.field"></p-sortIcon>
                }
              </th>
            }
          </tr>
        </ng-template>
        
        <ng-template pTemplate="body" let-rowData let-rowIndex="rowIndex">
          <tr>
            @for (col of columns; track col.field) {
              <td>
                @switch (col.type) {
                  @case ('badge') {
                    @if (col.badge) {
                      <p-tag 
                        [value]="col.badge.getValue(rowData)"
                        [severity]="col.badge.severity">
                      </p-tag>
                    }
                  }
                  @case ('action') {
                    @if (col.action) {
                      <div class="flex gap-1">
                        @for (action of col.action; track action.label) {
                          <p-button 
                            [icon]="action.icon"
                            [label]="action.label"
                            size="small"
                            [severity]="action.severity || 'secondary'"
                            (onClick)="action.action(rowData)">
                          </p-button>
                        }
                      </div>
                    }
                  }
                  @case ('date') {
                    {{ formatDate(getFieldValue(rowData, col.field)) }}
                  }
                  @case ('number') {
                    {{ formatNumber(getFieldValue(rowData, col.field)) }}
                  }
                  @default {
                    {{ getFieldValue(rowData, col.field) }}
                  }
                }
              </td>
            }
          </tr>
        </ng-template>
      </p-table>

      @if (showSummary && summaryData) {
        <div class="table-summary mt-3 p-3 bg-gray-50 border-round">
          <div class="grid">
            @for (item of summaryData; track item.label) {
              <div class="col-12 md:col-6 lg:col-3">
                <div class="text-center">
                  <div class="text-xl font-bold text-primary">{{ item.value }}</div>
                  <div class="text-sm text-600">{{ item.label }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </p-card>
  `,
  styleUrl: './data-table.scss'
})
export class DataTableComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() loading: boolean = false;
  @Input() showPaginator: boolean = true;
  @Input() rowsPerPage: number = 10;
  @Input() totalRecords: number = 0;
  @Input() showActions: boolean = true;
  @Input() showSummary: boolean = false;
  @Input() summaryData: { label: string; value: string | number; }[] = [];

  @Output() add = new EventEmitter<void>();

  getFilterFields(): string[] {
    return this.columns
      .filter(col => col.type !== 'action' && col.type !== 'badge')
      .map(col => col.field);
  }

  getFieldValue(data: any, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  formatDate(value: any): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('th-TH');
  }

  formatNumber(value: any): string {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('th-TH').format(value);
  }

  onAdd() {
    this.add.emit();
  }
}
