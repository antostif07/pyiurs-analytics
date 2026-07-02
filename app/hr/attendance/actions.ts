"use server";

import { createClient } from "@/lib/supabase/server";
import { AttendanceStatus } from "@/lib/supabase/types";

export type AttendanceImport = {
    employee_id: string;
    date: string;
    check_in: string | null;
    status: AttendanceStatus;
    is_late: boolean;
};


export async function saveAttendancesAction(
    attendances: AttendanceImport[]
) {
    const supabase = await createClient();

    console.group("========== IMPORT ATTENDANCES ==========");
    console.time("Import");

    try {
        if (attendances.length === 0) {
            return {
                success: false,
                message: "Aucune donnée.",
            };
        }

        console.log("Nombre total :", attendances.length);

        const batchSize = 500;
        const totalBatches = Math.ceil(attendances.length / batchSize);

        let imported = 0;

        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize;
            const end = start + batchSize;

            const batch = attendances.slice(start, end);

            console.group(`Batch ${i + 1}/${totalBatches}`);
            console.time(`Batch ${i + 1}`);

            const {
                error,
                status,
                statusText,
            } = await supabase
                .from("attendances")
                .upsert(batch, {
                    onConflict: "employee_id,date",
                });

            console.log({
                status,
                statusText,
                lignes: batch.length,
            });

            if (error) {
                console.error(error);

                console.groupEnd();

                return {
                    success: false,
                    message: error.message,
                };
            }

            imported += batch.length;

            console.log(
                `Progression : ${imported}/${attendances.length}`
            );

            console.timeEnd(`Batch ${i + 1}`);
            console.groupEnd();
        }

        console.timeEnd("Import");
        console.groupEnd();

        return {
            success: true,
            imported,
        };
    } catch (e: any) {
        console.error(e);

        console.groupEnd();

        return {
            success: false,
            message: e.message,
        };
    }
}