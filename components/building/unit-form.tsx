"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { unitSchema, type UnitInput } from "@/lib/schemas";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

// RHF input: string fields (floor as string before zod transform)
type UnitFormRaw = { name: string; floor: string };

export function UnitForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<UnitFormRaw, unknown, UnitInput>({ resolver: zodResolver(unitSchema) });

  async function onValid(v: UnitInput) {
    const res = await fetch(`/api/buildings/${buildingId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      reset();
      router.refresh();
    } else {
      const json = await res.json();
      setError("root", { message: json.message ?? "생성 실패" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="mb-4 flex flex-col gap-2">
      <Field label="호실 이름" {...register("name")} error={errors.name?.message} />
      <Field
        label="층"
        type="number"
        {...register("floor")}
        error={errors.floor?.message}
      />
      {errors.root && (
        <p className="text-[13px] text-danger">{errors.root.message}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "생성 중…" : "호실 추가"}
      </Button>
    </form>
  );
}
