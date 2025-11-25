// utils/duplicateDocument.ts ou dans DocumentsPage.tsx

import { SupabaseClient } from '@supabase/supabase-js';

// Types simplifiés pour la duplication
interface DuplicateOptions {
  originalDocId: string;
  newTitle: string;
  userId: string;
  includeData: boolean;
  supabase: SupabaseClient;
}

export const duplicateDocumentProcess = async ({ 
  originalDocId, 
  newTitle, 
  userId, 
  includeData,
  supabase 
}: DuplicateOptions) => {

  // 1. Dupliquer le document principal
  const { data: originalDoc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', originalDocId)
    .single();

  if (docError) throw new Error('Document introuvable');

  const { data: newDoc, error: newDocError } = await supabase
    .from('documents')
    .insert([{
      name: newTitle,
      description: originalDoc.description,
      created_by: userId,
      is_active: true,
      default_permissions: originalDoc.default_permissions,
      theme_config: originalDoc.theme_config
    }])
    .select()
    .single();

  if (newDocError) throw newDocError;

  // 2. Dupliquer les colonnes (Structure)
  const { data: oldColumns, error: colError } = await supabase
    .from('document_columns')
    .select('*')
    .eq('document_id', originalDocId);

  if (colError) throw colError;

  // Map pour stocker la correspondance { ancien_id_colonne : nouvel_id_colonne }
  const columnMap = new Map<string, string>();

  if (oldColumns && oldColumns.length > 0) {
    const columnsToInsert = oldColumns.map(col => ({
      document_id: newDoc.id,
      label: col.label,
      data_type: col.data_type,
      order_index: col.order_index,
      background_color: col.background_color,
      text_color: col.text_color,
      width: col.width,
      permissions: col.permissions,
      config: col.config,
      created_at: new Date().toISOString()
    }));

    const { data: newColumns, error: newColError } = await supabase
      .from('document_columns')
      .insert(columnsToInsert)
      .select();

    if (newColError) throw newColError;

    // Remplir la map : on fait correspondre par order_index car l'ordre est préservé
    oldColumns.forEach(oldCol => {
      const newCol = newColumns.find(nc => nc.order_index === oldCol.order_index);
      if (newCol) columnMap.set(oldCol.id, newCol.id);
    });
  }

  // SI L'UTILISATEUR VEUT SEULEMENT LA STRUCTURE, ON S'ARRÊTE ICI
  if (!includeData) {
    return newDoc;
  }

  // 3. Dupliquer les lignes (Rows)
  const { data: oldRows, error: rowError } = await supabase
    .from('document_rows')
    .select('*')
    .eq('document_id', originalDocId);

  if (rowError) throw rowError;

  // Map pour stocker la correspondance { ancien_id_ligne : nouvel_id_ligne }
  const rowMap = new Map<string, string>();

  if (oldRows && oldRows.length > 0) {
    const rowsToInsert = oldRows.map(row => ({
      document_id: newDoc.id,
      order_index: row.order_index,
      created_by: userId,
      updated_by: userId
    }));

    const { data: newRows, error: newRowError } = await supabase
      .from('document_rows')
      .insert(rowsToInsert)
      .select();

    if (newRowError) throw newRowError;

    oldRows.forEach(oldRow => {
      const newRow = newRows.find(nr => nr.order_index === oldRow.order_index);
      if (newRow) rowMap.set(oldRow.id, newRow.id);
    });
  }

  // 4. Dupliquer les données des cellules (Cell Data)
  // On récupère toutes les cellules liées aux anciennes lignes
  if (oldRows && oldRows.length > 0) {
    const oldRowIds = oldRows.map(r => r.id);
    const { data: oldCells, error: cellError } = await supabase
      .from('cell_data')
      .select('*')
      .in('row_id', oldRowIds);

    if (cellError) throw cellError;

    if (oldCells && oldCells.length > 0) {
      // Préparer les nouvelles cellules en utilisant les MAPS
      const cellsToInsert = [];
      // On garde une trace pour les sous-données (multiline/files)
      // Structure : { oldCellId: string, tempId: number } 
      // Note: Supabase ne garantit pas l'ordre d'insertion vs retour select en batch facilement pour le mapping ID.
      // Pour faire simple et robuste, on va insérer et espérer pouvoir mapper, 
      // ou faire boucle (plus lent mais sûr).
      // Vu la complexité, on va faire une insertion boucle ou batch intelligent.
      
      // Approche séquentielle pour garantir le mapping des IDs pour les enfants (multiline/files)
      for (const oldCell of oldCells) {
        const newRowId = rowMap.get(oldCell.row_id);
        const newColId = columnMap.get(oldCell.column_id);

        if (newRowId && newColId) {
          // Insertion unitaire pour récupérer l'ID immédiatement (nécessaire pour multiline/files)
          const { data: newCell, error: insCellError } = await supabase
            .from('cell_data')
            .insert({
              row_id: newRowId,
              column_id: newColId,
              text_value: oldCell.text_value,
              number_value: oldCell.number_value,
              date_value: oldCell.date_value,
              boolean_value: oldCell.boolean_value,
              value_type: oldCell.value_type,
              created_by: userId,
              updated_by: userId
            })
            .select()
            .single();

          if (!insCellError && newCell) {
            // 5. Gérer les données enfants (Multiline / Files)
            
            // A. Multiline Data
            if (oldCell.value_type === 'multiline') {
              const { data: oldMultis } = await supabase
                .from('multiline_data')
                .select('*')
                .eq('cell_data_id', oldCell.id);
                
              if (oldMultis && oldMultis.length > 0) {
                 const multisToInsert = oldMultis.map(m => ({
                   cell_data_id: newCell.id,
                   // Note: sub_column_id doit aussi être mappé si tu utilises sub_columns
                   // Si tu n'utilises pas sub_columns pour l'instant ou si c'est null:
                   sub_column_id: m.sub_column_id, 
                   order_index: m.order_index,
                   text_value: m.text_value,
                   number_value: m.number_value,
                   date_value: m.date_value,
                   boolean_value: m.boolean_value,
                   value_type: m.value_type
                 }));
                 await supabase.from('multiline_data').insert(multisToInsert);
              }
            }

            // B. File Attachments
            if (oldCell.value_type === 'file') {
              const { data: oldFiles } = await supabase
                .from('file_attachments')
                .select('*')
                .eq('cell_data_id', oldCell.id);

              if (oldFiles && oldFiles.length > 0) {
                const filesToInsert = oldFiles.map(f => ({
                  cell_data_id: newCell.id,
                  column_id: newColId, // Le nouveau ID de colonne
                  file_path: f.file_path, // On garde la même référence fichier (attention si suppression physique)
                  file_name: f.file_name,
                  file_type: f.file_type,
                  file_size: f.file_size,
                  uploaded_by: userId,
                  order_index: f.order_index
                }));
                await supabase.from('file_attachments').insert(filesToInsert);
              }
            }
          }
        }
      }
    }
  }

  return newDoc;
};