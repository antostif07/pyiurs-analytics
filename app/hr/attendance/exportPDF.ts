import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, getDay } from 'date-fns'; // Ajout de getDay
import { fr } from 'date-fns/locale';

export const generateAttendancePDF = (employee: any, attendances: any[], month: string, year: string, stats: any) => {
  const doc = new jsPDF();
  const monthLabel = format(new Date(`${year}-${month}-01`), 'MMMM yyyy', { locale: fr });

  // 1. ENTÊTE
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text("JOURNAL DES PRÉSENCES", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(`PÉRIODE : ${monthLabel.toUpperCase()}`, 14, 30);

  // 2. INFOS EMPLOYÉ
  doc.setDrawColor(230);
  doc.line(14, 35, 196, 35);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`Employé : ${employee.name}`, 14, 45);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Matricule : ${employee.matricule || 'N/A'}`, 14, 52);
  doc.text(`Boutique : ${employee.shops?.name || 'N/A'}`, 14, 59);

  // 3. LOGIQUE DES LIGNES DU TABLEAU
  const tableRows = attendances.map(row => {
    const dateObj = new Date(row.date);
    const isSunday = getDay(dateObj) === 0; // 0 = Dimanche en JS/Date-fns

    // Si c'est un dimanche, on force l'affichage "DIMANCHE"
    // même si la machine ou la base indique "absent"
    const displayStatusMachine = isSunday ? "DIMANCHE" : (row.status || '').toUpperCase();
    const displayStatusRetenu = isSunday ? "DIMANCHE" : (row.validated_status || row.status || '').toUpperCase();
    const displayArrival = isSunday ? "—" : (row.check_in || '—');

    return [
      format(dateObj, 'dd/MM/yyyy'),
      format(dateObj, 'eeee', { locale: fr }),
      displayArrival,
      displayStatusMachine,
      displayStatusRetenu,
      isSunday ? '' : (row.observation || '')
    ];
  });

  autoTable(doc, {
    startY: 65,
    head: [['Date', 'Jour', 'Arrivée', 'Status Machine', 'Status Retenu', 'Observations']],
    body: tableRows,
    headStyles: { 
      fillColor: [51, 65, 85], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold'
    },
    alternateRowStyles: { 
      fillColor: [249, 250, 251] 
    },
    // Style spécifique pour les dimanches (optionnel: les mettre en gris clair)
    didParseCell: (data) => {
        if (data.section === 'body' && data.row.cells[1].text[0] === 'dimanche') {
            data.cell.styles.textColor = [150, 150, 150];
            data.cell.styles.fontStyle = 'italic';
        }
    },
    styles: { 
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
        4: { fontStyle: 'bold' } 
    },
    margin: { left: 14, right: 14 }
  });

  // 4. RÉSUMÉ DES COMPTEURS
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFont("helvetica", "bold");
  doc.text("SYNTHÈSE DU MOIS", 14, finalY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  // Note: On s'assure que stats.absent ne compte que les vraies absences (hors dimanche)
  const summaryText = `Présents: ${stats.present}  |  Retards: ${stats.late}  |  Absents: ${stats.absent}  |  Repos: ${stats.repos || 0}  |  Malade: ${stats.sick || 0}`;
  doc.text(summaryText, 14, finalY + 7);

  // 5. SIGNATURES
  const footerY = finalY + 35;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Signature de l'Employé", 14, footerY);
  doc.setDrawColor(200);
  doc.line(14, footerY + 2, 70, footerY + 2);

  doc.text("Validation Direction / RH", 130, footerY);
  doc.line(130, footerY + 2, 190, footerY + 2);

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text(`Document généré numériquement le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 285);

  const fileName = `Rapport_Presences_${employee.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`;
  doc.save(fileName);
};