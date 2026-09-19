"use client";

import { useState, useRef, useEffect } from "react";

type RfidItem = {
    code: string;
    scannedAt: string;
};

export default function ScanRfidPage() {
    const [input, setInput] = useState("");
    const [items, setItems] = useState<RfidItem[]>([]);
    const [duplicateFlash, setDuplicateFlash] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Garde le focus sur l'input (le scanner "tape" comme un clavier)
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleScan = (rawCode: string) => {
        const code = rawCode.trim();
        if (!code) return;

        setItems((prev) => {
            // 🔒 Anti-doublon en live
            if (prev.some((item) => item.code === code)) {
                setDuplicateFlash(code);
                setTimeout(() => setDuplicateFlash(null), 800);
                return prev; // on ne modifie pas le tableau
            }

            return [
                ...prev,
                { code, scannedAt: new Date().toLocaleTimeString("fr-FR") },
            ];
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleScan(input);
            setInput("");
        }
    };

    // Sécurité : si le scanner n'envoie pas d'Enter, on peut auto-valider après inactivité
    // (décommente si besoin)
    // useEffect(() => {
    //   if (!input) return;
    //   const t = setTimeout(() => {
    //     handleScan(input);
    //     setInput("");
    //   }, 150);
    //   return () => clearTimeout(t);
    // }, [input]);

    const removeItem = (code: string) => {
        setItems((prev) => prev.filter((i) => i.code !== code));
    };

    const clearAll = () => setItems([]);

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-6 text-2xl font-bold text-gray-900">
                    Scan RFID
                </h1>

                {/* Champ de scan */}
                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        Scannez un article…
                    </label>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="En attente du scan RFID…"
                        autoFocus
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-mono text-lg shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                    {duplicateFlash && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                            ⚠️ Doublon ignoré : <span className="font-mono">{duplicateFlash}</span>
                        </p>
                    )}
                </div>

                {/* Stats */}
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{items.length}</span>{" "}
                        article{items.length > 1 ? "s" : ""} scanné
                        {items.length > 1 ? "s" : ""}
                    </p>
                    {items.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
                        >
                            Tout effacer
                        </button>
                    )}
                </div>

                {/* Tableau */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                            <tr>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Code RFID</th>
                                <th className="px-4 py-3">Heure</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-8 text-center text-gray-400"
                                    >
                                        Aucun article scanné pour l'instant
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr
                                        key={item.code}
                                        className="border-t border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-3 font-mono font-medium text-gray-900">
                                            {item.code}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {item.scannedAt}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => removeItem(item.code)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Supprimer"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                    💡 Les doublons sont automatiquement ignorés en temps réel.
                </p>
            </div>
        </main>
    );
}