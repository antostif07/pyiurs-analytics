"use server";

const META_URL = "https://graph.facebook.com";
const TOKEN = process.env.WHATSAPP_TOKEN;
const AD_ACCOUNT = process.env.META_APP_ID; // Format: act_xxxxxxxx
const VERSION = process.env.META_API_VERSION || "v19.0";

export async function getMetaCampaigns(dateRange: { from: string; to: string }) {
  // Construction du filtre temporel pour Meta
  const time_range = JSON.stringify({
    since: dateRange.from,
    until: dateRange.to,
  });

  // Les champs que nous voulons récupérer
  const fields = [
    "id",
    "name",
    "status",
    "objective",
    "insights{spend,impressions,clicks,conversions,cpc,ctr}",
    "adsets{name,daily_budget,billing_event}"
  ].join(",");

  try {
    const response = await fetch(
      `${META_URL}/${VERSION}/${AD_ACCOUNT}/campaigns?fields=${fields}&time_range=${time_range}&access_token=${TOKEN}`,
      { next: { revalidate: 3600 } } // Cache d'une heure
    );

    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message);
    }

    // Transformation des données Meta pour notre UI
    return json.data.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status.toLowerCase(), // ACTIVE, PAUSED
      channel: "Facebook",
      budget: parseFloat(c.adsets?.data[0]?.daily_budget || 0) / 100, // Meta renvoie en centimes
      spend: parseFloat(c.insights?.data[0]?.spend || 0),
      impressions: parseInt(c.insights?.data[0]?.impressions || 0),
      clicks: parseInt(c.insights?.data[0]?.clicks || 0),
      ctr: parseFloat(c.insights?.data[0]?.ctr || 0).toFixed(2),
      conversions: parseInt(c.insights?.data[0]?.conversions?.[0]?.value || 0),
    }));
  } catch (error) {
    console.error("Meta API Error:", error);
    return [];
  }
}