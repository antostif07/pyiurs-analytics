"use client";

import React from "react";
import { FileSpreadsheet, AlertTriangle, CheckCircle } from "lucide-react";
import { ProductQC } from "../actions";
import ProductImage from "@/app/marketing/components/ProductImage";

export default function QCTable({ data }: { data: ProductQC[] }) {
    const handleExport = () => {
        // En-têtes pour Odoo : on cible 'product.template'
        const headers = ["id", "name", "default_code", "image_1920"];
        
        const rows = data.map(row => {
            const image_name = row.segment === 'beauty' ? `${row.hs_code}_.jpg` : `${row.hs_code}_${row.color}.jpg`
            return [
                row.xml_id || `__export__.product_template_${row.db_id}`, // ID Externe
                `"${row.name.replace(/"/g, '""')}"`,
                row.default_code,
                `https://images.pyiurs.com/images/${image_name}`
            ]
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `odoo_missing_images_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
        
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <AlertTriangle className="w-5 h-5"/>
            </div>
            <div>
                <h3 className="font-bold text-slate-900">{data.length} Modèles sans image</h3>
                <p className="text-xs text-slate-500">
                Ces produits nécessitent une mise à jour visuelle.
                </p>
            </div>
            </div>
            
            <button 
            onClick={handleExport}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors shadow-sm"
            >
            <FileSpreadsheet className="w-4 h-4" />
            Télécharger CSV Odoo
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3">Créé le</th>
                    <th className="px-6 py-3">ID Externe</th>
                    <th className="px-6 py-3">Référence</th>
                    <th className="px-6 py-3">Nom du Produit</th>
                    <th className="px-6 py-3">Couleur</th>
                    <th className="px-6 py-3">Image</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {data.map((row) => {
                    const image_name = row.segment === 'beauty' ? `${row.hs_code}_.jpg` : `${row.hs_code}_${row.color}.jpg`

                    return (
                        <tr key={row.db_id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-500">
                                {row.create_date.split(' ')[0]}
                            </td>
                            <td className="px-6 py-3 font-mono text-xs text-slate-500 select-all">
                                {row.xml_id || <span className="text-orange-400 italic">Pas d'ID Externe</span>}
                            </td>
                            <td className="px-6 py-3 font-mono text-slate-700 font-bold">
                                {row.hs_code}
                            </td>
                            <td className="px-6 py-3 font-medium text-slate-900">
                                {row.name}
                            </td>
                            <td className="px-6 py-3 font-medium text-slate-900">
                                {row.color}
                            </td>
                            <td className="px-6 py-3 font-medium text-slate-900">
                                <div className="h-24 w-18">
                                    <ProductImage alt={row.name} src={`https://images.pyiurs.com/images/${image_name}`} />
                                </div>
                            </td>
                        </tr>
                    )
                })}
                {data.length === 0 && (
                    <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center">
                            <CheckCircle className="w-8 h-8 text-emerald-500 mb-2 opacity-50"/>
                            <p>Tout est parfait ! Aucun produit sans image sur cette période.</p>
                        </div>
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
        </div>
    );
}