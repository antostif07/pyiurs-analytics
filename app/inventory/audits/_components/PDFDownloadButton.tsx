'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { AuditReportPDF } from './AuditReportPDF';
import { StockAudit, StockAuditItem } from '@/app/inventory/audits/_lib/types';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';

interface PDFDownloadButtonProps {
    audit: StockAudit;
    items: StockAuditItem[];
}

export function PDFDownloadButton({ audit, items }: PDFDownloadButtonProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <Button variant="outline" size="sm" disabled className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                <span>Génération PDF...</span>
            </Button>
        );
    }

    const fileName = `RAPPORT_AUDIT_${audit.reference}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return (
        <PDFDownloadLink
            document={<AuditReportPDF audit={audit} items={items} />}
            fileName={fileName}
        >
            {({ loading }) => (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-rose-500/30 hover:bg-rose-500/10 text-rose-600 transition-all"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                        <FileText className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{loading ? "Génération PDF..." : "Rapport PDF (Natif)"}</span>
                </Button>
            )}
        </PDFDownloadLink>
    );
}