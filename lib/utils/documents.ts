import { CellData, Document, DocumentColumn, DocumentRow, SubColumn } from "@/app/types/documents";
import { supabase } from "../supabase";
import { Dispatch, SetStateAction } from "react";

// --- CELLULES ---
const prepareSupabasePayload = (column: DocumentColumn, value: any) => {
    const payload: Partial<CellData> = {
        value_type: column.data_type,
        text_value: null, number_value: null, date_value: null, boolean_value: null,
    };

    switch (column.data_type) {
        case 'number': payload.number_value = (value === "" || value === null) ? null : Number(value); break;
        case 'boolean': payload.boolean_value = value === true || value === "true"; break;
        case 'date': payload.date_value = value ? new Date(value).toISOString() : null; break;
        case 'file': payload.text_value = typeof value === 'string' ? value : null; break;
        default: payload.text_value = value === null ? null : String(value); break;
    }
    return payload;
};

export const handleCellUpdate = async (rowId: string, columnId: string, value: any, columns: DocumentColumn[]) => {
    const columnDef = columns.find(col => col.id === columnId);
    if (!columnDef) return;
    
    const { data: { user } } = await supabase.auth.getUser();

    const cellPayload = {
        row_id: rowId,
        column_id: columnId,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
        ...prepareSupabasePayload(columnDef, value),
        created_by: user?.id 
    };

    const { error } = await supabase.from('cell_data').upsert(cellPayload, { 
        onConflict: 'row_id, column_id', ignoreDuplicates: false 
    });

    if (error) {
        console.error("Erreur Supabase Upsert:", error);
        throw error;
    }
    console.log(`✅ Cellule sauvegardée (Row: ${rowId})`);
};

export const deleteRow = async (rowId: string) => {
    // 1. Supprimer cellules (si pas de cascade)
    const { error: cellError } = await supabase.from('cell_data').delete().eq('row_id', rowId);
    if (cellError) throw cellError;

    // 2. Supprimer ligne
    const { error: rowError } = await supabase.from('document_rows').delete().eq('id', rowId);
    if (rowError) throw rowError;
};

export const addRow = async (documentId: string, rows: DocumentRow[]) => {
    const maxIndex = rows.reduce((max, row) => Math.max(max, row.order_index), -1);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('document_rows').insert({
        document_id: documentId,
        order_index: maxIndex + 1,
        created_by: user?.id
    });
    if (error) throw error;
};

// --- LOGIQUE GESTION COLONNES ---
// --- COLONNES ---
export const upsertColumn = async (documentId: string, colData: Partial<DocumentColumn>, columns: DocumentColumn[]) => {
    
    // --- CORRECTION BUG : Validation ---
    if (!colData.label || colData.label.trim() === "") {
        throw new Error("Le nom de la colonne est obligatoire.");
    }

    const payload = {
        label: colData.label,
        data_type: colData.data_type || 'text',
        width: colData.width || 200,
        background_color: colData.background_color,
        text_color: colData.text_color,
        config: colData.config || {},
        updated_at: new Date().toISOString()
    };

    // UPDATE
    if (colData.id) {
        const { error } = await supabase
            .from('document_columns')
            .update(payload as any)
            .eq('id', colData.id);
        
        if (error) throw error;
    } 
    // CREATE
    else {
        // Calcul de l'index max pour mettre à la fin
        const maxIndex = columns.reduce((max, col) => Math.max(max, col.order_index), -1);
        
        const { error } = await supabase.from('document_columns').insert({
            document_id: documentId,
            ...payload,
            order_index: maxIndex + 1
        } as any);

        if (error) throw error;
    }
};

export const deleteColumn = async (columnId: string) => {
    // 1. Supprimer cellules liées
    await supabase.from('cell_data').delete().eq('column_id', columnId);
    
    // 2. Supprimer colonne
    const { error } = await supabase.from('document_columns').delete().eq('id', columnId);
    if (error) throw error;
};

export const updateColumnWidth = async (columnId: string, width: number) => {
    // On ne sauvegarde pas si c'est une colonne système (actions, index...)
    if (!columnId || columnId === 'actions' || columnId === 'row_index' || columnId === 'add_col_btn') return;

    try {
        const { error } = await supabase
            .from('document_columns')
            .update({ 
                width: width,
                updated_at: new Date().toISOString()
            } as any)
            .eq('id', columnId);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur sauvegarde largeur:", error);
    }
};

