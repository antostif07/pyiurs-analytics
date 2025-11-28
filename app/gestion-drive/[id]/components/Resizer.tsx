// components/Resizer.tsx (ou dans DocumentGrid.tsx)
import { Header } from "@tanstack/react-table";
import { useEffect, useRef } from "react";
import { updateColumnWidth } from "@/lib/utils/documents";

export const Resizer = ({ header }: { header: Header<any, unknown> }) => {
    const { column } = header;
    const isResizing = column.getIsResizing();
    const wasResizing = useRef(false);

    // Détecter la FIN du redimensionnement pour sauvegarder
    useEffect(() => {
        if (wasResizing.current && !isResizing) {
            // L'utilisateur vient de lâcher la souris
            updateColumnWidth(column.id, column.getSize());
        }
        wasResizing.current = isResizing;
    }, [isResizing, column]);

    return (
        <div
            {...{
                onMouseDown: header.getResizeHandler(),
                onTouchStart: header.getResizeHandler(),
                className: `absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-blue-400 z-30
                ${isResizing ? "bg-blue-600 opacity-100" : "opacity-0 group-hover:opacity-50"}`,
                onClick: (e) => e.stopPropagation(), // Empêcher d'ouvrir le modal d'édition quand on resize
            }}
        />
    );
};