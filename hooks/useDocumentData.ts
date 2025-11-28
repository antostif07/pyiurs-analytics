import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Document, DocumentColumn, DocumentRow, CellData } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';

export const useDocumentData = () => {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<Document | null>(null);
  const [columns, setColumns] = useState<DocumentColumn[]>([]);
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [cellData, setCellData] = useState<CellData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocumentData = useCallback(async () => {
    if (!documentId || !user) return;

    try {
      setLoading(true);

      // Fetch document
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;
      setDocument(docData);

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('document_columns')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index', { ascending: true });

      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      // Fetch rows
      const { data: rowsData, error: rowsError } = await supabase
        .from('document_rows')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index');

      if (rowsError) throw rowsError;
      setRows(rowsData || []);

      // Fetch cell data
      if (rowsData && rowsData.length > 0) {
        const { data: cellData, error: cellError } = await supabase
          .from('cell_data')
          .select('*')
          .in('row_id', rowsData.map(row => row.id));

        if (cellError) throw cellError;
        setCellData(cellData || []);
      }
      
    } catch (error) {
      console.error('Error fetching document data:', error);
    } finally {
      setLoading(false);
    }
  }, [documentId, user]);

  const addNewRow = async () => {
    if (!user) return;

    try {
      const newOrderIndex = rows.length > 0 ? Math.max(...rows.map(r => r.order_index)) + 1 : 0;

      const { data, error } = await supabase
        .from('document_rows')
        .insert([{
          document_id: documentId,
          order_index: newOrderIndex,
          created_by: user.id,
          updated_by: user.id
        } as never])
        .select()
        .single();

      if (error) throw error;
      setRows(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding row:', error);
    }
  };

  const updateDocumentName = async (newName: string) => {
    if (!document) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', documentId);

      if (error) throw error;

      setDocument(prev => prev ? {
        ...prev, 
        name: newName,
        updated_at: new Date().toISOString()
      } : null);

    } catch (error) {
      console.error('Error updating document name:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (documentId && user) {
      fetchDocumentData();
    }
  }, [documentId, user, fetchDocumentData]);

  return {
    document,
    columns,
    rows,
    cellData,
    loading: authLoading || loading,
    user,
    documentId,
    setDocument,
    setColumns,
    setRows,
    setCellData,
    addNewRow,
    updateDocumentName,
    refetch: fetchDocumentData
  };
};