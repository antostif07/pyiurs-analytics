'use client'
import { useEffect, useRef, useState } from "react";
import { Column, Row, Table } from "@tanstack/react-table";
import { DocumentColumn, FileAttachment, MultilineData, SubColumn } from "@/app/types/documents";
import MultilineCellModal from "./MultilineCellModal";
import { Plus, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import FileAttachmentManager from "./FileAttachmentManager";
import { FilePreview } from "./FilePreview";

interface EditableCellProps {
    getValue: () => any;
    row: Row<any>;
    column: Column<any>;
    table: Table<any>;
    columns: DocumentColumn[];
    subColumns?: SubColumn[];
    allMultilineData?: MultilineData[];
    onDataChange?: () => void;
}

export const EditableCell = ({ getValue, row, column, table, columns, subColumns }: EditableCellProps) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);
    const [isMultilineOpen, setIsMultilineOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // Pour le fichier
    const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);

    const [tempCellId, setTempCellId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const columnMeta = column.columnDef.meta as any;
    const type = columnMeta?.type || "text";

    const cellStyle = {
        backgroundColor: columnMeta?.style?.backgroundColor,
        color: columnMeta?.style?.color,
    };

    const cellDataId = (row.original as any)[`${column.id}_id`];

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const attachedFiles = cellDataId 
        ? (table.options.meta as any).fileAttachments?.filter((f: FileAttachment) => f.cell_data_id === cellDataId) || []
        : [];
        
    const onBlur = () => {
        setIsEditing(false);
        // On ne sauvegarde que si la valeur a changé
        if (value !== initialValue) {
            // Appel de la fonction updateData passée dans les options de la table
            table.options.meta?.updateData(row.original.id, column.id, value, columns);
        }
    };

    const handleOpenFileModal = async () => {
        // Si la cellule n'existe pas, on la crée d'abord
        if (!cellDataId) {
            table.options.meta?.updateData(row.original.id, column.id, "", columns);
            return; 
        }
        setIsFileManagerOpen(true);
    };


    const handleRemoveFile = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("Supprimer le fichier ?")) return;
        
        setValue(null);
        table.options.meta?.updateData(row.original.id, column.id, null, columns);
        // Optionnel : Supprimer physiquement du Storage si vous voulez nettoyer
    };

    const handleFilesChange = (newFiles: FileAttachment[], deletedFileId?: string) => {
        // On demande au parent de rafraîchir les données globales
        // car FileAttachmentManager a déjà fait les insert/delete en base.
        (table.options.meta as any).refreshData();
    };

    // --- BLOC SPECIFIQUE FILE ---
    if (type === 'file') {
        // Récupération des fichiers liés
        const attachedFiles = cellDataId 
            ? (table.options.meta as any).fileAttachments?.filter((f: FileAttachment) => f.cell_data_id === cellDataId) || []
            : [];

        const handleOpenFileModal = async () => {
            if (!cellDataId) {
                // Création à la volée de la cellule
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const { data: newCell, error } = await supabase.from('cell_data').insert({
                        row_id: row.original.id, column_id: column.id, value_type: 'file', created_by: user?.id
                    }).select('id').single();
                    
                    if (error) throw error;
                    setTempCellId(newCell.id);
                    setIsFileManagerOpen(true);
                    (table.options.meta as any).refreshData();
                } catch(e) { console.error(e); }
            } else {
                setIsFileManagerOpen(true);
            }
        };

        return (
            <>
                <div 
                    onClick={handleOpenFileModal}
                    style={cellStyle} 
                    className={`w-full h-full min-h-[40px] flex items-center px-2 py-1 relative group cursor-pointer 
                        ${!cellStyle.backgroundColor ? "hover:bg-gray-50 dark:hover:bg-gray-800" : "hover:brightness-95"}`}
                >
                    {attachedFiles.length > 0 ? (
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full h-full">
                            {/* Affichage des previews */}
                            {attachedFiles.map((file: FileAttachment) => (
                                <FilePreview key={file.id} file={file} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-500 transition-colors w-full h-full">
                            <Upload className="w-4 h-4" />
                            <span className="text-xs italic">Ajouter</span>
                        </div>
                    )}
                </div>

                {/* MODAL MANAGER */}
                {isFileManagerOpen && (cellDataId || tempCellId) && (
                    <FileAttachmentManager
                        isOpen={isFileManagerOpen}
                        onClose={() => setIsFileManagerOpen(false)}
                        parentId={cellDataId || tempCellId!}
                        parentType="cell"
                        existingFiles={attachedFiles}
                        onFilesChange={handleFilesChange}
                    />
                )}
            </>
        );
    }
    
    if (type === 'multiline') {
        // 1. Récupérer les sous-colonnes
        const mySubCols = (table.options.meta as any).subColumns?.filter(
            (sc: SubColumn) => sc.parent_column_id === column.id
        ) || [];

        // 2. Récupérer les données brutes
        const rawData = (table.options.meta as any).multilineData?.filter(
            (m: MultilineData) => m.cell_data_id === cellDataId
        ) || [];

        // 3. Organiser les données par ligne (Group by order_index)
        // Structure: { 0: { colA: "Val", colB: "Val" }, 1: ... }
        const rowsById: Record<number, Record<string, any>> = {};
        rawData.forEach((d: any) => {
            if (!rowsById[d.order_index]) rowsById[d.order_index] = {};
            // On extrait la valeur utile selon le type
            const val = d.text_value ?? d.number_value ?? d.date_value ?? (d.boolean_value !== null ? (d.boolean_value ? "Vrai" : "Faux") : "");
            rowsById[d.order_index][d.sub_column_id] = val;
        });

        // Liste des index de lignes triés
        const rowIndexes = Object.keys(rowsById).map(Number).sort((a, b) => a - b);

        const handleMultilineClick = async () => {
            if (cellDataId) {
                setIsMultilineOpen(true);
            } else {
                // Création à la volée (inchangé)
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const { data: newCell, error } = await supabase.from('cell_data').insert({
                        row_id: row.original.id, column_id: column.id, value_type: 'multiline', created_by: user?.id
                    }).select('id').single();
                    if (error) throw error;
                    setTempCellId(newCell.id);
                    setIsMultilineOpen(true);
                    (table.options.meta as any).refreshData();
                } catch(e) { console.error(e); }
            }
        };
        
        return (
            <>
                <div 
                    onClick={handleMultilineClick}
                    style={cellStyle}
                    // On retire h-full et items-center pour laisser le contenu grandir
                    className={`w-full min-h-[40px] p-1 cursor-pointer group hover:brightness-95 flex flex-col justify-center
                    ${!cellStyle.backgroundColor ? "hover:bg-gray-50 dark:hover:bg-gray-800" : ""}`}
                >
                    {rowIndexes.length > 0 ? (
                        <div className="flex flex-col gap-1 w-full">
                            {/* EN-TÊTE DU SOUS-TABLEAU (Optionnel, peut surcharger visuellement) */}
                            <div className="flex text-[10px] font-bold text-gray-500 border-b pb-1 mb-1">
                                {mySubCols.map((col: SubColumn) => <div key={col.id} className="flex-1 px-1">{col.label}</div>)}
                            </div>
                            

                            {/* LIGNES DE DONNÉES */}
                            {rowIndexes.map((idx) => (
                                <div key={idx} className="flex text-xs border-b border-gray-100 last:border-0 py-0.5">
                                    {mySubCols.map((col: SubColumn) => (
                                        <div key={col.id} className="flex-1 px-1 truncate border-r last:border-0 border-gray-100/50">
                                            {/* Si la valeur est vide, on met un espace insécable pour garder la hauteur */}
                                            {rowsById[idx][col.id] || <span className="opacity-0">.</span>}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center text-gray-400 italic text-sm h-full">
                            <Plus size={14} className="mr-1" /> Vide
                        </div>
                    )}
                </div>
                
                {isMultilineOpen && cellDataId && (
                    <MultilineCellModal 
                        isOpen={isMultilineOpen}
                        onClose={() => {
                            setIsMultilineOpen(false);
                            // On rafraîchit les données du tableau parent SEULEMENT à la fermeture
                            (table.options.meta as any).refreshData(); 
                        }}
                        parentCellId={cellDataId}
                        subColumns={mySubCols}
                        existingData={rawData}
                        parentColumnDefinitionId={column.id}
                    />
                )}
            </>
        );
    }

    // Si on est en mode édition
    if (isEditing) {
        if (type === "select") {
             return (
                <select
                    value={value || ""}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={onBlur}
                    autoFocus
                    className="w-full h-full p-1 border-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                >
                    <option value="">Sélectionner...</option>
                    {columnMeta?.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        if (type === "boolean") {
             // Pour un booléen, pas besoin d'input text, une checkbox est mieux,
             // mais ici on garde la logique de bascule simple ou un select Vrai/Faux
            return (
                 <select
                    value={value === true ? "true" : "false"}
                    onChange={(e) => {
                        const val = e.target.value === "true";
                        setValue(val);
                        // Hack: Pour le booléen on sauvegarde direct au changement car onBlur est parfois capricieux sur select
                        table.options.meta?.updateData(row.original.id, column.id, val, columns);
                        setIsEditing(false);
                    }}
                    onBlur={() => setIsEditing(false)}
                    autoFocus
                    className="w-full h-full p-1 bg-white dark:bg-gray-800"
                >
                    <option value="true">Vrai</option>
                    <option value="false">Faux</option>
                </select>
            )
        }
        
        if (type === "date") {
             // Formatage pour l'input date (YYYY-MM-DD)
             const dateVal = value ? new Date(value).toISOString().split('T')[0] : "";
             return (
                 <input
                     type="date"
                     value={dateVal}
                     onChange={(e) => setValue(e.target.value)} // Le backend devra gérer le parsing string -> date
                     onBlur={onBlur}
                     autoFocus
                     className="w-full h-full p-1 bg-white dark:bg-gray-800"
                 />
             )
        }

        // Par défaut (text, multiline, number)
        return (
            <input
                value={value as string}
                onChange={(e) => setValue(e.target.value)}
                onBlur={onBlur}
                autoFocus
                className="w-full h-full p-1 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded-sm"
            />
        );
    }

    // --- MODE LECTURE (Affichage) ---
    
    // Gérer l'affichage selon le type (comme avant)
    const renderContent = () => {
        if (value === null || value === undefined) return <span className="opacity-50 italic"></span>;

        switch (type) {
            case "boolean":
                return <span className="font-bold">{value ? "Vrai" : "Faux"}</span>; // Plus besoin de gérer la couleur ici, c'est le conteneur qui gère
            case "select":
                return <span>{value}</span>; // Idem, on enlève le style inline spécifique
            case "date":
                 try { return new Date(value).toLocaleDateString("fr-FR"); } catch { return value; }
            case "file":
                 return <span className="underline cursor-pointer">Fichier</span>;
            default:
                return <span className="truncate block">{value}</span>;
        }
    };

    return (
        <div 
            onClick={() => setIsEditing(type !== "file")}
            style={cellStyle}
            className={`
                w-full h-full min-h-[40px] flex items-center p-2 cursor-pointer 
                transition-colors
                ${!cellStyle.backgroundColor ? "hover:bg-gray-50 dark:hover:bg-gray-800" : "hover:brightness-95"}
            `}
        >
            {renderContent()}
        </div>
    );
};