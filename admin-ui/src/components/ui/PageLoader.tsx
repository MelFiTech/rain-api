import { RainMark } from "@/components/ui/primitives";

/** Full-viewport bootstrap loader (session restore / hard reload only). */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <RainMark className="h-10 w-10" />
        <div className="h-1 w-16 rounded-full skeleton" />
      </div>
    </div>
  );
}
