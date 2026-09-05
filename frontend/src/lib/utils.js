import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class merger the registry components expect at "@/lib/utils". */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
