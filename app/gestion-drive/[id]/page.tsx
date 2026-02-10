'use client';

import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentEditor } from "./hooks/useDocumentEditor";
import { EditorHeader } from "../components/editor/EditorHeader";
import SearchAndFilters from "./components/SearchAndFilters";
import DocumentGrid from "./components/DocumentGrid";
import PermissionManager from "./components/PermissionManager";
import Footer from "@/components/footer";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DocumentEditorPage() {
    const params = useParams();
    const { user } = useAuth();
    const supabase = createClient();
    const documentId = params.id as string;

    const {
        document,
        setDocument,
        columns,
        filteredRows,
        cellData,
        loading,
        saveStatus, // Récupéré du nouveau hook
        isDirty,
        saveAll,
        setSearchQuery,
        setFilters,
        setSortConfig,
        fetchDocumentData,
        subColumns,
        multilineData,
        fileAttachments
    } = useDocumentEditor(documentId);

    // Fonction de renommage intégrée pour le Header
    const updateDocumentName = useCallback(async (newName: string) => {
        if (!document) return;
        
        const { error } = await supabase
            .from('documents')
            .update({ 
                name: newName, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', documentId);

        if (!error) {
            setDocument(prev => prev ? { ...prev, name: newName } : null);
        } else {
            console.error("Erreur renommage:", error);
        }
    }, [document, documentId, supabase, setDocument]);

    const handlePermissionsChange = useCallback(async (newPermissions: any) => {
        if (!document) return;

        // 1. Mise à jour optimiste (UI instantanée)
        setDocument(prev => prev ? { ...prev, default_permissions: newPermissions } : null);

        // 2. Synchronisation Supabase
        const { error } = await supabase
            .from('documents')
            .update({ 
                default_permissions: newPermissions,
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId);

        if (error) {
            console.error("Erreur permissions:", error);
            // Optionnel : remettre l'ancienne valeur en cas d'échec
            fetchDocumentData(); 
        }
    }, [document, documentId, supabase, setDocument, fetchDocumentData]);

    if (!user || loading) return <EditorLoading />;
    if (!document) return <div className="p-20 text-center font-bold">Document introuvable.</div>;

    return (
        <div className="min-h-screen bg-[#FBFBFA] flex flex-col transition-colors duration-300">
            {/* HEADER : Navigation, Titre dynamique et Statut de synchro */}
            <EditorHeader 
                document={document} 
                saveStatus={saveStatus} 
                onSave={() => saveAll(false)} // false pour afficher le toast success
                user={user}
                updateDocumentName={updateDocumentName}
            />

            <main className="flex-1 flex flex-col min-h-0">
                {/* TOOLBAR SECONDAIRE : Filtres et Partages */}
                <div className="px-6 py-2 border-b bg-white/50 backdrop-blur-xs flex flex-col md:flex-row justify-between items-center gap-4">
                    <SearchAndFilters
                        columns={columns}
                        onSearch={setSearchQuery}
                        onFilter={setFilters}
                        onSort={setSortConfig}
                    />
                    <div className="flex items-center gap-2">
                        <PermissionManager
                            documentId={document.id}
                            currentPermissions={document.default_permissions}
                            documentOwnerId={document.created_by}
                            onPermissionsChange={handlePermissionsChange}
                        />
                    </div>
                </div>

                {/* LA GRILLE : L'espace de travail réactif */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white">
                    <DocumentGrid
                        document={document}
                        columns={columns}
                        rows={filteredRows}
                        cellData={cellData}
                        fetchDocumentData={fetchDocumentData}
                        subColumns={subColumns}
                        multilineData={multilineData}
                        fileAttachments={fileAttachments}
                    />
                </div>
            </main>

            <Footer user={user} />
        </div>
    );
}

function EditorLoading() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 bg-[#FBFBFA]">
            <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-rose-100 rounded-full" />
                <div className="absolute w-16 h-16 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-2">
                <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.3em] animate-pulse">
                    Initialisation de l'espace
                </p>
                <div className="flex gap-1">
                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" />
                </div>
            </div>
        </div>
    );
}