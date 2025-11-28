import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { DocumentColumn, DataType, SubColumn } from "@/app/types/documents";

type ColumnData = DocumentColumn | SubColumn;

interface ColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (columnData: Partial<DocumentColumn> | Partial<SubColumn>) => Promise<void>;
    onDelete?: (columnId: string) => Promise<void>;
    initialData?: ColumnData | null;
    isSubmitting: boolean;
    isSubColumn?: boolean;
}

const DATA_TYPES: { value: DataType; label: string }[] = [
    { value: 'text', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Vrai/Faux' },
    { value: 'select', label: 'Liste déroulante' },
    { value: 'multiline', label: 'Multiligne' },
    { value: 'file', label: 'Fichier' },
];

export default function ColumnModal({ isOpen, onClose, onSave, onDelete, initialData, isSubmitting, isSubColumn = false }: ColumnModalProps){
    const [label, setLabel] = useState("");
    const [dataType, setDataType] = useState<DataType>("text");
    const [width, setWidth] = useState(200);
    const [options, setOptions] = useState(""); // Pour le type select (séparé par virgules)
    const [bgColor, setBgColor] = useState("#FFFFFF");
    const [textColor, setTextColor] = useState("#000000");

    useEffect(() => {
        if (initialData) {
            setLabel(initialData.label);
            setDataType(initialData.data_type);
            setWidth(initialData.width);
            
            // Gestion des différences de types entre DocumentColumn et SubColumn
            if (!isSubColumn) {
                // Cast en DocumentColumn pour accéder aux couleurs
                const docCol = initialData as DocumentColumn;
                setBgColor(docCol.background_color || "#FFFFFF");
                setTextColor(docCol.text_color || "#000000");
                
                // Config options (string[])
                setOptions(docCol.config?.options?.join(", ") || "");
            } else {
                // SubColumn (config est Record<string, string>)
                const subCol = initialData as SubColumn;
                // On récupère la string directement
                setOptions(subCol.config?.['options'] || "");
            }
        } else {
            setLabel("");
            setDataType("text");
            setWidth(200);
            setOptions("");
            setBgColor("#FFFFFF");
            setTextColor("#000000");
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const config: any = {};
        if (dataType === 'select') {
            config.options = options.split(',').map(s => s.trim()).filter(Boolean);
        }

        // On appelle le parent
        await onSave({
            ...(initialData ? { id: initialData.id } : {}),
            label,
            data_type: dataType,
            width,
            background_color: bgColor,
            text_color: textColor,
            config
        });
    };

    const availableTypes = isSubColumn 
        ? DATA_TYPES.filter(t => t.value !== 'multiline') 
        : DATA_TYPES;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    {initialData ? (isSubColumn ? "Modifier la sous-colonne" : "Modifier la colonne") : (isSubColumn ? "Nouvelle sous-colonne" : "Nouvelle colonne")}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Nom</label>
                        <input 
                            required
                            type="text" 
                            value={label} 
                            onChange={e => setLabel(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Type</label>
                            <select 
                                value={dataType} 
                                onChange={e => setDataType(e.target.value as DataType)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {availableTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Largeur (px)</label>
                            <input 
                                type="number" 
                                value={width} 
                                onChange={e => setWidth(Number(e.target.value))}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    {dataType === 'select' && (
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Options (séparées par virgules)</label>
                            <input 
                                type="text" 
                                value={options} 
                                onChange={e => setOptions(e.target.value)}
                                placeholder="Option 1, Option 2, ..."
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Fond</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={bgColor} 
                                    onChange={e => setBgColor(e.target.value)}
                                    className="h-8 w-8 cursor-pointer border-none"
                                />
                                <span className="text-xs text-gray-500">{bgColor}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Texte</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={textColor} 
                                    onChange={e => setTextColor(e.target.value)}
                                    className="h-8 w-8 cursor-pointer border-none"
                                />
                                <span className="text-xs text-gray-500">{textColor}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 mt-2 border-t dark:border-gray-700">
                        {initialData && onDelete ? (
                            <button 
                                type="button"
                                onClick={() => {
                                    if(confirm("Supprimer cette colonne et toutes ses données ?")) onDelete(initialData.id);
                                }}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                                Supprimer
                            </button>
                        ) : <div></div>}
                        
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                            >
                                {isSubmitting ? "Sauvegarde..." : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}