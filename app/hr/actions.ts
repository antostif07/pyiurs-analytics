"use server";

export async function getHROverview(range: string) {
  // Simulation d'un délai réseau (ex: interrogation Supabase)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Données factices pour l'instant
  return {
    totalEmployees: 42,
    presentToday: 35,
    lateToday: 3,
    onLeave: 4,
    recentActivity: [
      { id: 1, user: "Jean Dupont", action: "Check-in", time: "08:02" },
      { id: 2, user: "Marie Claire", action: "Check-in", time: "08:15" },
    ]
  };
}