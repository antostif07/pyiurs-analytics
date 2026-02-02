import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const THEME_COLOR: [number, number, number] = [225, 29, 72]; // Rose 600

export const generateFullPayslipPDF = async (emp: any, month: string, year: string) => {
    const doc = new jsPDF();
    const monthLabel = format(new Date(`${year}-${month}-01`), 'MMMM yyyy', { locale: fr });
    const p = emp.payslipData; // Les données archivées en base

    // 1. CHARGEMENT LOGO
    try {
        const img = new Image();
        img.src = '/logo.png';
        await new Promise((resolve) => { img.onload = resolve; });
        doc.addImage(img, 'PNG', 14, 10, 30, 15);
    } catch (e) { console.error(e) }

    // 2. ENTÊTE & RÉFÉRENCE
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
    doc.text("BULLETIN DE PAIE", 14, 35);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Référence : PAY-${year}${month}-${emp.matricule}`, 14, 42);
    doc.text(`Période : ${monthLabel.toUpperCase()}`, 14, 47);

    // 3. BLOC EMPLOYÉ
    doc.setDrawColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 52, 196, 52);

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(emp.name.toUpperCase(), 14, 62);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Matricule : ${emp.matricule || 'N/A'}`, 14, 69);
    doc.text(`Boutique : ${emp.shops?.name || 'N/A'}`, 14, 75);
    doc.text(`ID Odoo : ${emp.employee_odoo_id || 'Non lié'}`, 14, 81);

    // 4. TABLEAU DES RUBRIQUES (GAINS ET RETENUES)
    const tableBody = [
        ["Salaire de base (Base 26 jours)", `${p.base_salary_snapshot} $`, ""],
        ["Indemnité de transport (Payé)", `${p.transport_allowance_paid} $`, ""],
    ];

    // Ajouter les primes détaillées
    emp.filteredBonuses.forEach((b: any) => {
        tableBody.push([`Prime : ${b.reason}`, `${b.amount} $`, ""]);
    });

    // Ajouter les retenues
    if (p.absences_deduction > 0) {
        tableBody.push(["Retenue pour absences / congés", "", `-${p.absences_deduction} $`]);
    }
    if (p.debt_deduction > 0) {
        tableBody.push(["Remboursement dette / avance", "", `-${p.debt_deduction} $`]);
    }

    autoTable(doc, {
        startY: 90,
        head: [['Désignation', 'Gains (+)', 'Retenues (-)']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: THEME_COLOR, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right', textColor: [220, 38, 38] }
        }
    });

    // 5. RÉSUMÉ FINAL
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Cadre Total Net
    doc.setFillColor("F8F9FB"); // Gris très clair
    doc.roundedRect(120, finalY, 76, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NET À PAYER :", 125, finalY + 10);
    
    doc.setFontSize(16);
    doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
    doc.text(`${p.net_paid.toLocaleString()} $`, 190, finalY + 18, { align: 'right' });

    // 6. ZONE DE SIGNATURES
    const footerY = finalY + 45;
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("Signature de l'Employé", 14, footerY);
    doc.line(14, footerY + 2, 60, footerY + 2);

    doc.text("Le Responsable RH / Direction", 130, footerY);
    doc.line(130, footerY + 2, 190, footerY + 2);

    // Footer légal
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    const footerText = "Ce bulletin de paie est un document officiel de PYIURS SARL. Pour valoir ce que de droit.";
    doc.text(footerText, 105, 285, { align: 'center' });

    doc.save(`Fiche_Paie_${emp.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
};

// Couleur de fond hex pour le rectangle (F8F9FB)
const F8F9FB = 248;