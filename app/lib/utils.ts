import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function seededRandomBackground(seed: string) {
  const backgroundClasses = [
    "border-slate-100 dark:border-slate-900 bg-slate-50/25",
    "border-gray-100 dark:border-gray-900 bg-gray-50/25",
    "border-zinc-100 dark:border-zinc-900 bg-zinc-50/25",
    "border-neutral-100 dark:border-neutral-900 bg-neutral-50/25",
    "border-stone-100 dark:border-stone-900 bg-stone-50/25",
    // "border-red-100 dark:border-red-900 bg-red-50/25",
    // "border-orange-100 dark:border-orange-900 bg-orange-50/25",
    // "border-amber-100 dark:border-amber-900 bg-amber-50/25",
    // "border-yellow-100 dark:border-yellow-900 bg-yellow-50/25",
    // "border-lime-100 dark:border-lime-900 bg-lime-50/25",
    // "border-green-100 dark:border-green-900 bg-green-50/25",
    // "border-emerald-100 dark:border-emerald-900 bg-emerald-50/25",
    // "border-teal-100 dark:border-teal-900 bg-teal-50/25",
    // "border-cyan-100 dark:border-cyan-900 bg-cyan-50/25",
    // "border-sky-100 dark:border-sky-900 bg-sky-50/25",
    // "border-blue-100 dark:border-blue-900 bg-blue-50/25",
    // "border-indigo-100 dark:border-indigo-900 bg-indigo-50/25",
    // "border-violet-100 dark:border-violet-900 bg-violet-50/25",
    // "border-purple-100 dark:border-purple-900 bg-purple-50/25",
    // "border-fuchsia-100 dark:border-fuchsia-900 bg-fuchsia-50/25",
    // "border-pink-100 dark:border-pink-900 bg-pink-50/25",
    // "border-rose-100 dark:border-rose-900 bg-rose-50/25",
  ];

  const hash = seed.split("").reduce((acc, char) => {
    const charCode = char.charCodeAt(0);
    return ((acc << 5) - acc + charCode) | 0;
  }, 0);

  const colorIndex = Math.abs(hash) % backgroundClasses.length;

  return backgroundClasses[colorIndex];
}
