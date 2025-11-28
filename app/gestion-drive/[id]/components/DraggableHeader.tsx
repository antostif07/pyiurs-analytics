import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header, flexRender } from "@tanstack/react-table";
import { CSSProperties } from "react";
import { Resizer } from "./Resizer"; // Assurez-vous du chemin

interface DraggableHeaderProps {
    header: Header<any, unknown>;
    className?: string;
    style?: CSSProperties;
}

export const DraggableHeader = ({ header, className, style }: DraggableHeaderProps) => {
    const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
        useSortable({
            id: header.column.id,
            // On désactive le drag pour les colonnes fixes (#, Actions, +)
            disabled: !header.column.getCanSort() && header.column.id !== "actions" // Ajustez selon vos besoins
        });

    const dndStyle: CSSProperties = {
        opacity: isDragging ? 0.8 : 1,
        position: "relative",
        transform: CSS.Translate.toString(transform), // Translate est mieux que Transform pour éviter les flous
        transition,
        zIndex: isDragging ? 100 : style?.zIndex, // La colonne traînée passe au dessus
        width: style?.width,
        left: style?.left,
        cursor: isDragging ? "grabbing" : "grab",
        ...style // On fusionne avec les styles existants (width, sticky, etc)
    };

    return (
        <th
            ref={setNodeRef}
            colSpan={header.colSpan}
            style={dndStyle}
            className={className}
            {...attributes}
            {...listeners}
        >
            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
            
            {/* Le Resizer doit être en dehors des listeners du drag si possible, 
                mais ici le e.stopPropagation() dans le Resizer suffit */}
            {header.column.getCanResize() && <Resizer header={header} />}
        </th>
    );
};