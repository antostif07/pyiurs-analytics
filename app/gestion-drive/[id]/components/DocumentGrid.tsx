import { useEffect, useMemo, useState, useCallback } from "react";
// ✅ CORRECTION TS : Ajout de ColumnOption dans les imports
import { 
    CellData, Document, DocumentColumn, DocumentRow, 
    FileAttachment, MultilineData, SubColumn
} from "@/app/types/documents";
import { generateColumns, transformToTableData } from "@/lib/utils";
import { flexRender, getCoreRowModel, useReactTable, ColumnDef, RowData } from "@tanstack/react-table";
import ColumnModal from "./ColumnModal";
import { addRow, deleteColumn, deleteRow, duplicateColumn, duplicateRow, handleCellUpdate, saveColumnOrder, upsertColumn } from "@/lib/utils/documents";
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { DragAlongCell, DraggableTableHeader } from "./DraggableComponents";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { toast } from 'sonner';
// ✅ PRO: Remplacement des SVG bruts par les icônes standardisées
import { Copy, Trash2, Plus } from "lucide-react";
import { ColumnOption } from "@/app/types/table";

interface Props {
    document: Document;
    columns: DocumentColumn[];
    rows: DocumentRow[];
    cellData: CellData[];
    fetchDocumentData: () => Promise<void>;
    subColumns: SubColumn[];
    multilineData: MultilineData[];
    fileAttachments: FileAttachment[];
}

// ============================================================================
// TYPAGE TANSTACK TABLE (Declaration Merging)
// ============================================================================
declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        type: string;
        // ✅ CORRECTION TS : Utilisation du type exact attendu par TypeScript
        options?: ColumnOption[]; 
        style?: {
            backgroundColor?: string;
            color?: string;
        };
    }

    interface TableMeta<TData extends RowData> {
        updateData: (rowIndex: string, columnId: string, value: unknown, columns: DocumentColumn[]) => void;
        subColumns: SubColumn[];
        multilineData: MultilineData[];
        refreshData: () => void;
        fileAttachments: FileAttachment[];
    }
}

