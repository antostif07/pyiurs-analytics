import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// On définit explicitement le type comme un tuple de 3 nombres (RGB)
const THEME_COLOR: [number, number, number] = [225, 29, 72]; 

export const generateTransportPDF = async (
    employee: any, 
    month: string, 
    year: string, 
    eligibleDays: number, 
    daysInMonth: number,
    netTransport: number
) => {
    const doc = new jsPDF();
    const monthLabel = format(new Date(`${year}-${month}-01`), 'MMMM yyyy', { locale: fr });

    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    try {
        const logo = await loadImage('/logo.png');
        doc.addImage(logo, 'PNG', 14, 10, 45, 15); 
    } catch (error) {
        console.error("Le logo n'a pas pu être chargé", error);
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
    doc.text("FICHE DE PAIEMENT TRANSPORT", 14, 35);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Réf: TRP-${year}${month}-${employee.matricule}`, 14, 42);

    doc.setDrawColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 48, 196, 48);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`BÉNÉFICIAIRE : ${employee.name.toUpperCase()}`, 14, 58);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Matricule : ${employee.matricule || 'N/A'}`, 14, 65);
    doc.text(`Boutique : ${employee.shops?.name || 'N/A'}`, 14, 72);
    doc.text(`Période : ${monthLabel.toUpperCase()}`, 14, 79);

    autoTable(doc, {
        startY: 88,
        head: [['Désignation', 'Base Mensuelle', 'Jours du mois', 'Jours Éligibles', 'Total à Payer']],
        body: [[
            "Indemnité de transport",
            `${employee.transport_allowance} $`,
            `26 jours`,
            `${eligibleDays} j`, // Nombre d'absences
            { 
                content: `${netTransport.toFixed(2)} $`, 
                styles: { fontStyle: 'bold', fontSize: 12, textColor: THEME_COLOR } 
            }
        ]],
        theme: 'grid',
        headStyles: { 
            fillColor: THEME_COLOR, 
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: { fontSize: 10, cellPadding: 6 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text("* Note : Le paiement du transport est calculé sur la base de la présence effective.", 14, finalY);

    const footerY = finalY + 40;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("Signature du Bénéficiaire", 14, footerY);
    doc.line(14, footerY + 2, 70, footerY + 2);

    doc.text("Caisse / Direction RH", 130, footerY);
    doc.line(130, footerY + 2, 190, footerY + 2);

    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Système RH PYIURS`, 105, 285, { align: 'center' });

    doc.save(`Transport_${employee.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
};