import { cn } from "@/lib/cn";

export function Logo({
  variant = "full",
  className
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  return (
    <img
      src="/webskitters-logo.svg"
      alt="Webskitters"
      className={cn(variant === "mark" ? "h-6 w-auto" : "h-8 w-auto", className)}
      draggable={false}
    />
  );
}
