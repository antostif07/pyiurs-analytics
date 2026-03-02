import { CellData, DocumentColumn, DocumentRow, SubColumn } from "@/app/types/documents";
import { supabase } from "../supabase";

type ColumnInsert = Omit<DocumentColumn, 'id' | 'created_at' | 'permissions'>;
type RowInsert = Omit<DocumentRow, 'id' | 'created_at' | 'updated_at'>;
// type SubColumnInsert = Omit<SubColumn, 'id' | 'created_at' | 'updated_at'>;

// --- CELLULES ---
/**
 * Prépare les données pour Supabase en fonction du type de colonne.
 * Utilise 'unknown' pour la valeur entrante pour forcer la validation.
 */
export const prepareSupabasePayload = (
    column: DocumentColumn, 
    value: unknown
): Partial<CellData> => {
    
    // Initialisation explicite des champs à null pour écraser les anciennes valeurs
    const payload: Partial<CellData> = {
        value_type: column.data_type,
        text_value: null,
        number_value: null,
        date_value: null,
        boolean_value: null,
    };

    // Vérification stricte des valeurs nulles/vides
    if (value === null || value === undefined || value === "") {
        if (column.data_type !== 'boolean') {
            return payload;
        }
    }

    switch (column.data_type) {
        case 'number':
            const parsedNumber = Number(value);
            payload.number_value = isNaN(parsedNumber) ? null : parsedNumber;
            break;

        case 'boolean':
            // Gestion robuste des booléens (ex: venant de formulaires HTML)
            payload.boolean_value = value === true || value === "true";
            break;

        case 'date':
            if (value instanceof Date) {
                payload.date_value = value.toISOString();
            } else if (typeof value === 'string' && value.length > 0) {
                const date = new Date(value);
                payload.date_value = isNaN(date.getTime()) ? null : date.toISOString();
            }
            break;

        case 'file':
        case 'multiline':
        case 'select':
        case 'text':
        default:
            payload.text_value = value !== null ? String(value) : null;
            break;
    }

    return payload;
};

/**
 * Met à jour une cellule. Utilise 'unknown' pour la valeur car elle peut venir de n'importe quel input.
 */
export const handleCellUpdate = async (
    rowId: string, 
    columnId: string, 
    value: unknown, 
    columns: DocumentColumn[]
) => {
    const columnDef = columns.find(col => col.id === columnId);
    if (!columnDef) return;
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("No User");

    // Construction du payload partiel typé
    const updateData: Partial<CellData> = {
        ...prepareSupabasePayload(columnDef, value),
        updated_at: new Date().toISOString(),
        updated_by: user.id, // Gestion du cas où user est null
    };

    // Note: Pour l'upsert, on combine les clés primaires et les données
    const cellPayload = {
        row_id: rowId,
        column_id: columnId,
        created_by: user?.id || null,
        ...updateData
    };

    const { error } = await supabase.from('cell_data').upsert(cellPayload, { 
        onConflict: 'row_id, column_id', 
        ignoreDuplicates: false 
    });

    if (error) {
        console.error("Erreur Supabase Upsert:", error);
        throw error;
    }
    console.log(`✅ Cellule sauvegardée (Row: ${rowId})`);
};

export const deleteRow = async (rowId: string) => {
    // Suppression explicite des dépendances (si la FK n'est pas en ON DELETE CASCADE)
    const { error: cellError } = await supabase.from('cell_data').delete().eq('row_id', rowId);
    if (cellError) throw cellError;

    const { error: rowError } = await supabase.from('document_rows').delete().eq('id', rowId);
    if (rowError) throw rowError;
};

export const addRow = async (documentId: string, rows: DocumentRow[]) => {
    const maxIndex = rows.reduce((max, row) => Math.max(max, row.order_index), -1);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("No User")

    const newRow: RowInsert = {
        document_id: documentId,
        order_index: maxIndex + 1,
        created_by: user.id,
        updated_by: user.id
    };

    const { error } = await supabase.from('document_rows').insert(newRow);
    if (error) throw error;
};

