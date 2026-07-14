'use client';

import { utils, writeFile } from 'xlsx';

interface ExportExcelButtonProps {
    data: any[];
}

export function ExportExcelButton({ data }: ExportExcelButtonProps) {
    const handleExport = () => {
        // Supprimer individualProducts et isExpanded de chaque élément
        const cleanData = data.map(({ individualProducts, isExpanded, ...rest }) => rest);

        // Créer la feuille de calcul et le classeur
        const worksheet = utils.json_to_sheet(cleanData);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Stock Beauty');

        // Télécharger le fichier
        writeFile(workbook, 'control_stock_beauty.xlsx');
    };

    return (
        <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
        >
            📊 Exporter Excel
        </button>
    );
}