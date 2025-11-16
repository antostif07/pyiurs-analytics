export interface FilterState {
  [columnId: string]: FilterValue;
}

export type FilterValue = string | NumberRangeFilter | DateRangeFilter | null;

export interface NumberRangeFilter {
  min?: number | null;
  max?: number | null;
}

export interface DateRangeFilter {
  start?: string;
  end?: string;
}
