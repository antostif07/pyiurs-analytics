import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";


const mockReportData = {
  weekly: [
    {
      semaine: "W36",
      partGlobal: "19840",
      revPartClient: "$5 960",
      chrgBase: "75 (00.38%)",
      arpu: "$79",
      partAcq: "24 (32.00%)",
      revAcq: "$2226 (37.34%)",
      partRec: "$1 (68%)",
      partGlobal2: "19849",
      revPartClient2: "$2 165",
      chrgBase2: "28 (00.14%)",
      arpu2: "$77",
      partAcq2: "6 (21.43%)",
      revAcq2: "$863 (39.86%)",
      partRec2: "22 (79%)"
    },
    {
      semaine: "W37",
      partGlobal: "19845",
      revPartClient: "$6 120",
      chrgBase: "80 (00.40%)",
      arpu: "$82",
      partAcq: "28 (35.00%)",
      revAcq: "$2450 (40.00%)",
      partRec: "$1 (65%)",
      partGlobal2: "19852",
      revPartClient2: "$2 280",
      chrgBase2: "32 (00.16%)",
      arpu2: "$79",
      partAcq2: "8 (25.00%)",
      revAcq2: "$912 (40.00%)",
      partRec2: "24 (75%)"
    }
  ],
  monthly: [
    {
      month: "Janvier",
      revPartClient: "$35 433",
      chgBase: "348 (2%)",
      arpu: "$101,82",
      partAcq: "107 (30.75%)",
      revAcq: "$12351 (34.86%)",
      partRec: "241 (69%)",
      revRec: "$23 082 (65%)"
    },
    {
      month: "Février",
      revPartClient: "$36 780",
      chgBase: "378 (2%)",
      arpu: "$97,30",
      partAcq: "132 (34.92%)",
      revAcq: "$14309 (38.90%)",
      partRec: "246 (65%)",
      revRec: "$22 471 (61%)"
    },
    {
      month: "Mars",
      revPartClient: "$103 133",
      chgBase: "1226 (7%)",
      arpu: "$84,12",
      partAcq: "659 (53.75%)",
      revAcq: "$55469 (53.78%)",
      partRec: "567 (46%)",
      revRec: "$47 664 (46%)"
    },
    {
      month: "Avril",
      revPartClient: "$35 742",
      chgBase: "435 (2%)",
      arpu: "$82,16",
      partAcq: "151 (34.71%)",
      revAcq: "$15965 (44.67%)",
      partRec: "284 (65%)",
      revRec: "$19 777 (55%)"
    },
    {
      month: "Mai",
      revPartClient: "$33 225",
      chgBase: "384 (2%)",
      arpu: "$86,52",
      partAcq: "117 (30.47%)",
      revAcq: "$11920 (35.88%)",
      partRec: "267 (70%)",
      revRec: "$21 305 (64%)"
    },
    {
      month: "Juin",
      revPartClient: "$29 151",
      chgBase: "371 (2%)",
      arpu: "$78,57",
      partAcq: "163 (43.94%)",
      revAcq: "$11621 (39.86%)",
      partRec: "208 (56%)",
      revRec: "$17 530 (60%)"
    }
  ],
  acquisition: {
    boutiques: [
      { name: "P24", w36: 10, w37: 2 },
      { name: "PKTM", w36: 1, w37: 1 },
      { name: "PMTO", w36: 7, w37: 1 },
      { name: "PONL", w36: 3, w37: 2 },
      { name: "ZARINA", w36: 3, w37: null }
    ],
    total: { w36: 24, w37: 6 }
  },
  telephone: [
    { nom: "Madame Ami", totalAchat: "$120", total: "$2 477" },
    { nom: "BIBICHE IVOLO", totalAchat: "", total: "$2 439" },
    { nom: "M r Abdoi brazza", totalAchat: "$275", total: "" },
    { nom: "Madame Gabriella", totalAchat: "$3 471", total: "" },
    { nom: "Madame Acha Rachidi", totalAchat: "$479", total: "" },
    { nom: "Madame Chistralia", totalAchat: "$325", total: "" }
  ],
  totalGeneral: "$3 262 916"
};

export default function MonthlyTable() {
    return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold">Month</th>
                    <th className="text-left py-3 px-4 font-semibold">Rev. Part Client</th>
                    <th className="text-left py-3 px-4 font-semibold">Chg. Base</th>
                    <th className="text-left py-3 px-4 font-semibold">ARPU</th>
                    <th className="text-left py-3 px-4 font-semibold">Part Acq (%)</th>
                    <th className="text-left py-3 px-4 font-semibold">Rev Acq (%)</th>
                    <th className="text-left py-3 px-4 font-semibold">Part Rec (%)</th>
                    <th className="text-left py-3 px-4 font-semibold">Rev. Rec</th>
                  </tr>
                </thead>
                <tbody>
                  {mockReportData.monthly.map((month, index) => (
                    <tr key={month.month} className="border-b border-gray-100 dark:border-slate-700">
                      <td className="py-3 px-4 font-medium">{month.month}</td>
                      <td className="py-3 px-4">{month.revPartClient}</td>
                      <td className="py-3 px-4">{month.chgBase}</td>
                      <td className="py-3 px-4">{month.arpu}</td>
                      <td className="py-3 px-4">{month.partAcq}</td>
                      <td className="py-3 px-4">{month.revAcq}</td>
                      <td className="py-3 px-4">{month.partRec}</td>
                      <td className="py-3 px-4">{month.revRec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    )
}