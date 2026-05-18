import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/services/api-client";

export function AccountWidget() {
  const { data: account } = useQuery({
    queryKey: ["plex-account"],
    queryFn: async () => {
      try {
        return await api.getPlexAccount();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });

  if (!account) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" title={account.username}>
      {account.avatarUrl ? (
        <img src={account.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium">
          {account.username.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-[8rem] truncate sm:inline">{account.username}</span>
    </div>
  );
}
