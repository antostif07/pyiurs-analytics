import AttendanceImportPage from "./import.page";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  const { data: employees, error } = await supabase.from('employees').select('*');

  if (error) {
    return <div>Une erreur s'est produite</div>
  }

  return <AttendanceImportPage employees={employees} />
}