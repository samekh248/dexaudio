import { Link } from "react-router-dom";
import { Library } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function BrowseAllTile() {
  return (
    <Link
      to="/albums/all"
      className="block w-[180px] shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Browse all albums"
    >
      <Card className="h-full overflow-hidden transition hover:shadow-md">
        <AspectRatio ratio={1}>
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-4 text-center">
            <Library className="h-10 w-10 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">Browse All Albums</span>
          </div>
        </AspectRatio>
        <CardContent className="p-2">
          <p className="text-center text-xs text-muted-foreground">A–Z library</p>
        </CardContent>
      </Card>
    </Link>
  );
}
