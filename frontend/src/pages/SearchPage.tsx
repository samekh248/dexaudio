import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/services/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

export function SearchPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => api.search(submitted),
    enabled: submitted.length > 0,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Artists, albums, tracks…" />
        <Button type="submit">Search</Button>
      </form>
      {isLoading && <p>Searching…</p>}
      {submitted && !isLoading && data && !data.albums.length && !data.tracks.length && (
        <EmptyState
          title="No results"
          description={`Nothing matched "${submitted}". Try a different artist, album, or track name.`}
        />
      )}
      {data && (data.albums.length > 0 || data.tracks.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="font-semibold mb-2">Albums</h2>
            <ul className="space-y-1">
              {data.albums.map((a) => (
                <li key={a.id}>
                  <Link to={`/albums/${a.id}`} className="hover:underline">
                    {a.title} — {a.artist}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold mb-2">Tracks</h2>
            <ul className="space-y-1">
              {data.tracks.map((t) => (
                <li key={t.id}>
                  {t.title} — {t.artist}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
