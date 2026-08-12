export interface User {
  id: number;
  nickname: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  providers?: string[];
}

export interface OAuthAccount {
  id: number;
  user_id: number;
  provider: string;
  provider_user_id: string;
  provider_email: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

export interface Score {
  id: number;
  user_id: number | null;
  nickname: string;
  avatar_url: string | null;
  game_id: string;
  score: number;
  created_at: string;
}

export interface UserPersonalBestAggregate {
  game_id: string;
  min_score: number;
  max_score: number;
}

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByOAuth(provider: string, providerUserId: string): Promise<User | null>;
  findOrCreateUser(data: {
    provider: string;
    providerUserId: string;
    email: string | null;
    nickname: string;
    avatarUrl: string | null;
  }): Promise<User>;
}

export interface SessionRepository {
  createSession(userId: number, ttlDays?: number): Promise<Session>;
  findSession(sessionId: string): Promise<{ session: Session; user: User } | null>;
  deleteSession(sessionId: string): Promise<void>;
}

export interface ScoreRepository {
  saveScore(data: {
    userId?: number | null;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
  }): Promise<Score>;
  getLeaderboard(gameId: string, limit?: number, direction?: "asc" | "desc"): Promise<Score[]>;
  getUserPersonalBests(userId: number): Promise<UserPersonalBestAggregate[]>;
}
