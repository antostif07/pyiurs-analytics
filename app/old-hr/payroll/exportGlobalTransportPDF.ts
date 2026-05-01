import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const THEME_COLOR: [number, number, number] = [225, 29, 72]; // Rose 600

export const generateGlobalTransportPDF = async (
    data: any[], // Liste des employés calculés
    month: string,
    year: string,
    shopName: string
) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Format Paysage (Landscape)
    const monthLabel = format(new Date(`${year}-${month}-01`), 'MMMM yyyy', { locale: fr });

    // Logo
    try {
        const img = new Image();
        img.src = '/logo.png';
        await new Promise((resolve) => { img.onload = resolve; });
        doc.addImage(img, 'PNG', 14, 10, 25, 12);
    } catch (e) {}

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
    doc.text(`ÉTAT GLOBAL DES TRANSPORTS - ${shopName.toUpperCase()}`, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Période : ${monthLabel.toUpperCase()}  |  Base de calcul : 26 Jours`, 14, 37);

    const tableRows = data.map(emp => [
        emp.matricule || '—',
        emp.name.toUpperCase(),
        `${emp.transport_allowance} $`,
        emp.penaltyDays,
        emp.transportEligibleDays,
        `${emp.netTransport.toFixed(2)} $`,
        '' // Colonne pour émargement (signature)
    ]);

    autoTable(doc, {
        startY: 45,
        head: [['Matricule', 'Nom de l\'Employé', 'Indemnité Base', 'Absences (hors dim.)', 'Jours Payés', 'Net à Payer', 'Émargement']],
        body: tableRows,
        headStyles: { fillColor: THEME_COLOR, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            5: { fontStyle: 'bold' },
            6: { cellWidth: 30 }
        }
    });

    const totalGlobal = data.reduce((acc, curr) => acc + curr.netTransport, 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GÉNÉRAL À DÉCAISSER : ${totalGlobal.toFixed(2)} $`, 14, finalY);

    doc.save(`Etat_Transport_${shopName.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
};