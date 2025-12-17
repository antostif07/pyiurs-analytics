import { useEffect, useMemo, useState } from "react";
import { CellData, Document, DocumentColumn, DocumentRow, FileAttachment, MultilineData, SubColumn } from "@/app/types/documents";
import { generateColumns, transformToTableData } from "@/lib/utils";
import { flexRender, getCoreRowModel, useReactTable, ColumnDef, RowData, } from "@tanstack/react-table";
import ColumnModal from "./ColumnModal";
import { addRow, deleteColumn, deleteRow, duplicateColumn, duplicateRow, handleCellUpdate, saveColumnOrder, upsertColumn } from "@/lib/utils/documents";
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, MouseSensor, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { DragAlongCell, DraggableTableHeader } from "./DraggableComponents";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";

interface Props {
    document: Document
    columns: DocumentColumn[]
    rows: DocumentRow[]
    cellData: CellData[]
    fetchDocumentData: () => Promise<void>
    subColumns: SubColumn[]
    multilineData: MultilineData[]
    fileAttachments: FileAttachment[];
}

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        type: string;
        options?: string[];
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
        fileAttachments: FileAttachment[],
    }
}

export default function DocumentGrid({document, columns, rows, cellData,subColumns, multilineData, fetchDocumentData, fileAttachments}: Props) {
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<DocumentColumn | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [columnOrder, setColumnOrder] = useState<string[]>([]);

    useEffect(() => {
        if (columns.length > 0) {
            const dynamicIds = columns
                .sort((a, b) => a.order_index - b.order_index)
                .map(c => c.id);
            // On définit l'ordre initial : #, [Colonnes BDD], Actions, +
            setColumnOrder(["row_index", ...dynamicIds, "actions", "add_col_btn"]);
        }
    }, [columns]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }), // Important pour permettre le clic d'édition
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                const newOrder = arrayMove(items, oldIndex, newIndex);
                
                // Sauvegarde BDD
                saveColumnOrder(document.id, newOrder, columns);
                return newOrder;
            });
        }
    };
    
    // 1. Suppression de ligne
    const onRemoveRow = async (rowId: string) => {
        if(!confirm("Supprimer la ligne ?")) return;
        try { await deleteRow(rowId); await fetchDocumentData(); } catch(e) { alert("Erreur"); }
    };

    const onDuplicateRow = async (rowId: string) => {
        try {
            await duplicateRow(rowId, document.id);
            await fetchDocumentData();
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la duplication de la ligne");
        }
    };

    const onDuplicateColumn = async (columnId: string) => {
        try {
            await duplicateColumn(columnId, document.id);
            await fetchDocumentData();
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la duplication de la colonne");
        }
    };

    // 2. Ajout de ligne
    const onAddRow = async () => {
        try { await addRow(document.id, rows); await fetchDocumentData(); } catch(e) { alert("Erreur"); }
    };

    // 3. Sauvegarde colonne (Create / Update)
    const onSaveColumn = async (colData: Partial<DocumentColumn> | Partial<SubColumn>) => {
        setIsSubmitting(true);
        try {
            const columnPayload = colData as Partial<DocumentColumn>;
            await upsertColumn(document.id, columnPayload, columns);
            await fetchDocumentData();
            setIsColumnModalOpen(false);
            setEditingColumn(null);
        } catch (e) {
            alert("Erreur sauvegarde colonne");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. Suppression colonne
    const onDeleteColumn = async (columnId: string) => {
        setIsSubmitting(true);
        try {
            await deleteColumn(columnId);
            await fetchDocumentData();
            setIsColumnModalOpen(false);
            setEditingColumn(null);
        } catch (e) {
            alert("Erreur suppression colonne");
        } finally {
            setIsSubmitting(false);
        }
    };

    const data = useMemo(() => transformToTableData(rows, cellData), [rows, cellData]);

    // 2. On génère les colonnes : Index + Dynamiques + Actions
    const tableColumns = useMemo(() => {
        const dynamicCols = generateColumns(columns);

        const interactiveCols = dynamicCols.map(colDef => {
            const originalCol = columns.find(c => c.id === colDef.id);
            return {
                ...colDef,
                size: originalCol?.width || 200,
                minSize: 50,
                // On ajoute un ID unique pour le context sortable (déjà fait par colDef.id normalement)
                header: colDef.header
            };
        });

        const indexColumn: ColumnDef<any> = {
            id: "row_index", header: "#", enableResizing: false, size: 40,
            cell: ({ row }) => (
                <div className="text-center text-gray-400 font-mono text-xs select-none">{row.index + 1}</div>
            ),
        };

        const actionColumn: ColumnDef<any> = {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            enableResizing: false,
            size: 80,
            cell: ({ row }) => (
                <div className="flex justify-center items-center h-full gap-1">
                    {/* Bouton Dupliquer */}
                    <button 
                        onClick={() => onDuplicateRow(row.original.id)} 
                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded transition-colors"
                        title="Dupliquer la ligne"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                    
                    {/* Bouton Supprimer */}
                    <button 
                        onClick={() => onRemoveRow(row.original.id)} 
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors"
                        title="Supprimer la ligne"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            ),
        };

        const addColumnBtn: ColumnDef<any> = {
            id: "add_col_btn",
            header: () => (
                <button 
                    onClick={() => { setEditingColumn(null); setIsColumnModalOpen(true); }}
                    className="flex items-center justify-center w-full h-full text-gray-400 hover:text-blue-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            ),
            size: 50,
            enableResizing: false, 
            cell: () => null
        };

        return [indexColumn, ...interactiveCols, actionColumn, addColumnBtn];
    }, [columns]);

    const table = useReactTable({
        data,
        columns: tableColumns as ColumnDef<any>[],
        columnResizeMode: "onChange",
        enableColumnResizing: true,
        getCoreRowModel: getCoreRowModel(),
        state: {
            columnOrder, // On lie l'état local à la table
        },
        onColumnOrderChange: setColumnOrder,
        meta: {
            updateData: handleCellUpdate,
            subColumns: subColumns,
            multilineData: multilineData, 
            refreshData: fetchDocumentData,
            fileAttachments: fileAttachments,
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
            <div className="flex flex-col w-full h-full">
                <div className="overflow-auto bg-white dark:bg-gray-900 flex-1 relative border border-gray-200 dark:border-gray-800 shadow-sm">
                    <table className="border-collapse text-sm table-fixed" style={{ width: table.getTotalSize() }}>
                        <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                    {headerGroup.headers.map((header, index) => {
                                        // 1. Si c'est une colonne draggable
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

                                        // 2. Colonnes fixes (Non Draggable)
                                        // On reprend le style standard
                                        const isFirst = index === 0;
                                        const isAddBtn = header.column.id === 'add_col_btn';
                                        return (
                                            <th 
                                                key={header.id}
                                                colSpan={header.colSpan}
                                                style={{ width: header.getSize(), left: isFirst ? 0 : undefined, zIndex: isFirst ? 20 : 10 }}
                                                className={`
                                                    border-b border-r border-gray-300 dark:border-gray-700 
                                                    p-2 sticky top-0 bg-gray-100 dark:bg-gray-800 
                                                    font-semibold text-gray-700 dark:text-gray-200
                                                    ${isFirst ? "shadow-md" : ""}
                                                `}
                                            >
                                                {/* Logique spéciale pour le bouton d'ajout */}
                                                {isAddBtn ? (
                                                     <button 
                                                        onClick={() => { setEditingColumn(null); setIsColumnModalOpen(true); }}
                                                        className="flex items-center justify-center w-full h-full text-blue-500 hover:bg-gray-200 rounded"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                            <tr key={row.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                    {row.getVisibleCells().map((cell) => {
                                        // 1. Si c'est une colonne draggable, on utilise DragAlongCell
                                        if (draggableIds.includes(cell.column.id)) {
                                            return <DragAlongCell key={cell.id} cell={cell} />;
                                        }

                                        // 2. Colonnes fixes
                                        const isFirst = cell.column.id === 'row_index';
                                        return (
                                            <td 
                                                key={cell.id} 
                                                style={{ left: isFirst ? 0 : undefined, zIndex: isFirst ? 10 : 0 }}
                                                className={`
                                                    border-b border-r border-gray-200 dark:border-gray-700 
                                                    p-0 h-10 align-middle 
                                                    ${isFirst ? "sticky bg-gray-50 dark:bg-gray-800 border-r-2" : "bg-white dark:bg-gray-900"}
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

                {/* Footer Bouton Ajouter */}
                <div className="shrink-0 p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 z-10">
                    <button onClick={onAddRow} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center border border-dashed border-gray-300 dark:border-gray-700">
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