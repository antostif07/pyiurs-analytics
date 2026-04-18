"use client";

import { getSansCodeSales } from "@/app/actions/sans-code";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

export function useSansCode() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const query = useQuery({
    queryKey: ["sans-code-sales", from, to],
    queryFn: () => getSansCodeSales({ from, to }),

    enabled: !!from && !!to,
    staleTime: 30_000, // évite refetch inutile
    placeholderData: keepPreviousData,  
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["sans-code-sales"],
      refetchType: "active",
    });
  };

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching, // 🔥 utile UX
    refreshAll,
    lastUpdatedAt: query.dataUpdatedAt
      ? new Date(query.dataUpdatedAt)
      : null,
  };
}