export default function DocumentGrid({
    document, columns, rows, cellData, subColumns, multilineData, fetchDocumentData, fileAttachments
}: Props) {
    const[isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const[editingColumn, setEditingColumn] = useState<DocumentColumn | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [columnOrder, setColumnOrder] = useState<string[]>([]);

    useEffect(() => {
        if (columns.length > 0) {
            const dynamicIds = columns
                .sort((a, b) => a.order_index - b.order_index)
                .map(c => c.id);
            setColumnOrder(["row_index", ...dynamicIds, "actions", "add_col_btn"]);
        }
    }, [columns]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    );

    // ✅ PRO: Memoization de handleDragEnd
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                const newOrder = arrayMove(items, oldIndex, newIndex);
                
                saveColumnOrder(document.id, newOrder, columns)
                    .then(() => toast.success("Ordre des colonnes enregistré"))
                    .catch(() => toast.error("Erreur sauvegarde ordre colonnes"));
                return newOrder;
            });
        }
    }, [document.id, columns]);
    
    // ✅ PRO: useCallback sur toutes les actions pour éviter les re-rendus inutiles de la Table
    const onRemoveRow = useCallback(async (rowId: string) => {
        toast.warning("Supprimer cette ligne ?", {
            action: {
                label: "Supprimer",
                onClick: async () => {
                    try {
                        await deleteRow(rowId);
                        await fetchDocumentData();
                        toast.success("Ligne supprimée");
                    } catch (e) {
                        console.error(e);
                        toast.error("Erreur lors de la suppression");
                    }
                }
            }
        });
    },[fetchDocumentData]);

    const onDuplicateRow = useCallback(async (rowId: string) => {
        const toastId = toast.loading("Duplication de la ligne...");
        try {
            await duplicateRow(rowId, document.id);
            await fetchDocumentData();
            toast.success("Ligne dupliquée", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la duplication", { id: toastId });
        }
    }, [document.id, fetchDocumentData]);

    const onAddRow = useCallback(async () => {
        const toastId = toast.loading("Ajout de la ligne...");
        try {
            await addRow(document.id, rows);
            await fetchDocumentData();
            toast.success("Ligne ajoutée", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de l'ajout", { id: toastId });
        }
    }, [document.id, rows, fetchDocumentData]);

    const onSaveColumn = useCallback(async (colData: Partial<DocumentColumn> | Partial<SubColumn>) => {
        const toastId = toast.loading("Sauvegarde de la colonne...");
        setIsSubmitting(true);
      
        try {
            const columnPayload = colData as Partial<DocumentColumn>;
            await upsertColumn(document.id, columnPayload, columns);
            await fetchDocumentData();
      
            toast.success("Colonne sauvegardée", { id: toastId });
            setIsColumnModalOpen(false);
            setEditingColumn(null);
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la sauvegarde", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    }, [document.id, columns, fetchDocumentData]);

    const onDeleteColumn = useCallback(async (columnId: string) => {
        toast.warning("Supprimer cette colonne ?", {
            action: {
                label: "Supprimer",
                onClick: async () => {
                    const toastId = toast.loading("Suppression...");
                    setIsSubmitting(true);
                    try {
                        await deleteColumn(columnId);
                        await fetchDocumentData();
                        toast.success("Colonne supprimée", { id: toastId });
                        setIsColumnModalOpen(false);
                        setEditingColumn(null);
                    } catch (e) {
                        console.error(e);
                        toast.error("Erreur lors de la suppression", { id: toastId });
                    } finally {
                        setIsSubmitting(false);
                    }
                }
            }
        });
    }, [fetchDocumentData]);

    const data = useMemo(() => transformToTableData(rows, cellData), [rows, cellData]);

    // Génération des colonnes
    const tableColumns = useMemo(() => {
        const dynamicCols = generateColumns(columns);

        const interactiveCols = dynamicCols.map(colDef => {
            const originalCol = columns.find(c => c.id === colDef.id);
            return {
                ...colDef,
                size: originalCol?.width || 200,
                minSize: 50,
                header: colDef.header
            };
        });

        const indexColumn: ColumnDef<any> = {
            id: "row_index", header: "#", enableResizing: false, size: 40,
            cell: ({ row }) => (
                <div className="text-center text-gray-400 font-mono text-xs select-none">
                    {row.index + 1}
                </div>
            ),
        };

        const actionColumn: ColumnDef<any> = {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            enableResizing: false,
            size: 80,
            cell: ({ row }) => (
                <div className="flex justify-center items-center h-full gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onDuplicateRow(row.original.id)} 
                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded transition-colors hover:bg-blue-50"
                        title="Dupliquer la ligne"
                    >
                        <Copy size={16} />
                    </button>
                    <button 
                        onClick={() => onRemoveRow(row.original.id)} 
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors hover:bg-red-50"
                        title="Supprimer la ligne"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        };

        const addColumnBtn: ColumnDef<any> = {
            id: "add_col_btn",
            header: () => (
                <button 
                    onClick={() => { setEditingColumn(null); setIsColumnModalOpen(true); }}
                    className="flex items-center justify-center w-full h-full text-gray-400 hover:text-blue-600 transition-colors"
                >
                    <Plus size={20} />
                </button>
            ),
            size: 50,
            enableResizing: false, 
            cell: () => null
        };

        return[indexColumn, ...interactiveCols, actionColumn, addColumnBtn];
    }, [columns, onDuplicateRow, onRemoveRow]); // ✅ PRO: Dépendances parfaites pour le useMemo

    const table = useReactTable({
        data,
        columns: tableColumns as ColumnDef<any>[],
        columnResizeMode: "onChange",
        enableColumnResizing: true,
        getCoreRowModel: getCoreRowModel(),
        state: { columnOrder },
        onColumnOrderChange: setColumnOrder,
        meta: {
            updateData: handleCellUpdate,
            subColumns,
            multilineData, 
            refreshData: fetchDocumentData,
            fileAttachments,
        },
    });
    
    const draggableIds = useMemo(() => 
        columnOrder.filter(id => id !== 'row_index' && id !== 'actions' && id !== 'add_col_btn'),
    [columnOrder]);
    
    return (
        <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
        >
            <div className="flex flex-col w-full h-full bg-white dark:bg-gray-900">
                <div className="overflow-auto flex-1 relative shadow-sm">
                    <table className="border-collapse text-sm table-fixed" style={{ width: table.getTotalSize() }}>
                        <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                    {headerGroup.headers.map((header, index) => {
                                        if (draggableIds.includes(header.id)) {
                                            const originalCol = columns.find(c => c.id === header.id);
                                            return (
                                                <DraggableTableHeader 
                                                    key={header.id} 
                                                    header={header} 
                                                    canResize={header.column.getCanResize()}
                                                    onEdit={() => {
                                                        if (originalCol) {
                                                            setEditingColumn(originalCol);
                                                            setIsColumnModalOpen(true);
                                                        }
                                                    }}
                                                />
                                            );
                                        }

                                        const isFirst = index === 0;
                                        const isAddBtn = header.column.id === 'add_col_btn';
                                        return (
                                            <th 
                                                key={header.id}
                                                colSpan={header.colSpan}
                                                style={{ width: header.getSize(), left: isFirst ? 0 : undefined, zIndex: isFirst ? 20 : 10 }}
                                                className={`
                                                    border-b border-r border-gray-200 dark:border-gray-800 
                                                    p-2 sticky top-0 bg-gray-50 dark:bg-gray-900 
                                                    font-semibold text-gray-700 dark:text-gray-300
                                                    ${isFirst ? "shadow-sm border-r-2" : ""}
                                                `}
                                            >
                                                {isAddBtn ? (
                                                     <button 
                                                        onClick={() => { setEditingColumn(null); setIsColumnModalOpen(true); }}
                                                        className="flex items-center justify-center w-full h-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                ) : (
                                                    flexRender(header.column.columnDef.header, header.getContext())
                                                )}
                                            </th>
                                        )
                                    })}
                                </SortableContext>
                            </tr>
                        ))}
                        </thead>
                        <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                    {row.getVisibleCells().map((cell) => {
                                        if (draggableIds.includes(cell.column.id)) {
                                            return <DragAlongCell key={cell.id} cell={cell} />;
                                        }

                                        const isFirst = cell.column.id === 'row_index';
                                        return (
                                            <td 
                                                key={cell.id} 
                                                style={{ left: isFirst ? 0 : undefined, zIndex: isFirst ? 10 : 0 }}
                                                className={`
                                                    border-b border-r border-gray-200 dark:border-gray-800 
                                                    p-0 h-10 align-middle 
                                                    ${isFirst ? "sticky bg-white group-hover:bg-slate-50 dark:bg-gray-900 dark:group-hover:bg-slate-800/50 border-r-2" : ""}
                                                `}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        );
                                    })}
                                </SortableContext>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
                    <button 
                        onClick={onAddRow} 
                        className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all w-full border border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <Plus size={16} />
                        Ajouter une ligne
                    </button>
                </div>

                <ColumnModal 
                    isOpen={isColumnModalOpen}
                    onClose={() => setIsColumnModalOpen(false)}
                    onSave={onSaveColumn}
                    onDelete={editingColumn ? () => onDeleteColumn(editingColumn.id) : undefined}
                    initialData={editingColumn}
                    isSubmitting={isSubmitting}
                />
            </div>
        </DndContext>
    );
}