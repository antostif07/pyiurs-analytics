import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header, Cell, flexRender } from "@tanstack/react-table";
import { CSSProperties } from "react";
import { GripVertical } from "lucide-react"; // Import icône
import { Resizer } from "./Resizer";

interface DraggableHeaderProps {
    header: Header<any, unknown>;
    canResize: boolean;
    onEdit: () => void; // <--- NOUVELLE PROP
}

// --- HEADER ---
export const DraggableTableHeader = ({ header, canResize, onEdit }: DraggableHeaderProps) => {
    const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
        useSortable({
            id: header.column.id,
        });

    const style: CSSProperties = {
        opacity: isDragging ? 0.8 : 1,
        position: "relative",
        transform: CSS.Translate.toString(transform),
        transition,
        width: header.getSize(),
        zIndex: isDragging ? 100 : 0,
        whiteSpace: "nowrap",
    };

    return (
        <th
            colSpan={header.colSpan}
            ref={setNodeRef}
            style={style}
            className={`
                border-b border-r border-gray-300 dark:border-gray-700 
                bg-gray-100 dark:bg-gray-800 
                font-semibold text-gray-700 dark:text-gray-200
                group relative
            `}
        >
            <div className="flex items-center gap-1 px-2 h-full">
                {/* BOUTON GRIP */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5"
                >
                    <GripVertical size={14} className="opacity-40" />
                </div>

                {/* CONTENU DU HEADER */}
                <div className="flex-1 truncate">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </div>

                {/* 3. BOUTON EDITION (À DROITE) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Empêche les conflits
                        onEdit();
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Modifier la colonne"
                >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            </div>

            {/* RESIZER */}
            {canResize && <Resizer header={header} />}
        </th>
    );
};

// --- CELLULE QUI SUIT LE MOUVEMENT ---
export const DragAlongCell = ({ cell }: { cell: Cell<any, unknown> }) => {
    const { isDragging, setNodeRef, transform, transition } = useSortable({
        id: cell.column.id,
    });

    const style: CSSProperties = {
        opacity: isDragging ? 0.8 : 1,
        position: "relative",
        transform: CSS.Translate.toString(transform),
        transition,
        width: cell.column.getSize(),
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <td
            ref={setNodeRef}
            style={style}
            className="border-b border-r border-gray-200 dark:border-gray-700 p-0 h-10 align-middle bg-white dark:bg-gray-900"
        >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
    );
};