// --- LOGIQUE GESTION COLONNES ---
// --- COLONNES ---
export const upsertColumn = async (documentId: string, colData: Partial<DocumentColumn>, columns: DocumentColumn[]) => {
    
    if (!colData.label || colData.label.trim() === "") {
        throw new Error("Le nom de la colonne est obligatoire.");
    }

    // Définition d'un objet de base typé sans ID
    const basePayload: Omit<DocumentColumn, 'id' | 'created_at' | 'updated_at' | 'document_id' | 'order_index' | 'permissions'> = {
        label: colData.label,
        data_type: colData.data_type || 'text',
        width: colData.width || 200,
        background_color: colData.background_color || "#ffffff",
        text_color: colData.text_color || "#000000",
        config: colData.config || {},
    };

    // UPDATE
    if (colData.id) {
        const updatePayload = {
            ...basePayload,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('document_columns')
            .update(updatePayload)
            .eq('id', colData.id);
        
        if (error) throw error;
    } 
    // CREATE
    else {
        const maxIndex = columns.reduce((max, col) => Math.max(max, col.order_index), -1);
        
        // Construction explicite de l'objet d'insertion complet
        const insertPayload: ColumnInsert = {
            document_id: documentId,
            order_index: maxIndex + 1,
            updated_at: new Date().toISOString(),
            ...basePayload
        };

        const { error } = await supabase.from('document_columns').insert(insertPayload);

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
    // Sécurité: Ne pas traiter les IDs techniques
    if (!columnId || ['actions', 'row_index', 'add_col_btn'].includes(columnId)) return;

    try {
        const { error } = await supabase
            .from('document_columns')
            .update({ 
                width: width,
                updated_at: new Date().toISOString()
            })
            .eq('id', columnId);

        if (error) throw error;
    } catch (error) {
        console.error("Erreur sauvegarde largeur:", error);
    }
};

/**
 * Sauvegarde l'ordre des colonnes après un Drag & Drop.
 */
export const saveColumnOrder = async (
    documentId: string, 
    newOrderIds: string[], 
    existingColumns: DocumentColumn[]
): Promise<void> => {
    
    // 1. Filtrer les IDs techniques qui ne sont pas en base de données
    const forbiddenIds = ['row_index', 'actions', 'add_col_btn'];
    const validIds = newOrderIds.filter(id => !forbiddenIds.includes(id));

    // 2. Construire le payload
    // On utilise map pour créer les objets et un type guard pour le filtrage
    const updates: DocumentColumn[] = validIds
        .map((colId, index) => {
            const originalCol = existingColumns.find(c => c.id === colId);

            if (!originalCol) return null;

            // On retourne l'objet complet en modifiant seulement l'index et le timestamp
            return {
                ...originalCol, // Spread pour conserver tous les champs obligatoires (NOT NULL)
                document_id: documentId,
                order_index: index,
                updated_at: new Date().toISOString()
            };
        })
        .filter((item): item is DocumentColumn => item !== null); // Type Guard pour supprimer les nulls

    if (updates.length === 0) return;

    try {
        // Upsert accepte maintenant le tableau typé sans "as any"
        const { error } = await supabase
            .from('document_columns')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;
        
        console.log("✅ Ordre des colonnes synchronisé");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'ordre :", error);
        throw error;
    }
};

/**
 * Crée ou met à jour une sous-colonne (pour les cellules multiline).
 * TPayload définit les données autorisées à l'écriture.
 */
export const upsertSubColumn = async (
    parentColumnId: string, 
    colData: Partial<SubColumn>, 
    subColumns: SubColumn[]
): Promise<void> => {
    
    // 1. Validation de base
    if (!colData.label || colData.label.trim() === "") {
        throw new Error("Le nom de la colonne est obligatoire.");
    }

    // 2. Préparation du payload commun (Champs modifiables)
    // On définit explicitement les champs pour éviter de passer des objets pollués
    const payload = {
        parent_column_id: parentColumnId,
        label: colData.label,
        data_type: colData.data_type || 'text',
        width: colData.width || 150,
        config: colData.config || {},
    };

    if (colData.id) {
        // --- LOGIQUE DE MISE À JOUR ---
        const { error } = await supabase
            .from('sub_columns')
            .update(payload) // Supabase infère le type ici si votre client est typé
            .eq('id', colData.id);

        if (error) throw error;
    } else {
        // --- LOGIQUE DE CRÉATION ---
        
        // Calcul du prochain index de manière plus lisible
        const maxIndex = subColumns.length > 0 
            ? Math.max(...subColumns.map(col => col.order_index ?? 0)) 
            : -1;

        const { error } = await supabase
            .from('sub_columns')
            .insert([{
                ...payload,
                order_index: maxIndex + 1
            }]);

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
        const newCells = originalCells.map(({ ...rest }) => ({
            ...rest,
            row_id: newRow.id
        }));
        await supabase.from('cell_data').insert(newCells);
    }
    return newRow;
};

/**
 * Duplique une colonne et toutes les données associées pour chaque ligne.
 */
export const duplicateColumn = async (columnId: string, documentId: string): Promise<void> => {
    // 1. Récupérer la colonne originale avec son type
    const { data: originalCol, error: fetchError } = await supabase
        .from('document_columns')
        .select('*')
        .eq('id', columnId)
        .single();

    if (fetchError || !originalCol) {
        throw new Error("Impossible de trouver la colonne originale");
    }

    // 2. Décaler les colonnes suivantes pour insérer la nouvelle
    // Note: Dans Supabase, l'update massif ne supporte pas l'incrémentation directe (col = col + 2)
    // via l'API JS simplement. Si vous voulez un décalage réel, il faut souvent un RPC.
    // Mais pour typer l'objet :
    const { error: shiftError } = await supabase
        .from('document_columns')
        .update({ order_index: (originalCol.order_index ?? 0) + 2 })
        .eq('document_id', documentId)
        .gt('order_index', originalCol.order_index ?? 0);

    if (shiftError) throw shiftError;

    // 3. Préparer l'insertion : On extrait ce qu'on ne veut PAS copier
    // On utilise le rest operator pour garder tout le reste (label, type, config, etc.)
    const { ...columnDataToCopy } = originalCol;

    const { data: newCol, error: newColError } = await supabase
        .from('document_columns')
        .insert([{
            ...columnDataToCopy,
            label: `${columnDataToCopy.label} (Copie)`,
            order_index: (columnDataToCopy.order_index ?? 0) + 1,
        }])
        .select()
        .single();

    if (newColError || !newCol) throw newColError;

    // 4. Copier les données des cellules (cell_data)
    const { data: originalCells, error: cellsError } = await supabase
        .from('cell_data')
        .select('*')
        .eq('column_id', columnId);

    if (cellsError) throw cellsError;

    if (originalCells && originalCells.length > 0) {
        // Pour chaque cellule, on retire l'ID original pour que Supabase en génère un nouveau
        const newCells = originalCells.map(({ ...cellRest }) => ({
            ...cellRest,
            column_id: newCol.id // On lie à la nouvelle colonne
        }));

        const { error: insertCellsError } = await supabase
            .from('cell_data')
            .insert(newCells);

        if (insertCellsError) throw insertCellsError;
    }
};