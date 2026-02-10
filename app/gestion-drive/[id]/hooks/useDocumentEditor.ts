// app/gestion-drive/[id]/hooks/useDocumentEditor.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { CellData, Document, DocumentColumn, DocumentRow, FileAttachment, MultilineData, SubColumn } from "@/app/types/documents";
import { applyFilters } from '../../components/editor/filter-logic';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

export function useDocumentEditor(documentId: string) {
    const supabase = createClient();
    
    // --- ÉTATS DE DONNÉES ---
    const [document, setDocument] = useState<Document | null>(null);
    const [columns, setColumns] = useState<DocumentColumn[]>([]);
    const [rows, setRows] = useState<DocumentRow[]>([]);
    const [cellData, setCellData] = useState<CellData[]>([]);
    const [subColumns, setSubColumns] = useState<SubColumn[]>([]);
    const [multilineData, setMultilineData] = useState<MultilineData[]>([]);
    const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);

    // --- ÉTATS UI & RECHERCHE ---
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isDirty, setIsDirty] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({});
    const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

    // Ref pour le timer d'auto-sauvegarde
    const isInitialLoad = useRef(true);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isInitialLoad.current) {
            // On ignore le premier rendu car c'est le chargement des données depuis Supabase
            if (cellData.length > 0) isInitialLoad.current = false;
            return;
        }

        // Si les données changent, on marque comme "sale" (dirty)
        setIsDirty(true);
        setSaveStatus('dirty');
    }, [cellData]);

    // 1️⃣ INDEXATION DES CELLULES (Performance O(1))
    // On transforme l'array en Map pour éviter les .find() dans la grille
    const cellMap = useMemo(() => {
        const map = new Map<string, CellData>();
        cellData.forEach(cell => {
            map.set(`${cell.row_id}_${cell.column_id}`, cell);
        });
        return map;
    }, [cellData]);

    // 2️⃣ CHARGEMENT DES DONNÉES (Parallélisé)
    const fetchDocumentData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Phase A : Charger la structure
            const [docRes, colRes, rowRes, subColRes] = await Promise.all([
                supabase.from('documents').select('*').eq('id', documentId).single(),
                supabase.from('document_columns').select('*').eq('document_id', documentId).order('order_index'),
                supabase.from('document_rows').select('*').eq('document_id', documentId).order('order_index'),
                supabase.from('sub_columns').select('*').order('order_index')
            ]);

            if (docRes.error) throw docRes.error;
            
            setDocument(docRes.data);
            setColumns(colRes.data || []);
            setRows(rowRes.data || []);
            setSubColumns(subColRes.data || []);

            // Phase B : Charger les données des cellules
            if (rowRes.data && rowRes.data.length > 0) {
                const rowIds = rowRes.data.map((row) => row.id);
                const { data: cells, error: cellError } = await supabase
                    .from('cell_data')
                    .select('*')
                    .in('row_id', rowIds);

                if (cellError) throw cellError;
                const fetchedCells = cells || [];
                setCellData(fetchedCells);

                // Phase C : Charger les données Multiline et Fichiers (via RPC)
                const cellIds = fetchedCells.map(c => c.id);
                if (cellIds.length > 0) {
                    const [multiRes, filesRes] = await Promise.all([
                        supabase.rpc("get_multiline_by_cells", { cell_ids: cellIds }),
                        supabase.rpc("get_files_by_cells", { cell_ids: cellIds })
                    ]);
                    setMultilineData(multiRes.data || []);
                    setFileAttachments(filesRes.data || []);
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    }, [documentId, supabase]);

    // Initialisation
    useEffect(() => {
        if (documentId) fetchDocumentData();
    }, [documentId, fetchDocumentData]);

    // 3️⃣ FILTRAGE & TRI (Logique externalisée)
    const filteredRows = useMemo(() => {
        return applyFilters(rows, cellMap, searchQuery, filters, sortConfig, columns);
    }, [rows, cellMap, searchQuery, filters, sortConfig, columns]);

    // 4️⃣ LOGIQUE DE SAUVEGARDE (Upsert)
    const saveAll = useCallback(async (silent = false) => {
        if (saveStatus === 'saving') return;

        setSaveStatus('saving');
        try {
            // Sauvegarde des cellules modifiées
            const { error: cellError } = await supabase.from('cell_data').upsert(
                cellData.map(c => ({
                    id: c.id,
                    row_id: c.row_id,
                    column_id: c.column_id,
                    text_value: c.text_value,
                    number_value: c.number_value,
                    date_value: c.date_value,
                    boolean_value: c.boolean_value,
                    value_type: c.value_type,
                    updated_at: new Date().toISOString()
                })),
                { onConflict: 'id' }
            );

            if (cellError) throw cellError;

            // Sauvegarde des données multilignes
            if (multilineData.length > 0) {
                const { error: multiError } = await supabase.from('multiline_data').upsert(
                    multilineData.map(m => ({
                        id: m.id,
                        cell_data_id: m.cell_data_id,
                        sub_column_id: m.sub_column_id,
                        text_value: m.text_value,
                        number_value: m.number_value,
                        date_value: m.date_value,
                        boolean_value: m.boolean_value,
                        value_type: m.value_type,
                        order_index: m.order_index,
                        updated_at: new Date().toISOString()
                    })),
                    { onConflict: 'id' }
                );
                if (multiError) throw multiError;
            }

            setIsDirty(false);
            setSaveStatus('saved');
            if (!silent) toast.success("Données synchronisées");
        } catch (error) {
            console.error('Save error:', error);
            setSaveStatus('error');
            toast.error("Erreur lors de l'enregistrement automatique");
        }
    }, [cellData, multilineData, saveStatus, supabase]);

    // 5️⃣ AUTO-SAVE (Debounce de 2.5 secondes)
    useEffect(() => {
        if (isDirty) {
            setSaveStatus('dirty');
            
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

            autoSaveTimerRef.current = setTimeout(() => {
                saveAll(true); // true = mode silencieux
            }, 2500);
        }

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [cellData, multilineData, isDirty, saveAll]);

    // 6️⃣ ACTIONS UTILISATEUR
    const markDirty = useCallback(() => {
        setIsDirty(true);
    }, []);

    return {
        // Données
        document,
        columns,
        rows,
        cellData,
        setCellData,
        filteredRows,
        subColumns,
        multilineData,
        setMultilineData,
        fileAttachments,
        
        // États
        loading,
        saveStatus,
        isDirty,
        
        // Setters Recherche/Filtres
        setSearchQuery,
        setFilters,
        setSortConfig,
        
        // Méthodes
        saveAll,
        markDirty,
        fetchDocumentData,
        setDocument
    };
}