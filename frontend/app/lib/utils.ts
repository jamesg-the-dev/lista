import { clsx, type ClassValue } from 'clsx';
import { DateTime } from 'luxon';
import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

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

export function initials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);
}

export function formatDate(iso: string): string {
  return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}
