"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Bell, Download, ChevronDown, Moon, Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { name: "Jan", profit: 12000, expenses: 8000 },
  { name: "Feb", profit: 18000, expenses: 12000 },
  { name: "Mar", profit: 22000, expenses: 15000 },
  { name: "Apr", profit: 26000, expenses: 17000 },
  { name: "May", profit: 30000, expenses: 20000 },
  { name: "Jun", profit: 28000, expenses: 21000 },
];

export default function PremiumDashboard() {
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-white">
        {/* Sidebar */}
        <aside className="w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r p-5">
          <h1 className="text-2xl font-bold mb-8">go</h1>
          <nav className="space-y-2">
            {["Dashboard", "Sales", "Purchases", "Reports", "Payroll", "Tax"].map((item) => (
              <motion.div
                key={item}
                whileHover={{ scale: 1.03 }}
                className={`px-4 py-2 rounded-xl cursor-pointer transition ${
                  item === "Reports"
                    ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item}
              </motion.div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 p-6">
          {/* Topbar */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm w-1/3">
              <Search size={16} />
              <input className="outline-none w-full text-sm bg-transparent" placeholder="Search anything..." />
            </div>

            <div className="flex items-center gap-6">
              <button onClick={() => setDark(!dark)}>
                {dark ? <Sun /> : <Moon />}
              </button>
              <Bell />
              <img src="https://i.pravatar.cc/40" className="w-9 h-9 rounded-full" />
            </div>
          </div>

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold">Profit And Loss</h2>
              {["All Clients", "Last 30 Days", "Currency"].map((f) => (
                <div key={f} className="flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm shadow-sm">
                  {f} <ChevronDown size={14} />
                </div>
              ))}
            </div>
            <Button className="rounded-xl">
              <Download size={14} className="mr-2" /> Export
            </Button>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            {[
              { title: "Total Revenue", value: "$52,340" },
              { title: "Expenses", value: "$21,920" },
              { title: "Profit", value: "$30,420" },
              { title: "Margin", value: "58%" },
            ].map((card, i) => (
              <Card key={i} className="rounded-2xl shadow-md">
                <CardContent className="p-5">
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <h3 className="text-2xl font-bold mt-2">{card.value}</h3>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart + AI */}
          <div className="grid grid-cols-3 gap-5 mb-8">
            <Card className="col-span-2 rounded-2xl shadow-md">
              <CardContent className="p-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <XAxis dataKey="name" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="profit" />
                    <Bar dataKey="expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="rounded-2xl shadow-md bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold">AI Insights</h3>
                <p className="text-sm opacity-90">
                  Your profit increased by 12% compared to last month.
                </p>
                <p className="text-sm opacity-90">
                  Expenses are rising in Marketing (+8%). Consider optimization.
                </p>
                <Button variant="secondary" className="mt-2 text-black">
                  View Recommendations
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Invoices</h3>
              <table className="w-full text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="text-left">Company</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Google", "$150", "Paid"],
                    ["Flipkart", "$100", "Pending"],
                    ["Spotify", "$160", "Overdue"],
                  ].map((row, i) => (
                    <tr key={i} className="border-t">
                      {row.map((cell, j) => (
                        <td key={j} className="py-3">
                          {j === 2 ? (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                cell === "Paid"
                                  ? "bg-green-100 text-green-600"
                                  : cell === "Pending"
                                  ? "bg-yellow-100 text-yellow-600"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {cell}
                            </span>
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
