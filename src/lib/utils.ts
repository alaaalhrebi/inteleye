import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely
 *
 * Example:
 * cn(
 *   "px-4 py-2",
 *   active && "bg-green-600",
 *   className
 * )
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}