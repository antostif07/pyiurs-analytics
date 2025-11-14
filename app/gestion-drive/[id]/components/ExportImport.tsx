// app/documents/[id]/components/ExportImport.tsx
'use client';

import { CellData, DocumentColumn, DocumentRow } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

interface ExportImportProps {
  documentId: string;
  columns: DocumentColumn[];
  rows: DocumentRow[];
  cellData: CellData[];
}

export default function ExportImport({
  documentId,
  columns,
  rows,
  cellData
}: ExportImportProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'json'>('excel');

  const exportData = async () => {
    try {
      // Préparer les données pour l'export
      const exportData = rows.map(row => {
        const rowData: any = { ID: row.id };
        
        columns.forEach(column => {
          const cell = cellData.find(c => c.row_id === row.id && c.column_id === column.id);
          if (cell) {
            switch (cell.value_type) {
              case 'text':
                rowData[column.label] = cell.text_value;
                break;
              case 'number':
                rowData[column.label] = cell.number_value;
                break;
              case 'date':
                rowData[column.label] = cell.date_value;
                break;
              case 'boolean':
                rowData[column.label] = cell.boolean_value ? 'Oui' : 'Non';
                break;
              default:
                rowData[column.label] = '';
            }
          } else {
            rowData[column.label] = '';
          }
        });
        
        return rowData;
      });

      if (exportFormat === 'json') {
        downloadJSON(exportData);
      } else if (exportFormat === 'csv') {
        downloadCSV(exportData);
      } else {
        downloadExcel(exportData);
      }

      setShowDialog(false);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const downloadJSON = (data: any[]) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document-${documentId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          `"${String(row[header] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document-${documentId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = async (data: any[]) => {
    // Utiliser une bibliothèque comme xlsx pour Excel
    // Pour l'instant, on utilise CSV comme fallback
    downloadCSV(data);
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedData: any[] = [];

      if (file.name.endsWith('.json')) {
        importedData = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        importedData = parseCSV(text);
      }

      await processImportedData(importedData);
      event.target.value = ''; // Reset input
      setShowDialog(false);
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Erreur lors de l\'import des données');
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    }).filter(row => Object.values(row).some(v => v !== ''));
  };

  const processImportedData = async (importedData: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Créer de nouvelles lignes pour les données importées
    for (const importedRow of importedData) {
      const newOrderIndex = rows.length > 0 ? Math.max(...rows.map(r => r.order_index)) + 1 : 0;
      
      // Créer la ligne
      const { data: newRow, error: rowError } = await supabase
        .from('document_rows')
        .insert([
          {
            document_id: documentId,
            order_index: newOrderIndex,
            created_by: user.id,
            updated_by: user.id
          } as never
        ])
        .select()
        .single();

      if (rowError) throw rowError;

      // Créer les cellules
      for (const column of columns) {
        const importedValue = importedRow[column.label];
        if (importedValue !== undefined && importedValue !== '') {
          let updateData: any = { value_type: column.data_type };

          switch (column.data_type) {
            case 'number':
              updateData.number_value = parseFloat(importedValue);
              break;
            case 'date':
              updateData.date_value = new Date(importedValue).toISOString();
              break;
            case 'boolean':
              updateData.boolean_value = importedValue === 'true' || importedValue === 'Oui';
              break;
            default:
              updateData.text_value = String(importedValue);
          }

          await supabase
            .from('cell_data')
            .insert([
              {
                row_id: (newRow as DocumentRow).id,
                column_id: column.id,
                ...updateData
              } as never
            ]);
        }
      }
    }

    alert('Import terminé avec succès !');
    window.location.reload(); // Rafraîchir pour voir les nouvelles données
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        Export/Import
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Export/Import de données</h3>
            </div>

            <div className="p-4 space-y-6">
              {/* Export */}
              <div>
                <h4 className="font-medium mb-3">Exporter les données</h4>
                <div className="space-y-3">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="excel">Excel (CSV)</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                  <button
                    onClick={exportData}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Exporter
                  </button>
                </div>
              </div>

              {/* Import */}
              <div>
                <h4 className="font-medium mb-3">Importer des données</h4>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={importData}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <p className="text-sm text-gray-500">
                    Formats supportés: CSV, JSON
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}