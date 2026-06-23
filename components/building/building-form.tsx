"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { buildingSchema, type BuildingInput } from "@/lib/schemas";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function BuildingForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<BuildingInput>({ resolver: zodResolver(buildingSchema) });

  async function onValid(v: BuildingInput) {
    const res = await fetch("/api/buildings", {
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
      <Field label="건물 이름" {...register("name")} error={errors.name?.message} />
      <Field label="주소" {...register("address")} error={errors.address?.message} />
      {errors.root && (
        <p className="text-[13px] text-danger">{errors.root.message}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "생성 중…" : "건물 추가"}
      </Button>
    </form>
  );
}
