"use client";
import { motion } from "framer-motion";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from "recharts";

const PERFORMANCE_HISTORY = [
  { date: 'Mon', revenue: 4000, spend: 2400 },
  { date: 'Tue', revenue: 3000, spend: 1398 },
  { date: 'Wed', revenue: 9800, spend: 3800 },
  { date: 'Thu', revenue: 3908, spend: 2800 },
  { date: 'Fri', revenue: 4800, spend: 1800 },
  { date: 'Sat', revenue: 13000, spend: 4300 },
  { date: 'Sun', revenue: 11000, spend: 3200 },
];

const CHANNEL_DISTRIBUTION = [
  { name: 'Facebook Ads', value: 5500, color: '#3b82f6' },
  { name: 'WhatsApp', value: 3500, color: '#10b981' },
  { name: 'Organic', value: 1200, color: '#f43f5e' },
];

export default function MarketingAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Revenue vs Spend */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">Performance Revenus vs Dépenses</h3>
        <p className="text-xs text-muted-foreground mb-4">Évolution hebdomadaire</p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={PERFORMANCE_HISTORY}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="spend" stroke="#94a3b8" fill="transparent" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Conversions par Canal */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">Distribution par Canal</h3>
        <p className="text-xs text-muted-foreground mb-4">Origine du Chiffre d'Affaires</p>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={CHANNEL_DISTRIBUTION} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
              {CHANNEL_DISTRIBUTION.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}