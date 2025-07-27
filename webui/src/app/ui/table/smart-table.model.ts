export interface SmartTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'custom';
  cellTemplate?: any;
}

export interface SmartTableConfig {
  columns: SmartTableColumn[];
  serverSide?: boolean;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  loading?: boolean;
  showActions?: boolean;
}