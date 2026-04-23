"use client";

export default function Funnel() {
  const steps = [
    { label: "Messages", value: 1200 },
    { label: "Replies", value: 640 },
    { label: "Leads", value: 300 },
    { label: "Sales", value: 180 },
  ];

  return (
    <div className="bg-card border rounded-2xl p-4">
      <h3 className="font-semibold mb-4">Conversion Funnel</h3>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm">
              <span>{s.label}</span>
              <span>{s.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${(s.value / steps[0].value) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}