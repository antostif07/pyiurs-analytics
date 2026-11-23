"use client";

import { useMemo } from "react";
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseTransferFilters, serializeTransferFilters } from "../filters";
import type {
    StoreTransferRow,
    StoreTransfersReportData,
    TransferFileMeta,
} from "../types";

export function useStoreTransfers(options?: {
    initialData?: StoreTransfersReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const searchParams = useSearchParams();

    const filters = useMemo(
        () => parseTransferFilters(Object.fromEntries(searchParams.entries())),
        [searchParams],
    );

    const queryString = useMemo(
        () => serializeTransferFilters(filters).toString(),
        [filters],
    );

    const matchesInitial =
        options?.initialData !== undefined &&
        options.initialQueryKeyString === queryString;

    const query = useQuery<StoreTransfersReportData>({
        queryKey: ["controls-store-transfers", queryString],
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/controls/store-transfers?${queryString}`, {
                signal,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Impossible de charger les transferts");
            }
            return res.json();
        },
        initialData: matchesInitial ? options?.initialData : undefined,
        initialDataUpdatedAt: matchesInitial ? options?.initialFetchedAt : undefined,
        placeholderData: keepPreviousData,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return { ...query, filters };
}

function patchTransferInCaches(
    qc: ReturnType<typeof useQueryClient>,
    saleOrderId: number,
    updater: (row: StoreTransferRow) => StoreTransferRow,
) {
    qc.setQueriesData<StoreTransfersReportData>(
        { queryKey: ["controls-store-transfers"] },
        (old) => {
            if (!old) return old;
            let changed = false;
            const transfers = old.transfers.map((row) => {
                if (row.saleOrderId !== saleOrderId) return row;
                changed = true;
                return updater(row);
            });
            if (!changed) return old;
            return {
                ...old,
                transfers,
                kpis: {
                    totalTransfers: transfers.length,
                    withPoCount: transfers.filter((t) => t.generatedPo !== null).length,
                    dpOutCount: transfers.filter((t) => t.dpOut !== null).length,
                    dpInCount: transfers.filter((t) => t.dpIn !== null).length,
                    validatedCount: transfers.filter((t) => t.isValidated).length,
                },
            };
        },
    );
}

export function useUploadTransferFile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            saleOrderId,
            kind,
            file,
        }: {
            saleOrderId: number;
            kind: "dp_out" | "dp_in";
            file: File;
        }): Promise<{
            success: true;
            saleOrderId: number;
            kind: "dp_out" | "dp_in";
            file: TransferFileMeta;
        }> => {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(
                `/api/controls/store-transfers/${saleOrderId}/file?kind=${kind}`,
                { method: "POST", body: fd },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de l'envoi");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchTransferInCaches(qc, data.saleOrderId, (row) =>
                data.kind === "dp_out"
                    ? { ...row, dpOut: data.file }
                    : { ...row, dpIn: data.file },
            );
        },
    });
}

export function useValidateTransfer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (saleOrderId: number): Promise<{
            success: true;
            saleOrderId: number;
            isValidated: boolean;
            validatedAt: string;
            validatedBy: string;
        }> => {
            const res = await fetch(
                `/api/controls/store-transfers/${saleOrderId}/validate`,
                { method: "POST" },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec validation");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchTransferInCaches(qc, data.saleOrderId, (row) => ({
                ...row,
                isValidated: true,
                validatedAt: data.validatedAt,
                validatedBy: data.validatedBy,
            }));
        },
    });
}

export function useUnvalidateTransfer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (saleOrderId: number) => {
            const res = await fetch(
                `/api/controls/store-transfers/${saleOrderId}/validate`,
                { method: "DELETE" },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec suppression");
            }
            return res.json();
        },
        onSuccess: (_data, saleOrderId) => {
            patchTransferInCaches(qc, saleOrderId, (row) => ({
                ...row,
                isValidated: false,
                validatedAt: null,
                validatedBy: null,
            }));
        },
    });
}