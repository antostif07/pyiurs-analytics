import { format, getDaysInMonth } from "date-fns";

/**
 * Calcule de manière symétrique les progressions hebdomadaires (Delta WoW)
 */
export function computeTableMetrics<T extends { weeks?: Record<string, number> }>(items: T[]) {
    return items.map((item) => {
        const weeks = item.weeks || {};
        const weekKeys = Object.keys(weeks).sort();
        const lastWeek = weekKeys[weekKeys.length - 1];
        const prevWeek = weekKeys[weekKeys.length - 2];

        const valLast = weeks[lastWeek] || 0;
        const valPrev = weeks[prevWeek] || 0;

        return {
            ...item,
            deltaWoW: valPrev > 0 ? Math.round(((valLast - valPrev) / valPrev) * 100) : 0,
            deltaYoY: 0,
        };
    });
}

/**
 * Calcule la somme des totaux pour les boutiques ou segments
 */
export function calculateTotals(shopPerformance: any[]) {
    return {
        today: shopPerformance.reduce((acc, curr) => acc + (curr.today || 0), 0),
        yesterday: shopPerformance.reduce((acc, curr) => acc + (curr.yesterday || 0), 0),
        weekly: shopPerformance.reduce((acc, curr) => acc + (curr.weekly || 0), 0),
        mtd: shopPerformance.reduce((acc, curr) => acc + (curr.mtd || 0), 0),
        budget: shopPerformance.reduce((acc, curr) => acc + (curr.budgetMensuel || 0), 0),
    };
}

/**
 * Calcule le rythme de vente (Run-Rate Pace) et la projection fin de mois
 */
export function calculatePaceMetrics(
    month: string,
    year: string,
    totals: { mtd: number; budget: number }
) {
    const now = new Date();
    const selectedMonthInt = parseInt(month, 10);
    const selectedYearInt = parseInt(year, 10);
    const selectedDate = new Date(selectedYearInt, selectedMonthInt - 1, 1);

    const daysInSelectedMonth = getDaysInMonth(selectedDate);
    const isCurrentMonth = month === format(now, "MM") && year === format(now, "yyyy");
    const daysPassed = isCurrentMonth ? Math.max(now.getDate(), 1) : daysInSelectedMonth;

    // Estimation des ventes en fin de mois au rythme actuel
    const runRateForecast = Math.round((totals.mtd / daysPassed) * daysInSelectedMonth);
    const budgetRealizationPercent = totals.budget > 0
        ? Math.round((totals.mtd / totals.budget) * 100)
        : 0;

    const dailyBudget = Math.round(totals.budget / daysInSelectedMonth);
    const weeklyBudget = Math.round((totals.budget / daysInSelectedMonth) * 7);

    return {
        daysInSelectedMonth,
        daysPassed,
        runRateForecast,
        budgetRealizationPercent,
        dailyBudget,
        weeklyBudget,
    };
}