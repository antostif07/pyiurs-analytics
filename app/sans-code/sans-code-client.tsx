"use client";
import Header from "./_components/header";
import SansCodeTable from "./_components/sans-code-table";

export default function SansCodeClient() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <Header onExport={() => {}} />
            <SansCodeTable />
        </div>
    );
}