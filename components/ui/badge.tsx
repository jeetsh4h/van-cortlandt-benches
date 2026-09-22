import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 w-fit items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
  {
    variants: {
      variant: {
        available: "border-primary/20 bg-primary/10 text-primary",
        adopted: "border-foreground/10 bg-foreground text-background",
        progress: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-background/80 text-foreground backdrop-blur-md",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
