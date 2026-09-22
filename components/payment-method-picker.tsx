import {
  ChartNoAxesColumnIncreasing,
  CreditCard,
  HandHeart,
  Landmark,
  Mail,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import type { PaymentMethod } from "@/lib/bench-types";
import { paymentMethodLabels } from "@/lib/contribution";
import { cn } from "@/lib/utils";

type PaymentMethodPickerProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
};

const methods: Array<{ value: PaymentMethod; icon: LucideIcon }> = [
  { value: "card", icon: CreditCard },
  { value: "bank", icon: Landmark },
  { value: "zelle", icon: Smartphone },
  { value: "check", icon: Mail },
  { value: "stock", icon: ChartNoAxesColumnIncreasing },
  { value: "daf", icon: HandHeart },
];

export function PaymentMethodPicker({
  value,
  onChange,
}: PaymentMethodPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
      {methods.map((method) => {
        const Icon = method.icon;
        const selected = value === method.value;

        return (
          <button
            key={method.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left text-xs font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              selected
                ? "border-primary bg-primary/8 text-primary"
                : "border-border bg-card hover:bg-accent",
            )}
            onClick={() => onChange(method.value)}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {paymentMethodLabels[method.value]}
          </button>
        );
      })}
    </div>
  );
}
