export type ClassValue = string | number | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values
    .filter((value) => value !== false && value !== null && value !== undefined && value !== '')
    .join(' ')
}
