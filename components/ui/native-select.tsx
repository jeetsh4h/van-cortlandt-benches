import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type NativeSelectProps = Omit<ComponentProps<"select">, "size">;

function NativeSelect({ className, ...props }: NativeSelectProps) {
  return (
    <div
      className={cn(
        "group/native-select relative w-full has-[select:disabled]:opacity-50",
        className,
      )}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        className="h-11 w-full appearance-none rounded-lg border border-input bg-input/30 py-2 pr-9 pl-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed"
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

function NativeSelectOption(props: ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />;
}

export { NativeSelect, NativeSelectOption };
