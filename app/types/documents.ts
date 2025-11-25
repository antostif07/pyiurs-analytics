// types/documents.ts
export type DataType = 'text' | 'number' | 'date' | 'boolean' | 'file' | 'multiline' | 'select';

export interface Document {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_active: boolean;
  default_permissions: DocumentPermissions;
  theme_config: Record<string, string>;
  isEditing?: boolean;
  editName?: string;
}

export interface DocumentPermissions {
  read: PermissionRole[];
  write: PermissionRole[];
  delete: PermissionRole[];
}

export type PermissionAction = 'read' | 'write' | 'delete';
export type PermissionRole = 'all' | 'authenticated' | string; // string pour les user IDs

export interface DocumentColumn {
  id: string;
  document_id: string;
  label: string;
  data_type: DataType;
  order_index: number;
  background_color: string;
  text_color: string;
  width: number;
  permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };
  config: {
    options?: string[]; // Pour les listes déroulantes
    // Autres configurations selon le type
  };
  created_at: string;
  updated_at: string;
}

export interface SubColumn {
  id: string;
  parent_column_id: string;
  label: string;
  data_type: DataType;
  order_index: number;
  width: number;
  permissions: {
    read: string[];
    write: string[];
  };
  config: Record<string, string>;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  document_id: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CellData {
  id: string;
  row_id: string;
  column_id: string;
  text_value?: string;
  number_value?: number;
  date_value?: string;
  boolean_value?: boolean;
  value_type: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface MultilineData {
  id: string;
  cell_data_id: string;
  sub_column_id: string;
  order_index: number;
  text_value?: string;
  number_value?: number;
  date_value?: string;
  boolean_value?: boolean;
  value_type: string;
  created_at: string;
  updated_at: string;
}

export interface FileAttachment {
  id: string;
  
  // Devient nullable car un fichier peut être lié à une cellule OU une cellule multiligne
  cell_data_id: string | null; 
  
  // NOUVEAU: Le champ pour la liaison aux données multilignes, également nullable
  multiline_data_id: string | null;
  
  // Devient nullable, car il n'est pas toujours pertinent (surtout pour les multilignes)
  column_id: string | null; 
  
  file_path: string;
  file_name: string;
  file_type: string;
  
  // Il est plus sûr de le considérer comme potentiellement null
  file_size: number | null; 
  
  uploaded_by: string;
  uploaded_at: string;
  order_index: number;
  
  // Reste optionnel car c'est une propriété ajoutée côté client
  url?: string; 
}