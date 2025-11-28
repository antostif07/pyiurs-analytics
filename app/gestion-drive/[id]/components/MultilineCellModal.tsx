'use client'
import { useState, useMemo, useEffect } from "react";
import { SubColumn, MultilineData } from "@/app/types/documents";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";
import { deleteSubColumn, upsertSubColumn } from "@/lib/utils/documents";
import { Plus, Settings, Upload, X, FileText, Loader2, ExternalLink } from "lucide-react"; 
import ColumnModal from "./ColumnModal";

// --- COMPOSANT INPUT ISOLÉ ---
const SubCellInput = ({ 
    initialValue, 
    type, 
    onSave 
}: { 
    initialValue: any, 
    type: string, 
    onSave: (val: any) => void 
}) => {
    const [value, setValue] = useState(initialValue ?? "");
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setValue(initialValue ?? "");
    }, [initialValue]);

    const handleBlur = () => {
        if (value !== (initialValue ?? "")) {
            onSave(value);
        }
    };

    // --------------------------------------------------------
    // 1. GESTION TYPE FILE (Upload vers Storage -> URL dans text_value)
    // --------------------------------------------------------
    if (type === 'file') {
        const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setIsUploading(true);
            try {
                // Création d'un chemin unique pour éviter les collisions
                // Ex: subcolumns/170982333_mon_fichier.pdf
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const filePath = `subcolumns/${Date.now()}_${sanitizedName}`;
                
                // 1. Upload vers le bucket Supabase (vérifie que le bucket 'documents' est public ou que tu as les droits)
                const { error: uploadError } = await supabase.storage
                    .from('files') 
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // 2. Récupération URL publique
                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);

                // 3. Sauvegarde de l'URL
                setValue(publicUrl);
                onSave(publicUrl);
            } catch (error) {
                console.error("Erreur upload:", error);
                alert("Erreur lors de l'upload du fichier.");
            } finally {
                setIsUploading(false);
            }
        };

        const handleRemoveFile = (e: React.MouseEvent) => {
            e.stopPropagation();
            if(!confirm("Supprimer le fichier ?")) return;
            // Idéalement, on pourrait aussi supprimer le fichier du storage ici
            setValue("");
            onSave(null);
        };

        // Si on a une valeur (URL), on affiche la preview comme dans EditableCell
        if (value && typeof value === 'string') {
            const fileName = value.split('/').pop()?.split('?')[0].substring(14) || "Fichier";
            
            return (
                <div className="w-full h-full flex items-center justify-between px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded group transition-all">
                    <a 
                        href={value} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs hover:underline truncate"
                        title="Ouvrir le fichier"
                    >
                        <FileText size={14} className="shrink-0" />
                        <span className="truncate">{fileName}</span>
                    </a>
                    <button 
                        onClick={handleRemoveFile}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                        <X size={14} />
                    </button>
                </div>
            );
        }

        // Sinon bouton d'upload
        return (
            <div className="w-full h-full relative group flex items-center justify-center">
                {isUploading ? (
                    <div className="flex items-center gap-2 text-xs text-blue-500">
                         <Loader2 className="animate-spin" size={14} />
                         <span>Envoi...</span>
                    </div>
                ) : (
                    <label className="cursor-pointer flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition-colors text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 w-full justify-center h-full">
                        <Upload size={14} />
                        <span className="italic">Ajouter</span>
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                )}
            </div>
        );
    }

    // --------------------------------------------------------
    // 2. GESTION TYPE BOOLEAN (Select Vrai/Faux)
    // --------------------------------------------------------
    if (type === 'boolean') {
        return (
            <select
                className="w-full h-full p-2 bg-transparent border-none outline-none dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 cursor-pointer text-sm"
                value={value === true || value === "true" ? "true" : "false"}
                onChange={(e) => {
                    const newVal = e.target.value === "true";
                    setValue(newVal);
                    onSave(newVal); // Sauvegarde immédiate pour select
                }}
            >
                <option value="false">Faux</option>
                <option value="true">Vrai</option>
            </select>
        );
    }

    // --------------------------------------------------------
    // 3. GESTION TYPE DATE
    // --------------------------------------------------------
    if (type === 'date') {
        let dateVal = "";
        try {
            if (value) dateVal = new Date(value).toISOString().split('T')[0];
        } catch (e) {}

        return (
            <input 
                className="w-full h-full p-2 bg-transparent border-none outline-none dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 text-sm"
                type="date"
                value={dateVal}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
            />
        );
    }

    // --------------------------------------------------------
    // 4. GESTION TYPE NUMBER
    // --------------------------------------------------------
    if (type === 'number') {
        return (
            <input 
                className="w-full h-full p-2 bg-transparent border-none outline-none dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 text-sm"
                value={value}
                type="number"
                step="any"
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => { if(e.key === 'Enter') handleBlur(); }}
            />
        );
    }

    // --------------------------------------------------------
    // 5. DEFAUT (TEXT)
    // --------------------------------------------------------
    return (
        <input 
            className="w-full h-full p-2 bg-transparent border-none outline-none dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 text-sm"
            value={value}
            type="text"
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if(e.key === 'Enter') handleBlur(); }}
        />
    );
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    parentCellId: string;
    subColumns: SubColumn[];
    existingData: MultilineData[];
    parentColumnDefinitionId: string
}

