'use client'
import { useCallback, useEffect, useState } from "react";
import DocumentEditorHeader from "./components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { CellData, Document, DocumentColumn, DocumentRow, FileAttachment, MultilineData, SubColumn } from "@/app/types/documents";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Footer from "@/components/footer";
import DocumentGrid from "./components/DocumentGrid";

export default function DocumentEditor() {
    const params = useParams()
    const router = useRouter();
    const documentId = params.id as string;
    const [darkMode, setDarkMode] = useState(false);
    const [document, setDocument] = useState<Document | null>(null);
    const [columns, setColumns] = useState<DocumentColumn[]>([]);
    const [rows, setRows] = useState<DocumentRow[]>([]);
    const [cellData, setCellData] = useState<CellData[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, profile, loading: authLoading } = useAuth();
    const [subColumns, setSubColumns] = useState<SubColumn[]>([]);
    const [multilineData, setMultilineData] = useState<MultilineData[]>([]);
    const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);

    useEffect(() => {
        if (!authLoading && !user) {
          router.push('/login');
        }
      }, [user, authLoading, router]);
      
    const updateDocumentName = async () => {
        if (!document) return;

        try {
            const newName = document.editName || document.name;
            
            const { error } = await supabase
            .from('documents')
            .update({ 
                name: newName,
                updated_at: new Date().toISOString()
            } as never)
            .eq('id', documentId);

            if (error) throw error;

            // Mettre à jour localement
            setDocument(prev => prev ? {
            ...prev, 
            name: newName,
            isEditing: false,
            editName: '',
            updated_at: new Date().toISOString()
            } : null);

        } catch (error) {
            console.error('Error updating document name:', error);
            alert('Erreur lors du renommage du document.');
        }
    };

    const fetchDocumentData = useCallback(async () => {
        try {
            setLoading(true);
    
            // 1. Fetch document
            const { data: docData, error: docError } = await supabase
                .from('documents')
                .select('*')
                .eq('id', documentId)
                .single();
    
            if (docError) throw docError;
            setDocument(docData);
    
            // 2. Fetch columns
            const { data: columnsData, error: columnsError } = await supabase
                .from('document_columns')
                .select('*')
                .eq('document_id', documentId)
                .order('order_index', { ascending: true });
    
            if (columnsError) throw columnsError;
            setColumns(columnsData || []);
    
            // 3. Fetch rows
            const { data: rowsData, error: rowsError } = await supabase
                .from('document_rows')
                .select('*')
                .eq('document_id', documentId)
                .order('order_index');
    
            if (rowsError) throw rowsError;
            setRows(rowsData || []);
    
            // 4. Fetch Sub Columns
            const { data: subColsData, error: subColsError } = await supabase
                .from('sub_columns')
                .select('*')
                .order('order_index');
            
            if (subColsError) throw subColsError;
            setSubColumns(subColsData || []);

            // --- CORRECTION ICI : Utilisation de variables locales ---
            
            let fetchedCellData: CellData[] = [];

            // 5. Fetch cell data
            if (rowsData && rowsData.length > 0) {
                const { data: cells, error: cellError } = await supabase
                .from('cell_data')
                .select('*')
                .in('row_id', rowsData.map((row: DocumentRow) => row.id)); // Typage explicite
    
                if (cellError) throw cellError;
                
                fetchedCellData = cells || [];
                setCellData(fetchedCellData); // Mise à jour du state
            } else {
                setCellData([]);
            }

            // 6. Fetch Multiline Data (En utilisant la variable locale fetchedCellData)
            if (fetchedCellData.length > 0) {
                const { data: multiData, error: multiError } = await supabase
                    .from('multiline_data')
                    .select('*')
                    .in('cell_data_id', fetchedCellData.map(c => c.id));
                    
                if (multiError) throw multiError;
                setMultilineData(multiData || []);
            } else {
                setMultilineData([]);
            }

            // 7. Fetch File Attachments (NOUVEAU)
            if (fetchedCellData.length > 0) { // On réutilise fetchedCellData de l'étape 5
                const { data: filesData, error: filesError } = await supabase
                    .from('file_attachments')
                    .select('*')
                    .in('cell_data_id', fetchedCellData.map(c => c.id));
                
                if (filesError) throw filesError;
                setFileAttachments(filesData || []);
            } else {
                setFileAttachments([]);
            }
        } catch (error) {
          console.error('Error fetching document data:', error);
        } finally {
          setLoading(false);
        }
      }, [documentId, user]);
    
    useEffect(() => {
        if (documentId && user) {
        fetchDocumentData();
        }
    }, [documentId, user, fetchDocumentData]);

    if (!user || !document) {
        return null;
    }
    
    const isOwner = user.id === document.created_by;

    return (
        <div
        className={`${darkMode ? 'dark' : ''} min-h-screen bg-gradient-to-br 
        from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 
        transition-colors grid grid-rows-[auto_1fr_auto]`}
        >
            <DocumentEditorHeader
                document={document}
                handleDocument={setDocument}
                updateDocumentName={updateDocumentName}
                isOwner={isOwner}
                setDarkMode={setDarkMode}
                darkMode={darkMode}
                user={user}
                profile={profile}
            />
            <div className="min-h-0 overflow-auto flex">
                <DocumentGrid
                    document={document}
                    columns={columns}
                    rows={rows}
                    cellData={cellData}
                    fetchDocumentData={fetchDocumentData}
                    subColumns={subColumns}
                    multilineData={multilineData}
                    fileAttachments={fileAttachments}
                />
            </div>
            <Footer user={user} />
        </div>
    )
}