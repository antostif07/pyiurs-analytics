// lib/customer-grouping.ts
import { CustomerCategory } from '@/app/types/partner';
import { PhoneNormalizer } from './phone-normalization';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  orderCount: number;
  totalSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
}

export interface GroupedCustomer {
  // Identifiant unique du groupe (numéro normalisé)
  phoneKey: string;
  category: CustomerCategory;
  // Numéro formaté pour l'affichage
  displayPhone: string;
  // Tous les IDs de partenaires regroupés
  partnerIds: number[];
  // Le nom principal (le plus récent ou le plus complet)
  primaryName: string;
  // Tous les noms alternatifs
  allNames: string[];
  // Email principal
  primaryEmail?: string;
  // Tous les emails
  allEmails: string[];
  // Statistiques consolidées
  totalOrderCount: number;
  totalAmountSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
  // Nombre de profils fusionnés
  mergedProfiles: number;
  averageOrderValue: number;
}

export class CustomerGrouper {
  /**
   * Regroupe les clients par numéro de téléphone
   */
  static groupCustomersByPhone(customers: Customer[]): GroupedCustomer[] {
    const groups = new Map<string, GroupedCustomer>();

    customers.forEach(customer => {
      // Ignorer les clients sans numéro
      if (typeof customer.phone !== "string" || !customer.phone?.trim()) return;

      const phoneKey = PhoneNormalizer.getGroupKey(customer.phone);
      const displayPhone = PhoneNormalizer.normalize(customer.phone);

      // Si le numéro n'est pas valide, on le garde quand même mais on le signale
    //   if (!PhoneNormalizer.isValidRDCCongo(customer.phone)) {
    //     console.warn(`📞 Numéro invalide pour ${customer.name}: ${customer.phone}: ${displayPhone}`);
    //   }

      if (!groups.has(phoneKey)) {
        const averageOrderValue = customer.orderCount > 0 ? customer.totalSpent / customer.orderCount : 0
        const category: CustomerCategory = averageOrderValue >= 280 ? "GOLD" : (
            averageOrderValue < 280 && averageOrderValue >= 100 ? "SILVER" : averageOrderValue < 100 && averageOrderValue >= 45 ? "PYIURS" : "NORMAL"
        )

        groups.set(phoneKey, {
          phoneKey,
          displayPhone,
          partnerIds: [customer.id],
          primaryName: customer.name,
          allNames: [customer.name],
          primaryEmail: customer.email,
          allEmails: customer.email ? [customer.email] : [],
          totalOrderCount: customer.orderCount,
          totalAmountSpent: customer.totalSpent,
          firstOrderDate: customer.firstOrderDate,
          lastOrderDate: customer.lastOrderDate,
          mergedProfiles: 1,
          category: category,
          averageOrderValue: averageOrderValue,
        });
      } else {
        // Fusion avec un groupe existant
        const existingGroup = groups.get(phoneKey)!;

        // Fusion des IDs
        existingGroup.partnerIds.push(customer.id);

        // Fusion des noms (éviter les doublons)
        if (!existingGroup.allNames.includes(customer.name)) {
          existingGroup.allNames.push(customer.name);
        }

        // Choisir le nom le plus complet comme nom principal
        if (customer.name.length > existingGroup.primaryName.length) {
          existingGroup.primaryName = customer.name;
        }

        // Fusion des emails
        if (customer.email && !existingGroup.allEmails.includes(customer.email)) {
          existingGroup.allEmails.push(customer.email);
          // Prendre le premier email comme principal
          if (!existingGroup.primaryEmail) {
            existingGroup.primaryEmail = customer.email;
          }
        }

        // Fusion des statistiques
        existingGroup.totalOrderCount += customer.orderCount;
        existingGroup.totalAmountSpent += customer.totalSpent;

        const averageOrderValue = existingGroup.totalOrderCount > 0 ? existingGroup.totalAmountSpent / existingGroup.totalOrderCount : 0
        const category: CustomerCategory = averageOrderValue >= 280 ? "GOLD" : (
            averageOrderValue < 280 && averageOrderValue >= 100 ? "SILVER" : averageOrderValue < 100 && averageOrderValue >= 45 ? "PYIURS" : "NORMAL"
        )

        // Mettre à jour les dates
        if (customer.firstOrderDate < existingGroup.firstOrderDate) {
          existingGroup.firstOrderDate = customer.firstOrderDate;
        }
        if (customer.lastOrderDate > existingGroup.lastOrderDate) {
          existingGroup.lastOrderDate = customer.lastOrderDate;
        }

        existingGroup.mergedProfiles++;
        existingGroup.category = category;
      }
    });

    return Array.from(groups.values());
  }

  /**
   * Génère un rapport de fusion
   */
  static generateMergeReport(groupedCustomers: GroupedCustomer[], originalCount: number) {
    const totalGrouped = groupedCustomers.length;
    const totalMerged = groupedCustomers.reduce((sum, group) => sum + group.mergedProfiles, 0);
    const duplicatesFound = totalMerged - totalGrouped;

    console.log('\n📊 RAPPORT DE REGROUPEMENT:');
    console.log(`👥 Clients originaux: ${originalCount}`);
    console.log(`🎯 Clients après regroupement: ${totalGrouped}`);
    console.log(`🔄 Doublons fusionnés: ${duplicatesFound}`);
    console.log(`📈 Réduction: ${((duplicatesFound / originalCount) * 100).toFixed(1)}%`);

    // Top 10 des numéros avec le plus de doublons
    const topDuplicates = groupedCustomers
      .filter(g => g.mergedProfiles > 1)
      .sort((a, b) => b.mergedProfiles - a.mergedProfiles)
      .slice(0, 10);

    if (topDuplicates.length > 0) {
      console.log('\n🏆 Top 10 des numéros avec le plus de doublons:');
      topDuplicates.forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.displayPhone}: ${group.mergedProfiles} profils (${group.allNames.join(', ')})`);
      });
    }

    // Statistiques sur la qualité des numéros
    const validPhones = groupedCustomers.filter(g => 
      PhoneNormalizer.isValidRDCCongo(g.displayPhone)
    ).length;

    console.log(`\n✅ Numéros valides: ${validPhones}/${totalGrouped} (${((validPhones / totalGrouped) * 100).toFixed(1)}%)`);
  }
}