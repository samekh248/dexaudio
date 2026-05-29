import { cn } from "@/lib/utils";

interface AudioVisualizerIconProps {
  className?: string;
}

export function AudioVisualizerIcon({ className }: AudioVisualizerIconProps) {
  return (
    <span className={cn("eq-visualizer", className)} aria-hidden>
      <span className="eq-visualizer__bar" />
      <span className="eq-visualizer__bar" />
      <span className="eq-visualizer__bar" />
      <span className="eq-visualizer__bar" />
    </span>
  );
}
