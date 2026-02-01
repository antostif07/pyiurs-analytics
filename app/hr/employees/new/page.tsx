import EmployeeForm from "../EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nouvel Employé</h1>
      <EmployeeForm />
    </div>
  );
}