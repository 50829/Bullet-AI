import type { ComponentProps } from "react";
import {
  OptionCard,
  OptionGrid,
} from "../../../../shared/components/ui/OptionCard";

export function PreferenceOptionCard(props: ComponentProps<typeof OptionCard>) {
  return <OptionCard {...props} />;
}

export function OptionGroup(props: ComponentProps<typeof OptionGrid>) {
  return <OptionGrid {...props} />;
}