export const saveColumnOrder = async (
    documentId: string, 
    newOrderIds: string[], 
    existingColumns: DocumentColumn[] // <--- NOUVEAU PARAMÈTRE
) => {
    // 1. Filtrer les IDs valides
    const validIds = newOrderIds.filter(id => 
        id !== 'row_index' && id !== 'actions' && id !== 'add_col_btn'
    );

    // 2. Construire le payload complet pour satisfaire les contraintes NOT NULL
    const updates = validIds.map((colId, index) => {
        // On retrouve les anciennes données pour ne pas envoyer de NULL sur les champs obligatoires
        const originalCol = existingColumns.find(c => c.id === colId);

        if (!originalCol) return null;

        return {
            id: colId,
            document_id: documentId,
            order_index: index, // La seule chose qui change vraiment
            
            // On remet les anciennes valeurs obligatoires pour que l'UPSERT passe
            label: originalCol.label,
            data_type: originalCol.data_type,
            width: originalCol.width,
            background_color: originalCol.background_color,
            text_color: originalCol.text_color,
            config: originalCol.config,
            permissions: originalCol.permissions, // Important si vous avez ce champ
            
            updated_at: new Date().toISOString()
        };
    }).filter(Boolean); // On retire les nulls éventuels

    if (updates.length === 0) return;

    try {
        const { error } = await supabase
            .from('document_columns')
            .upsert(updates as any, { onConflict: 'id' });

        if (error) throw error;
        console.log("✅ Ordre sauvegardé avec succès");
    } catch (error) {
        console.error("Erreur saveColumnOrder", error);
    }
};

export const upsertSubColumn = async (parentColumnId: string, colData: Partial<SubColumn>, subColumns: SubColumn[]) => {
    if (!colData.label || colData.label.trim() === "") {
        throw new Error("Le nom de la colonne est obligatoire.");
    }

    const payload = {
        parent_column_id: parentColumnId,
        label: colData.label,
        data_type: colData.data_type || 'text',
        width: colData.width || 150, // Plus petit par défaut pour les sous-tableaux
        // Pas de couleurs pour les sous-colonnes dans votre schema actuel, mais on pourrait l'ajouter
        config: colData.config || {},
        // Pas de permissions par sous-colonne généralement
    };

    if (colData.id) {
        // UPDATE
        const { error } = await supabase
            .from('sub_columns')
            .update(payload as any)
            .eq('id', colData.id);
        if (error) throw error;
    } else {
        // CREATE
        const maxIndex = subColumns.reduce((max, col) => Math.max(max, col.order_index), -1);
        const { error } = await supabase.from('sub_columns').insert({
            ...payload,
            order_index: maxIndex + 1
        } as any);
        if (error) throw error;
    }
};

export const deleteSubColumn = async (subColumnId: string) => {
    // 1. Supprimer les données liées (multiline_data)
    await supabase.from('multiline_data').delete().eq('sub_column_id', subColumnId);
    
    // 2. Supprimer la colonne
    const { error } = await supabase.from('sub_columns').delete().eq('id', subColumnId);
    if (error) throw error;
};

export const duplicateRow = async (rowId: string, documentId: string) => {
    // 1. Trouver l'index le plus élevé pour ce document
    const { data: maxRow } = await supabase
        .from('document_rows')
        .select('order_index')
        .eq('document_id', documentId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

    const nextIndex = (maxRow?.order_index ?? 0) + 1;

    // 2. Créer la nouvelle ligne avec le nouvel index
    const { data: newRow, error: rowError } = await supabase
        .from('document_rows')
        .insert([{ 
            document_id: documentId, 
            order_index: nextIndex 
        }])
        .select()
        .single();

    if (rowError) throw rowError;

    // 3. Copier les cellules
    const { data: originalCells } = await supabase
        .from('cell_data')
        .select('*')
        .eq('row_id', rowId);

    if (originalCells && originalCells.length > 0) {
        const newCells = originalCells.map(({ id, created_at, updated_at, row_id, ...rest }) => ({
            ...rest,
            row_id: newRow.id
        }));
        await supabase.from('cell_data').insert(newCells);
    }
    return newRow;
};

/**
 * Duplique une colonne et les données qu'elle contient pour toutes les lignes
 */
export const duplicateColumn = async (columnId: string, documentId: string) => {
    const { data: originalCol } = await supabase
        .from('document_columns')
        .select('*')
        .eq('id', columnId)
        .single();

    if (!originalCol) return;

    // 1. Décaler les colonnes suivantes
    await supabase
        .from('document_columns')
        .update({ order_index: originalCol.order_index + 2 } as any) // On fait de la place
        .eq('document_id', documentId)
        .gt('order_index', originalCol.order_index);

    // 2. Insérer la nouvelle colonne
    const { data: newCol, error: newColError } = await supabase
        .from('document_columns')
        .insert([{
            ...originalCol,
            id: undefined,
            label: `${originalCol.label} (Copie)`,
            order_index: originalCol.order_index + 1,
            created_at: undefined,
            updated_at: undefined
        }])
        .select()
        .single();

    if (newColError) throw newColError;

    // 3. Copier les données (cell_data) pour chaque ligne sur cette nouvelle colonne
    const { data: originalCells } = await supabase
        .from('cell_data')
        .select('*')
        .eq('column_id', columnId);

    if (originalCells && originalCells.length > 0) {
        const newCells = originalCells.map(({ id, created_at, updated_at, column_id, ...rest }) => ({
            ...rest,
            column_id: newCol.id
        }));
        await supabase.from('cell_data').insert(newCells);
    }
};