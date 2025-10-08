export function formatTimeShort(dateString: string): string {
  const past = new Date(dateString);
  const now = new Date();

  const diff = now.getTime() - past.getTime();
  if (diff < 0) return "0s";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    const remainingMonths = months % 12;
    return `${years}a${remainingMonths > 0 ? ` et ${remainingMonths}m` : ""}`;
  }

  if (months > 0) {
    const remainingDays = days % 30;
    return `${months}m${remainingDays > 0 ? ` et ${remainingDays}j` : ""}`;
  }

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}j${remainingHours > 0 ? ` et ${remainingHours}h` : ""}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? ` et ${remainingMinutes}m` : ""}`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds > 0 ? ` et ${remainingSeconds}s` : ""}`;
  }

  return `${seconds}s`;
}
