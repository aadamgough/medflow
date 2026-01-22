"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { getPatients } from "./api";

const patientsFetcher = async ([, options]: [
  string,
  { search?: string; limit?: number; offset?: number }
]) => {
  return getPatients(options);
};

export function usePatients(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    ["patients", options ?? {}],
    patientsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    patients: data?.patients ?? [],
    total: data?.total ?? 0,
    limit: data?.limit ?? 0,
    offset: data?.offset ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export function useAllPatients(limit = 100) {
  const { data, error, isLoading, mutate } = useSWR(
    ["patients", { limit }],
    patientsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    patients: data?.patients ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export async function invalidatePatientsCache() {
  await globalMutate(
    (key) => Array.isArray(key) && key[0] === "patients",
    undefined,
    { revalidate: true }
  );
}
