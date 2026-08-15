"use client";

import clsx from "clsx";
import { passwordStrength, validatePasswordPolicy } from "@/lib/passwordPolicy";

const STRENGTH_COLOR: Record<string, string> = {
  weak: "bg-red-500",
  fair: "bg-orange-500",
  good: "bg-yellow-500",
  strong: "bg-green-500",
};

export default function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label } = passwordStrength(password);
  const { errors } = validatePasswordPolicy(password);

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={clsx("h-1.5 flex-1 rounded-full", i < score ? STRENGTH_COLOR[label] : "bg-gray-200")}
          />
        ))}
      </div>
      <p className="mt-1 text-xs font-semibold capitalize text-gray-600">{label}</p>
      {errors.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {errors.map((err) => (
            <li key={err} className="text-xs text-brand">
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
