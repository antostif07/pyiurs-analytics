import { getEmployees } from "../actions";
import EmployeesClient from "./employees-client";

export default async function EmployeesDirectoryPage() {
  // On charge uniquement la première page côté serveur pour le SEO/vitesse initiale
  const initialData = await getEmployees(1, 10, "", "name", "asc");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* On passe les données initiales à React Query */}
      <EmployeesClient initialData={initialData} />
    </div>
  );
}