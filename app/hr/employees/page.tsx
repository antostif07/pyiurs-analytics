
import { Plus } from "lucide-react";
import EmployeeList from "./EmployeeList";

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Effectif Personnel</h1>
          <p className="text-sm text-gray-500">Gérez les profils, salaires et liaisons Odoo</p>
        </div>
      </div>

      <EmployeeList />
    </div>
  );
}