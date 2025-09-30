import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-5xl font-bold">Pyiurs Analytics</h1>
      <div className="grid place-items-center ">
        <Link href="/control-stock-beauty">
          <Card className="p-4">
            Control Stock Beauty
          </Card>
        </Link>
      </div>
    </main>
  );
}
