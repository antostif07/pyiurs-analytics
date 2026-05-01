import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ATTENDANCE_LABELS, AttendanceStatus } from "@/lib/supabase/types";

export const generateAttendancePDF = (
  data: any[], 
  monthName: string, 
  year: string, 
  shopName: string,
  selectedAgentName?: string // Optionnel : si on filtre par agent
) => {
  const doc = new jsPDF();
  
  // Titre dynamique
  const isIndividual = !!selectedAgentName && selectedAgentName !== "Tous les agents";
  const title = isIndividual 
    ? `FICHE DE PRESENCE INDIVIDUELLE` 
    : `RAPPORT COLLECTIF DES PRESENCES`;
  
  const subTitle = isIndividual ? `Agent : ${selectedAgentName.toUpperCase()}` : `Boutique : ${shopName.toUpperCase()}`;

  // 1. En-tête
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(title, 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(subTitle, 14, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Période : ${monthName} ${year}`, 14, 38);
  if (isIndividual) doc.text(`Affectation : ${shopName}`, 14, 43);
  doc.text(`Document généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, isIndividual ? 48 : 43);

  // 2. Préparation des colonnes (On enlève le nom de l'employé si c'est un rapport individuel pour gagner de la place)
  const head = isIndividual 
    ? [['Date', 'Jour', 'Heure Arrivée', 'Statut Validé']]
    : [['Employé', 'Matricule', 'Date', 'Heure', 'Statut']];

  const tableRows = data.map(row => {
    const dateObj = new Date(row.date);
    const dateStr = dateObj.toLocaleDateString('fr-FR');
    const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
    const status = ATTENDANCE_LABELS[(row.validated_status || row.status) as AttendanceStatus];

    return isIndividual 
      ? [dateStr, dayName, row.check_in || '--:--', status]
      : [row.employees?.name, row.employees?.matricule || '-', dateStr, row.check_in || '--:--', status];
  });

  // 3. Table
  autoTable(doc, {
    startY: isIndividual ? 55 : 50,
    head: head,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], fontSize: 10 },
    styles: { fontSize: 9 },
    didParseCell: function(data) {
        if (data.section === 'body') {
            const lastColIndex = isIndividual ? 3 : 4;
            if (data.column.index === lastColIndex) {
                const txt = String(data.cell.raw);
                if (txt.includes("Absent")) data.cell.styles.textColor = [220, 38, 38];
                if (txt.includes("Retard")) data.cell.styles.textColor = [217, 119, 6];
            }
        }
    }
  });

  // 4. Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 25;
  doc.setFontSize(10);
  if (isIndividual) {
    doc.text("Signature de l'Agent", 14, finalY);
  } else {
    doc.text("Signature Responsable Boutique", 14, finalY);
  }
  doc.text("Cachet et Signature Direction", 140, finalY);

  doc.save(`Rapport_Presences_${shopName.replace(/\s+/g, '_')}_${monthName}.pdf`);
};