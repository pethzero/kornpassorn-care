import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { SmartTableConfig } from './smart-table.model';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-smart-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule
  ],
  templateUrl: './smart-table.html',
  styleUrls: ['./smart-table.scss']
})
export class SmartTableComponent {
  @Input() config!: SmartTableConfig;
  @Input() data: any[] = [];
  @Input() total = 0;
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() filterChange = new EventEmitter<string>();

  displayedColumns: string[] = [];

  ngOnInit() {
    this.displayedColumns = this.config.columns.map(col => col.field);
    if (this.config.showActions) this.displayedColumns.push('actions');
  }

  onPage(event: PageEvent) {
    this.pageChange.emit(event);
  }

  onSort(event: Sort) {
    this.sortChange.emit(event);
  }
}