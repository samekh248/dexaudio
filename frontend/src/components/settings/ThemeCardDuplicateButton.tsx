import { Copy } from "lucide-react";
import type { ThemeColorSlots } from "@/lib/local-storage";
import {
  previewDuplicateLinkClass,
  themePreviewDuplicateLinkStyles,
} from "@/lib/theme-preview-card";

type Props = {
  colors: ThemeColorSlots;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
};

export function ThemeCardDuplicateButton({ colors, disabled, title, onClick }: Props) {
  return (
    <button
      type="button"
      className={previewDuplicateLinkClass}
      style={themePreviewDuplicateLinkStyles(colors)}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label="Duplicate theme"
    >
      <Copy className="h-4 w-4" aria-hidden />
    </button>
  );
}
