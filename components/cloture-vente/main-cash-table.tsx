import { FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export const MainCashTable = ({ data, onToggleManager, onToggleFinancier, onValidateAll }: any) => {
  const isAllManagerValidated = data.every((row: any) => row.managerConfirmed);
  const isAllFinancierValidated = data.every((row: any) => row.financierConfirmed);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6 text-blue-600" />
            Caisse Principale
            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
              {data.filter((row: any) => row.managerConfirmed && row.financierConfirmed).length}/{data.length} validés
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onValidateAll('manager')}>✅ Valider tous Manager</Button>
            <Button variant="outline" size="sm" onClick={() => onValidateAll('financier')}>✅ Valider tous Financier</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm text-left">
            <thead className="bg-blue-50 border-b text-blue-900">
              <tr>
                <th className="p-4 font-semibold">Mode de Paiement</th>
                <th className="p-4 font-semibold text-right">Solde Ouv.</th>
                <th className="p-4 font-semibold text-right">Ventes Jour</th>
                <th className="p-4 font-semibold text-right">Sorties Jour</th>
                <th className="p-4 font-semibold text-right">Clôture Théo.</th>
                <th className="p-4 font-semibold text-right">Cash Physique</th>
                <th className="p-4 font-semibold text-center">Validation</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={i} className="border-b hover:bg-blue-50/50">
                  <td className="p-4 font-medium">{row.modePaiement}</td>
                  <td className="p-4 text-right">{row.soldeOuverture.toLocaleString()} $</td>
                  <td className="p-4 text-right text-green-600">+{row.ventesJour.toLocaleString()} $</td>
                  <td className="p-4 text-right text-red-600">-{row.sortiesJour.toLocaleString()} $</td>
                  <td className="p-4 text-right font-bold text-purple-600">{row.clotureTheorique.toLocaleString()} $</td>
                  <td className="p-4 text-right font-bold text-blue-600">{row.cashPhysique.toLocaleString()} $</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant={row.managerConfirmed ? "default" : "outline"} onClick={() => onToggleManager(i)} className="h-7 text-xs">
                        {row.managerConfirmed ? "✅ Manager" : "⏳ Manager"}
                      </Button>
                      <Button size="sm" variant={row.financierConfirmed ? "default" : "outline"} onClick={() => onToggleFinancier(i)} className="h-7 text-xs">
                        {row.financierConfirmed ? "✅ Financier" : "⏳ Financier"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-100 font-bold text-blue-900">
                <td className="p-4">TOTAL</td>
                <td className="p-4 text-right">{data.reduce((s: any, r: any) => s + r.soldeOuverture, 0).toLocaleString()} $</td>
                <td className="p-4 text-right text-green-700">+{data.reduce((s: any, r: any) => s + r.ventesJour, 0).toLocaleString()} $</td>
                <td className="p-4 text-right text-red-700">-{data.reduce((s: any, r: any) => s + r.sortiesJour, 0).toLocaleString()} $</td>
                <td className="p-4 text-right text-purple-700">{data.reduce((s: any, r: any) => s + r.clotureTheorique, 0).toLocaleString()} $</td>
                <td className="p-4 text-right text-blue-700">{data.reduce((s: any, r: any) => s + r.cashPhysique, 0).toLocaleString()} $</td>
                <td className="p-4 text-center">
                  {isAllManagerValidated && isAllFinancierValidated ? <Badge className="bg-green-500">Validé</Badge> : <Badge variant="outline">En attente</Badge>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};