'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { VendeuseSalesData } from "./page";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { POSOrderLine } from "../types/pos";

interface VendeuseSalesDashboardProps {
  month?: string;
  year?: string;
  agentId?: string;
  isAdmin?: boolean;
  agents?: { id: number; name: string }[];
  orderLines: POSOrderLine[]
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR');
}

export function VendeuseSalesDashboard({ 
  month, 
  year, 
  agentId,
  isAdmin = false,
  agents = [],
  orderLines = []
}: VendeuseSalesDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {user} = useAuth()

  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();
  const currentAgentId = agentId
  

  useEffect(() => {
    // Si c'est un vendeuse et qu'aucun agent n'est sélectionné, rediriger vers son propre profil
    if (user?.role === 'vendeuse' && !agentId) {
      const newParams = new URLSearchParams();
      if (month) newParams.set('month', month);
      if (year) newParams.set('year', year);
      newParams.set('agent', user.id);
      router.push(`${pathname}?${newParams.toString()}`);
    }
  }, [agentId, month, year, pathname, router]);

  const handleFilterChange = (type: 'month' | 'year' | 'agent', value: string) => {
    const newParams = new URLSearchParams();
    
    if (type === 'month' && value) newParams.set('month', value);
    if (type === 'year' && value) newParams.set('year', value);
    if (type === 'agent' && value) newParams.set('agent', value);
    
    // Garder les autres filtres s'ils existent
    if (type !== 'month' && month) newParams.set('month', month);
    if (type !== 'year' && year) newParams.set('year', year);
    if (type !== 'agent' && agentId) newParams.set('agent', agentId);

    router.push(`${pathname}?${newParams.toString()}`);
  };

  const getMonthName = (monthNumber: string) => {
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    return months[parseInt(monthNumber) - 1] || "";
  };

  const getCurrentAgentName = () => {
    if (!currentAgentId) return "Tous les agents";
    
    if (currentAgentId === user?.id) {
      return user.name;
    }
    
    const agent = agents.find(a => a.id === Number(currentAgentId));
    
    return agent?.name || "Agent inconnu";
  };

  // Si les informations utilisateur ne sont pas encore chargées
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
            >
              ← Retour
            </Link>

            <div className="flex items-center space-x-3">
              <div className="px-2">
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  Tableau de Bord {isAdmin ? 'Administrateur' : 'Vendeuse'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm truncate">
                  {isAdmin ? (
                    <>Suivi des ventes et commissions - {getCurrentAgentName()} - {getMonthName(currentMonth.toString())} {currentYear}</>
                  ) : (
                    <>Mes ventes et commissions - {getMonthName(currentMonth.toString())} {currentYear}</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
            {/* Filtre Agent (seulement pour les admins) */}
            {isAdmin && (
              <select 
                value={currentAgentId || ''}
                onChange={(e) => handleFilterChange('agent', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 min-w-48"
              >
                <option value="">Tous les agents</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}

            {/* Filtres Mois/Année */}
            <div className="flex gap-2">
              <select 
                value={currentMonth}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700"
              >
                <option value="1">Janvier</option>
                <option value="2">Février</option>
                <option value="3">Mars</option>
                <option value="4">Avril</option>
                <option value="5">Mai</option>
                <option value="6">Juin</option>
                <option value="7">Juillet</option>
                <option value="8">Août</option>
                <option value="9">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
              </select>

              <select 
                value={currentYear}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700"
              >
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Indicateur de contexte */}
        {isAdmin && currentAgentId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Affichage des données pour : <strong>{getCurrentAgentName()}</strong>
                </span>
              </div>
              {currentAgentId && (
                <button
                  onClick={() => handleFilterChange('agent', '')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                >
                  Voir tous les agents
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cartes de résumé */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Ventes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(orderLines.reduce((acc, ol) => {
                    return acc + ol.price_subtotal
                }, 0))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Set(orderLines.map(r => r.order_id[0])).size} ventes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Coût
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatAmount(orderLines.reduce((acc, ol) => {
                    return acc + ol.price_subtotal
                }, 0)*0.485)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Coût des marchandises
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatAmount(orderLines.reduce((acc, ol) => {
                    return acc + ol.price_subtotal
                }, 0)*0.485*0.12)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                12%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tableau des détails des ventes */}
        <Card>
          <CardHeader>
            <CardTitle>
              Détail des Ventes
              {isAdmin && currentAgentId && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - {getCurrentAgentName()}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Liste complète des transactions pour {getMonthName(currentMonth.toString())} {currentYear}
              {isAdmin && !currentAgentId && " - Tous les agents"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && !currentAgentId && <TableHead>Vendeuse</TableHead>}
                    <TableHead>Client</TableHead>
                    {/* <TableHead>Numéro</TableHead> */}
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead>Produits</TableHead>
                    {/* <TableHead>POS</TableHead> */}
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderLines.map((vente) => (
                    <TableRow key={vente.id}>
                      {isAdmin && !currentAgentId && (
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {/* <span>{vente.vendeuse || "Marie Dubois"}</span> */}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {vente.partner_id && vente.partner_id[1]}
                      </TableCell>
                      {/* <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {vente.numero}
                        </Badge>
                      </TableCell> */}
                      <TableCell className="text-right font-bold text-green-600">
                        {formatAmount(vente.price_subtotal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {vente.order_id[1]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-48">
                          <Badge variant="outline" className="text-xs">
                              {vente.product_id[1]}
                            </Badge>
                        </div>
                      </TableCell>
                      {/* <TableCell>
                        <Badge 
                          className={
                            // vente.pos === 'P24' ? 'bg-blue-100 text-blue-800' :
                            // vente.pos === 'P.KTM' ? 'bg-green-100 text-green-800' :
                            // vente.pos === 'LMB' ? 'bg-purple-100 text-purple-800' :
                            // vente.pos === 'MTO' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {vente.pos}
                        </Badge>
                      </TableCell> */}
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(vente.create_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Résumé du tableau */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  {/* Affichage de {data.details.length} ventes sur {data.summary.nombreVentes} total */}
                  {isAdmin && currentAgentId && ` pour ${getCurrentAgentName()}`}
                </span>
                <div className="flex gap-4">
                  <span className="text-green-600 font-medium">
                    Total: {formatAmount(orderLines.reduce((sum, vente) => sum + vente.price_subtotal, 0))}
                  </span>
                  <span className="text-purple-600 font-medium">
                    Commission: {formatAmount(orderLines.reduce((sum, vente) => sum + (vente.price_subtotal * 0.485 * 0.12), 0))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}