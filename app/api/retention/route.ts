import { getRetentionAnalysis } from "@/app/crm/retention/actions";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthOffset = parseInt(searchParams.get("monthOffset") || "1");
    
    const data = await getRetentionAnalysis(monthOffset);
    return Response.json(data);
  } catch (error) {
    console.error("API Retention Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}