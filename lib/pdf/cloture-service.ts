// lib/pdf-service.ts
import jsPDF from 'jspdf'
import { MainCashRow, SecondaryCashRow, CashDenomination } from '@/app/types/cloture'
import { format } from 'date-fns'
import { ClotureDataView } from '../cloture-service'

export interface PDFClotureData {
  closure: ClotureDataView
  mainCash: MainCashRow[]
  secondaryCash: SecondaryCashRow[]
  denominations: CashDenomination[]
  shopInfo?: {
    name: string
    address?: string
    phone?: string
  }
}

export const pdfService = {
  async generateCloturePDF(data: PDFClotureData): Promise<Blob> {
    const { closure, 
      mainCash, 
      secondaryCash, denominations, shopInfo 
    } = data
    
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // Couleurs
    const colors = {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#8B5CF6',
      danger: '#EF4444',
      warning: '#F59E0B',
      dark: '#1F2937',
      light: '#6B7280'
    }

    let yPosition = 20

    // Header avec dégradé
    this.addHeader(pdf, closure, shopInfo, pageWidth)
    yPosition = 45

    // Cartes de résumé (comme dans votre UI)
    yPosition = this.addSummaryCards(pdf, closure, pageWidth, yPosition, colors)
    yPosition += 25

    // Caisse Principale - Tableau stylisé
    yPosition = this.addMainCashSection(pdf, mainCash, pageWidth, yPosition, colors)
    
    // Caisse Secondaire
    yPosition = this.addSecondaryCashSection(pdf, secondaryCash, pageWidth, yPosition, colors)
    
    // Billeterie détaillée
    const eR = closure.exchange_rate || 2450
    yPosition = this.addDenominationsSection(pdf, denominations, eR, pageWidth, yPosition, colors)

    // Notes et signatures
    this.addNotesAndSignatures(pdf, closure, pageWidth, pageHeight, colors)

    // Pied de page
    this.addFooter(pdf, pageWidth, pageHeight)

    return pdf.output('blob')
  },

  addHeader(pdf: jsPDF, closure: ClotureDataView, shopInfo: { name: string; address?: string; phone?: string } | undefined, pageWidth: number) {
    // Fond dégradé
    pdf.setFillColor(59, 130, 246) // blue-500
    pdf.rect(0, 0, pageWidth, 40, 'F')
    
    // Logo/Titre
    pdf.setFontSize(20)
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CLÔTURE DE CAISSE', pageWidth / 2, 15, { align: 'center' })
    
    // Informations
    pdf.setFontSize(10)
    pdf.setTextColor(255, 255, 255, 0.9)
    pdf.text(`Boutique: ${closure.shop_name}`, 20, 25)
    pdf.text(`Date: ${format(new Date(closure.closing_date), 'dd/MM/yyyy')}`, pageWidth - 20, 25, { align: 'right' })
    
    pdf.setFontSize(9)
    pdf.text(`Statut: ${this.getStatusText(closure.closure_status || "")}`, 20, 32)
    pdf.text(`N°: ${closure?.id?.slice(0, 8).toUpperCase() || ""}`, pageWidth - 20, 32, { align: 'right' })
  },

  addSummaryCards(pdf: jsPDF, closure: ClotureDataView, pageWidth: number, yStart: number, colors: { primary: string; secondary: string; accent?: string; danger: string; warning?: string; dark?: string; light?: string }): number {
    const cardWidth = (pageWidth - 60) / 2
    let yPosition = yStart

    // Carte Ventes
    this.addSummaryCard(
      pdf, 
      '💰 Total Ventes', 
      `${closure?.total_sales?.toLocaleString('fr-FR')} $`, 
      colors.primary,
      20,
      yPosition,
      cardWidth
    )

    // Carte Dépenses
    this.addSummaryCard(
      pdf,
      '📊 Total Dépenses',
      `${(closure.total_expenses ?? 0).toLocaleString('fr-FR')} $`,
      colors.danger,
      40 + cardWidth,
      yPosition,
      cardWidth
    )

    yPosition += 28

    // Carte Cash Théorique
    this.addSummaryCard(
      pdf,
      '🎯 Cash Théorique',
      `${(closure.expected_cash ?? 0).toLocaleString('fr-FR')} $`,
      colors.secondary,
      20,
      yPosition,
      cardWidth
    )

    // Carte Différence
    const diffColor = closure.difference && closure.difference >= 0 ? colors.secondary : colors.danger
    this.addSummaryCard(
      pdf,
      '⚖️ Différence',
      `${(closure.difference ?? 0).toLocaleString('fr-FR')} $`,
      diffColor,
      40 + cardWidth,
      yPosition,
      cardWidth
    )

    return yPosition + 35
  },

  addSummaryCard(pdf: jsPDF, title: string, value: string, color: string, x: number, y: number, width: number) {
    // Fond de carte
    pdf.setFillColor(249, 250, 251) // gray-50
    pdf.setDrawColor(229, 231, 235) // gray-200
    pdf.roundedRect(x, y, width, 25, 3, 3, 'FD')
    
    // Barre colorée
    pdf.setFillColor(color)
    pdf.rect(x, y, 4, 25, 'F')
    
    // Contenu
    pdf.setFontSize(9)
    pdf.setTextColor(107, 114, 128) // gray-500
    pdf.setFont('helvetica', 'normal')
    pdf.text(title, x + 10, y + 8)
    
    pdf.setFontSize(12)
    pdf.setTextColor(31, 41, 55) // gray-800
    pdf.setFont('helvetica', 'bold')
    pdf.text(value, x + 10, y + 18)
  },

  addMainCashSection(pdf: jsPDF, data: MainCashRow[], pageWidth: number, yStart: number, colors: { primary: string; secondary: string; accent: string; danger: string; warning?: string; dark: string; light: string }): number {
    let yPosition = yStart

    // Titre section
    pdf.setFontSize(14)
    pdf.setTextColor(colors.dark)
    pdf.setFont('helvetica', 'bold')
    pdf.text('💼 CAISSE PRINCIPALE', 20, yPosition)
    yPosition += 8

    // Ligne séparatrice
    pdf.setDrawColor(colors.primary)
    pdf.setLineWidth(0.5)
    pdf.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 12

    // En-tête tableau
    pdf.setFontSize(8)
    pdf.setTextColor(colors.light)
    pdf.setFont('helvetica', 'bold')
    
    const headers = ['MODE PAIEMENT', 'OUVERTURE', 'VENTES', 'SORTIES', 'THÉORIQUE', 'PHYSIQUE', 'STATUT']
    const colWidths = [32, 22, 20, 20, 25, 25, 28]
    
    let x = 20
    headers.forEach((header, index) => {
      pdf.text(header, x, yPosition)
      x += colWidths[index]
    })

    yPosition += 6

    // Ligne séparatrice en-tête
    pdf.setDrawColor(226, 232, 240)
    pdf.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 8

    // Données
    pdf.setFontSize(8)
    pdf.setTextColor(colors.dark)
    pdf.setFont('helvetica', 'normal')

    data.forEach((row, index) => {
      if (yPosition > 250) {
        pdf.addPage()
        yPosition = 30
      }

      const rowData = [
        row.payment_method_name,
        `${row.opening_balance.toLocaleString('fr-FR')}$`,
        `+${row.daily_sales.toLocaleString('fr-FR')}$`,
        `-${row.daily_outflows.toLocaleString('fr-FR')}$`,
        `${row.theoretical_closure.toLocaleString('fr-FR')}$`,
        `${row.physical_cash.toLocaleString('fr-FR')}$`,
        this.getValidationBadge(row.manager_confirmed, row.financier_confirmed)
      ]

      x = 20
      rowData.forEach((text, colIndex) => {
        // Couleurs conditionnelles
        if (colIndex === 2) pdf.setTextColor(colors.secondary) // Ventes en vert
        else if (colIndex === 3) pdf.setTextColor(colors.danger) // Sorties en rouge
        else if (colIndex === 4 || colIndex === 5) {
          pdf.setTextColor(colors.accent) // Totaux en violet
          pdf.setFont('helvetica', 'bold')
        } else {
          pdf.setTextColor(colors.dark)
          pdf.setFont('helvetica', 'normal')
        }

        pdf.text(text, x, yPosition)
        x += colWidths[colIndex]
      })

      // Fond alterné pour les lignes
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251)
        pdf.rect(20, yPosition - 4, pageWidth - 40, 6, 'F')
      }

      yPosition += 8
    })

    // Ligne de total
    yPosition += 4
    pdf.setDrawColor(colors.dark)
    pdf.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 8

    // Total général
    const totalOpen = data.reduce((sum, row) => sum + row.opening_balance, 0)
    const totalSales = data.reduce((sum, row) => sum + row.daily_sales, 0)
    const totalOutflows = data.reduce((sum, row) => sum + row.daily_outflows, 0)
    const totalTheoretical = data.reduce((sum, row) => sum + row.theoretical_closure, 0)
    const totalPhysical = data.reduce((sum, row) => sum + row.physical_cash, 0)

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(colors.dark)
    pdf.text('TOTAL GÉNÉRAL', 20, yPosition)
    pdf.text(`${totalOpen.toLocaleString('fr-FR')}$`, 52, yPosition)
    pdf.text(`+${totalSales.toLocaleString('fr-FR')}$`, 74, yPosition)
    pdf.text(`-${totalOutflows.toLocaleString('fr-FR')}$`, 94, yPosition)
    pdf.text(`${totalTheoretical.toLocaleString('fr-FR')}$`, 119, yPosition)
    pdf.text(`${totalPhysical.toLocaleString('fr-FR')}$`, 144, yPosition)

    return yPosition + 20
  },

  addSecondaryCashSection(pdf: jsPDF, data: SecondaryCashRow[], pageWidth: number, yStart: number, colors: { primary?: string; secondary: string; accent?: string; danger?: string; warning?: string; dark: string; light?: string }): number {
    let yPosition = yStart

    if (yPosition > 200) {
      pdf.addPage()
      yPosition = 30
    }

    // Titre section (style similaire à caisse principale)
    pdf.setFontSize(14)
    pdf.setTextColor(colors.dark)
    pdf.setFont('helvetica', 'bold')
    pdf.text('💰 CAISSE SECONDAIRE - ÉPARGNES', 20, yPosition)
    yPosition += 8

    pdf.setDrawColor(colors.secondary)
    pdf.setLineWidth(0.5)
    pdf.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 12

    // Implémentation similaire au tableau caisse principale mais pour les épargnes
    // ... (code similaire adapté pour secondary cash)

    return yPosition + 20
  },

  addDenominationsSection(pdf: jsPDF, data: CashDenomination[], exchangeRate: number, pageWidth: number, yStart: number, colors: { primary: string; secondary?: string; accent?: string; danger?: string; warning: string; dark: string; light?: string }): number {
    let yPosition = yStart

    if (yPosition > 180) {
      pdf.addPage()
      yPosition = 30
    }

    pdf.setFontSize(14)
    pdf.setTextColor(colors.dark)
    pdf.setFont('helvetica', 'bold')
    pdf.text('💵 BILLETERIE DÉTAILLÉE', 20, yPosition)
    yPosition += 8

    pdf.setDrawColor(colors.warning)
    pdf.setLineWidth(0.5)
    pdf.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 15

    // Billeterie USD
    const usdDenominations = data.filter(d => d.currency === 'USD')
    const totalUSD = usdDenominations.reduce((sum, d) => sum + d.amount, 0)

    pdf.setFontSize(10)
    pdf.setTextColor(colors.primary)
    pdf.setFont('helvetica', 'bold')
    pdf.text('USD', 20, yPosition)
    yPosition += 8

    pdf.setFontSize(8)
    pdf.setTextColor(colors.dark)
    pdf.setFont('helvetica', 'normal')

    usdDenominations.forEach(denom => {
      pdf.text(`${denom.denomination} $`, 25, yPosition)
      pdf.text(`× ${denom.quantity}`, 60, yPosition)
      pdf.text(`= ${denom.amount.toLocaleString('fr-FR')} $`, 90, yPosition, { align: 'right' })
      yPosition += 6
    })

    // Total USD
    yPosition += 4
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Total USD: ${totalUSD.toLocaleString('fr-FR')} $`, 25, yPosition)
    yPosition += 15

    // Billeterie CDF (même structure)
    const cdfDenominations = data.filter(d => d.currency === 'CDF')
    const totalCDF = cdfDenominations.reduce((sum, d) => sum + d.amount, 0)
    const totalCDFInUSD = totalCDF / exchangeRate

    pdf.setFontSize(10)
    pdf.setTextColor(colors.primary)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CDF', 20, yPosition)
    yPosition += 8

    pdf.setFontSize(8)
    pdf.setTextColor(colors.dark)
    pdf.setFont('helvetica', 'normal')

    cdfDenominations.forEach(denom => {
      pdf.text(`${denom.denomination.toLocaleString('fr-FR')} FC`, 25, yPosition)
      pdf.text(`× ${denom.quantity}`, 70, yPosition)
      pdf.text(`= ${denom.amount.toLocaleString('fr-FR')} FC`, 110, yPosition, { align: 'right' })
      yPosition += 6
    })

    // Total CDF
    yPosition += 4
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Total CDF: ${totalCDF.toLocaleString('fr-FR')} FC`, 25, yPosition)
    pdf.text(`(≈ ${totalCDFInUSD.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $)`, 120, yPosition, { align: 'right' })

    return yPosition + 20
  },

  addNotesAndSignatures(pdf: jsPDF, closure: ClotureDataView, pageWidth: number, pageHeight: number, colors: { primary?: string; secondary?: string; accent?: string; danger?: string; warning?: string; dark: string; light: string }) {
    const yStart = pageHeight - 80

    pdf.setFontSize(10)
    pdf.setTextColor(colors.dark)
    pdf.setFont('helvetica', 'bold')
    pdf.text('OBSERVATIONS:', 20, yStart)

    pdf.setFontSize(9)
    pdf.setTextColor(colors.light)
    pdf.setFont('helvetica', 'normal')
    
    const notes = closure.notes || 'Aucune observation'
    const wrappedNotes = pdf.splitTextToSize(notes, pageWidth - 40)
    pdf.text(wrappedNotes, 20, yStart + 8)

    // Ligne signatures
    const signatureY = yStart + 35
    pdf.setDrawColor(colors.light)
    pdf.line(30, signatureY, 80, signatureY)
    pdf.line(pageWidth - 80, signatureY, pageWidth - 30, signatureY)

    pdf.setFontSize(8)
    pdf.setTextColor(colors.light)
    pdf.text('Signature Manager', 45, signatureY + 8, { align: 'center' })
    pdf.text('Signature Financier', pageWidth - 45, signatureY + 8, { align: 'center' })
  },

  addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number) {
    const totalPages = pdf.getNumberOfPages()
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(7)
      pdf.setTextColor(100, 100, 100)
      pdf.text(
        `Page ${i}/${totalPages} • Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')} • Système de Clôture PB`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }
  },

  getValidationBadge(manager: boolean, financier: boolean): string {
    if (manager && financier) return '✅ Validé'
    if (manager) return '👔 Manager'
    if (financier) return '💰 Financier'
    return '⏳ En attente'
  },

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': '📝 Brouillon',
      'manager_validated': '👔 Validé Manager', 
      'financier_validated': '💰 Validé Financier',
      'completed': '✅ Terminé'
    }
    return statusMap[status] || status
  }
}