export default function MultilineCellModal({ 
    isOpen, onClose, parentCellId, subColumns, existingData, parentColumnDefinitionId
}: Props) {
    const [mounted, setMounted] = useState(false);
    
    // Etat local (Optimistic UI)
    const [localData, setLocalData] = useState<MultilineData[]>(existingData);

    const [isColModalOpen, setIsColModalOpen] = useState(false);
    const [editingSubCol, setEditingSubCol] = useState<SubColumn | null>(null);
    const [isSubmittingCol, setIsSubmittingCol] = useState(false);

    useEffect(() => {
        setMounted(true);
        setLocalData(existingData);
    }, [existingData]); 
    
    // Organisation des données par ligne (Order Index)
    const rowsData = useMemo(() => {
        const rows: Record<number, Record<string, any>> = {};
        localData.forEach(d => {
            if (!rows[d.order_index]) rows[d.order_index] = {};
            rows[d.order_index][d.sub_column_id] = d; 
        });
        return rows;
    }, [localData]);

    const rowIndexes = Object.keys(rowsData).map(Number).sort((a, b) => a - b);
    const maxIndex = rowIndexes.length > 0 ? Math.max(...rowIndexes) : -1;

    if (!isOpen || !mounted) return null;

    // --- MISE A JOUR DES DONNÉES ---
    const handleUpdateSubCell = async (orderIndex: number, subCol: SubColumn, value: any) => {
        // 1. Déterminer où stocker la valeur selon le type
        const payload: any = {
            cell_data_id: parentCellId,
            sub_column_id: subCol.id,
            order_index: orderIndex,
            value_type: subCol.data_type,
            updated_at: new Date().toISOString(),
            // On reset les autres valeurs pour éviter la confusion
            text_value: null, number_value: null, date_value: null, boolean_value: null
        };

        if (subCol.data_type === 'number') payload.number_value = value === "" ? null : Number(value);
        else if (subCol.data_type === 'boolean') payload.boolean_value = value === true || value === 'true';
        else if (subCol.data_type === 'date') payload.date_value = value;
        // Pour TEXT et FILE (URL), on utilise text_value
        else payload.text_value = value; 

        // 2. Mise à jour Locale (Optimiste)
        setLocalData(prev => {
            const filtered = prev.filter(d => !(d.order_index === orderIndex && d.sub_column_id === subCol.id));
            // On ajoute un faux ID temporaire pour React keys
            return [...filtered, { ...payload, id: "temp_" + Date.now() } as MultilineData];
        });

        try {
            // 3. Envoi Supabase
            const { error } = await supabase
                .from('multiline_data')
                .upsert(payload, { onConflict: 'cell_data_id, sub_column_id, order_index' });
            
            if (error) throw error;
        } catch (e) {
            console.error("Erreur update multiline", e);
            // Ici vous pourriez ajouter un toast d'erreur ou rollback
        }
    };

    const handleAddRow = async () => {
        if (subColumns.length === 0) return;
        // Initialise la première colonne de la nouvelle ligne
        await handleUpdateSubCell(maxIndex + 1, subColumns[0], "");
    };
    
    const handleDeleteRow = async (index: number) => {
        if(!confirm("Supprimer cette sous-ligne ?")) return;
        
        setLocalData(prev => prev.filter(d => d.order_index !== index));
        await supabase.from('multiline_data')
            .delete()
            .eq('cell_data_id', parentCellId)
            .eq('order_index', index);
    };

    // --- GESTION DES COLONNES (STRUCTURE) ---
    const handleSaveSubColumn = async (colData: any) => {
        setIsSubmittingCol(true);
        try {
            const parentColId = parentColumnDefinitionId || (subColumns.length > 0 ? subColumns[0].parent_column_id : "");
            await upsertSubColumn(parentColId, colData, subColumns);
            alert("Structure mise à jour. Veuillez fermer et rouvrir pour voir les changements."); 
            setIsColModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la sauvegarde de la colonne.");
        } finally {
            setIsSubmittingCol(false);
        }
    };

    const handleDeleteSubColumn = async (id: string) => {
        if(!confirm("Supprimer cette colonne ?")) return;
        try {
            await deleteSubColumn(id);
            setIsColModalOpen(false);
        } catch(e) { alert("Erreur suppression"); }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                         <div>
                             <h3 className="font-bold text-lg dark:text-white leading-none">Détails de la cellule</h3>
                             <p className="text-xs text-gray-500 mt-1">Édition des données multi-lignes</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        Fermer
                    </button>
                </div>

                {/* Body Table */}
                <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 relative">
                    <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="border-b border-r bg-gray-100 dark:bg-gray-800 dark:border-gray-700 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">#</th>
                                {subColumns.map(col => (
                                    <th key={col.id} className="border-b border-r p-3 bg-gray-100 dark:bg-gray-800 dark:border-gray-700 text-left group min-w-[180px] relative dark:text-gray-300">
                                        <div className="flex justify-between items-center text-sm font-semibold">
                                            <span>{col.label}</span>
                                            <button 
                                                onClick={() => { setEditingSubCol(col); setIsColModalOpen(true); }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 transition-all"
                                                title="Configurer la colonne"
                                            >
                                                <Settings size={14} />
                                            </button>
                                        </div>
                                        <div className="text-[10px] font-medium text-blue-500/80 mt-1 uppercase tracking-wide flex items-center gap-1">
                                            {col.data_type === 'file' && <FileText size={10} />}
                                            {col.data_type}
                                        </div>
                                    </th>
                                ))}
                                <th className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 w-14 text-center">
                                    <button 
                                        onClick={() => { setEditingSubCol(null); setIsColModalOpen(true); }}
                                        className="text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 rounded-full transition-colors"
                                        title="Ajouter une colonne"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowIndexes.map((idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 group/row transition-colors">
                                    <td className="border-b border-r p-2 text-center text-gray-400 dark:border-gray-700 text-xs font-mono select-none bg-gray-50/50 dark:bg-gray-800/20">{idx + 1}</td>
                                    {subColumns.map(col => {
                                        const cellData = rowsData[idx]?.[col.id];
                                        // Récupération de la valeur brute selon la colonne DB
                                        let val = cellData?.text_value ?? cellData?.number_value ?? cellData?.date_value ?? "";
                                        if (col.data_type === 'boolean') val = cellData?.boolean_value;

                                        return (
                                            <td key={col.id} className="border-b border-r p-0 dark:border-gray-700 h-11 relative bg-white dark:bg-gray-900">
                                                <div className="absolute inset-0 m-0.5">
                                                    <SubCellInput 
                                                        initialValue={val}
                                                        type={col.data_type}
                                                        onSave={(newValue) => handleUpdateSubCell(idx, col, newValue)}
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="border-b p-2 text-center dark:border-gray-700">
                                        <button 
                                            onClick={() => handleDeleteRow(idx)} 
                                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-all"
                                            title="Supprimer la ligne"
                                        >
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            
                            {/* Empty State */}
                            {rowIndexes.length === 0 && (
                                <tr>
                                    <td colSpan={subColumns.length + 2} className="py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                                                <FileText size={24} className="opacity-50" />
                                            </div>
                                            <p className="text-sm">Aucune donnée pour le moment.</p>
                                            <p className="text-xs opacity-70">Commencez par ajouter une ligne ci-dessous.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-start">
                    <button 
                        onClick={handleAddRow} 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm text-sm font-medium transition-all transform active:scale-95"
                    >
                        <Plus size={16} /> Ajouter une ligne
                    </button>
                </div>
            </div>

            <ColumnModal
                isOpen={isColModalOpen}
                onClose={() => setIsColModalOpen(false)}
                onSave={handleSaveSubColumn}
                onDelete={editingSubCol ? () => handleDeleteSubColumn(editingSubCol.id) : undefined}
                initialData={editingSubCol}
                isSubmitting={isSubmittingCol}
                isSubColumn={true} 
            />
        </div>, document.body
    );
}