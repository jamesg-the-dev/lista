import { clsx, type ClassValue } from "clsx";
import { useEffect } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title}`;

    // Optional: Restores the previous title when the page changes
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
