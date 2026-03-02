import { RowData } from "@tanstack/react-table";

export interface ColumnOption {
  label: string;
  value: string;
}

// 2. On définit la structure du style dans Meta
export interface ColumnStyle {
  backgroundColor?: string;
  color?: string;
}

// 3. Extension de l'interface Meta de TanStack (plus aucun any ici)
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    type: string;
    options?: ColumnOption[];
    style?: ColumnStyle;
  }
}