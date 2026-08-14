import { useRef, useState } from "react";
import { Link } from "react-router";
import { DiscordIcon } from "./DiscordIcon";
import { searchDiscordGuilds } from "../../features/discord/discordGuildApi";
import type { DiscordGuildDto } from "@owogg/contracts";
import { useI18n } from "../../features/i18n/I18nContext";
import { useClickOutside } from "../../hooks/useClickOutside";

/** Header icon listing PUBLIC-visibility registered Discord servers — lives next to the
 * favorites/language selector. Fetched lazily on first open (not on every page load) since the
 * header renders on every route. */
export function RegisteredServersMenu() {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [guilds, setGuilds] = useState<DiscordGuildDto[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && guilds === null) {
      searchDiscordGuilds(undefined, 8)
        .then((res) => setGuilds(res.guilds))
        .catch(() => setGuilds([]));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
        title={dict.registeredServers.ariaLabel}
        aria-label={dict.registeredServers.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <DiscordIcon className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={dict.registeredServers.ariaLabel}
          className="absolute right-0 mt-2 w-64 bg-surface-raised border border-border rounded-2xl shadow-2xl py-2 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-wider text-text-muted">
            {dict.registeredServers.title}
          </p>

          {guilds === null ? (
            <div className="px-4 py-3 text-xs text-text-muted animate-pulse">
              {dict.common.loading}
            </div>
          ) : guilds.length === 0 ? (
            <p className="px-4 py-3 text-xs text-text-muted">{dict.registeredServers.empty}</p>
          ) : (
            guilds.map((guild) => (
              <Link
                key={guild.guildId}
                to={`/discord/servers/${guild.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-overlay transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-brand/20 text-brand flex items-center justify-center font-black text-[10px] overflow-hidden shrink-0">
                  {guild.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    guild.name.slice(0, 2)
                  )}
                </div>
                <span className="truncate">{guild.name}</span>
              </Link>
            ))
          )}

          <Link
            to="/discord/servers"
            onClick={() => setOpen(false)}
            className="mt-1 border-t border-border/40 px-4 pt-2 text-[11px] font-bold text-brand-light hover:underline"
          >
            {dict.registeredServers.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
