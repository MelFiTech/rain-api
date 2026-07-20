import { cn } from "@/lib/utils";

export const DATA_TABLE_EMPTY_MIN_HEIGHT = "min-h-[min(360px,45vh)]";

export function dataTableBodyClassName(isEmpty: boolean): string {
  return cn(
    "min-h-0 flex-1 -mx-1 px-1",
    isEmpty
      ? "flex flex-col items-center justify-center"
      : "overflow-x-auto overflow-y-auto no-scrollbar [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-card",
  );
}
