import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { GAME_MANIFEST_MAP } from "@owogg/core";
import { useAuth } from "../auth";
import {
  getGuestPersonalization,
  saveGuestPersonalization,
  clearGuestPersonalization,
} from "./storage";
import {
  fetchPersonalizationStateApi,
  addFavoriteApi,
  removeFavoriteApi,
  recordRecentPlayApi,
  importGuestPersonalizationApi,
} from "./api";

export interface PersonalizationContextValue {
  favoriteGameIds: string[];
  recentPlays: { gameId: string; lastPlayedAt: string }[];
  isFavorite: (gameId: string) => boolean;
  toggleFavorite: (gameId: string) => Promise<void>;
  recordRecentPlay: (gameId: string) => Promise<void>;
  isLoading: boolean;
}

const PersonalizationContext = createContext<PersonalizationContextValue | undefined>(undefined);

function isValidGame(gameId: string): boolean {
  if (!gameId || typeof gameId !== "string") return false;
  const manifest = GAME_MANIFEST_MAP[gameId];
  return Boolean(manifest && manifest.status === "published");
}

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const { user, openLoginModal } = useAuth();
  const [favoriteGameIds, setFavoriteGameIds] = useState<string[]>([]);
  const [recentPlays, setRecentPlays] = useState<{ gameId: string; lastPlayedAt: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const prevUserRef = useRef<number | null>(null);

  // Initialize or Sync Personalization State
  const loadState = useCallback(async () => {
    setIsLoading(true);
    if (user) {
      // User is logged in: perform one-time guest recent-plays import (favorites are NOT imported).
      const guestData = getGuestPersonalization();
      const hasGuestData = guestData.recentPlays.length > 0;

      if (hasGuestData) {
        try {
          const imported = await importGuestPersonalizationApi({
            guestRecentPlays: guestData.recentPlays,
          });
          setFavoriteGameIds(imported.favoriteGameIds.filter(isValidGame));
          setRecentPlays(imported.recentPlays.filter((r) => isValidGame(r.gameId)));
          clearGuestPersonalization();
        } catch {
          // If import fails, fallback to fetching server state without losing guest storage
          try {
            const serverState = await fetchPersonalizationStateApi();
            setFavoriteGameIds(serverState.favoriteGameIds.filter(isValidGame));
            setRecentPlays(serverState.recentPlays.filter((r) => isValidGame(r.gameId)));
          } catch {
            setRecentPlays(guestData.recentPlays.filter((r) => isValidGame(r.gameId)));
          }
        }
      } else {
        try {
          const serverState = await fetchPersonalizationStateApi();
          setFavoriteGameIds(serverState.favoriteGameIds.filter(isValidGame));
          setRecentPlays(serverState.recentPlays.filter((r) => isValidGame(r.gameId)));
        } catch {
          setFavoriteGameIds([]);
          setRecentPlays([]);
        }
      }
    } else {
      // Guest User: favorites are login-only, so guest favorites are always empty.
      const guestData = getGuestPersonalization();
      setFavoriteGameIds([]);
      setRecentPlays(guestData.recentPlays.filter((r) => isValidGame(r.gameId)));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    // Only re-run loadState when user auth state actually changes
    const currentUserId = user ? user.id : null;
    if (prevUserRef.current !== currentUserId) {
      prevUserRef.current = currentUserId;
      loadState();
    }
  }, [user, loadState]);

  const isFavorite = useCallback(
    (gameId: string) => {
      return favoriteGameIds.includes(gameId);
    },
    [favoriteGameIds],
  );

  const toggleFavorite = useCallback(
    async (gameId: string) => {
      if (!isValidGame(gameId)) return;

      // Guests cannot favorite. Prompt login instead of persisting a guest favorite.
      if (!user) {
        openLoginModal();
        return;
      }

      const currentlyFav = favoriteGameIds.includes(gameId);
      const updatedFavs = currentlyFav
        ? favoriteGameIds.filter((id) => id !== gameId)
        : [...favoriteGameIds, gameId];

      setFavoriteGameIds(updatedFavs);

      try {
        if (currentlyFav) {
          await removeFavoriteApi(gameId);
        } else {
          await addFavoriteApi(gameId);
        }
      } catch {
        // Revert optimistic UI if server update fails
        setFavoriteGameIds(favoriteGameIds);
      }
    },
    [user, favoriteGameIds, openLoginModal],
  );

  const recordRecentPlay = useCallback(
    async (gameId: string) => {
      if (!isValidGame(gameId)) return;

      const now = new Date().toISOString();
      const filtered = recentPlays.filter((r) => r.gameId !== gameId);
      const updatedRecent = [{ gameId, lastPlayedAt: now }, ...filtered].slice(0, 12);

      setRecentPlays(updatedRecent);

      if (user) {
        try {
          await recordRecentPlayApi(gameId);
        } catch {
          // Non-critical background failure
        }
      } else {
        saveGuestPersonalization({
          recentPlays: updatedRecent,
        });
      }
    },
    [user, recentPlays],
  );

  return (
    <PersonalizationContext.Provider
      value={{
        favoriteGameIds,
        recentPlays,
        isFavorite,
        toggleFavorite,
        recordRecentPlay,
        isLoading,
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization(): PersonalizationContextValue {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error("usePersonalization must be used within a PersonalizationProvider");
  }
  return context;
}
