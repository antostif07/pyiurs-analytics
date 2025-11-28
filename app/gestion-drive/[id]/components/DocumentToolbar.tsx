import { Document } from '@/app/types/documents';
import PermissionManager from './PermissionManager';
import ExportImport from './ExportImport';

interface DocumentToolbarProps {
  document: Document;
  documentId: string;
  columns: any[];
  rows: any[];
  cellData: any[];
  showConfig: boolean;
  onShowConfigToggle: () => void;
  onAddRow: () => void;
  onPermissionsChange: (newPermissions: any) => Promise<void>;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  document,
  documentId,
  columns,
  rows,
  cellData,
  showConfig,
  onShowConfigToggle,
  onAddRow,
  onPermissionsChange
}) => {
  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex items-center space-x-3">
        <button
          onClick={onShowConfigToggle}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
            showConfig 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <span>⚙️</span>
          <span>{showConfig ? 'Masquer configuration' : 'Configurer colonnes'}</span>
        </button>

        <PermissionManager
          documentId={documentId}
          currentPermissions={document.default_permissions}
          onPermissionsChange={onPermissionsChange}
          documentOwnerId={document.created_by}
        />
      </div>
      
      <div className="flex items-center space-x-3">
        <ExportImport
          documentId={documentId}
          columns={columns}
          rows={rows}
          cellData={cellData}
        />
        
        <button
          onClick={onAddRow}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Ajouter ligne</span>
        </button>
      </div>
    </div>
  );
};