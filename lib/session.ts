// lib/session.ts
import { sealData, unsealData } from 'iron-session';

const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionPassword) {
  throw new Error('SESSION_PASSWORD is not set');
}

export interface SessionData {
  userId: string;
  username: string;
  isLoggedIn: boolean;
}

export const sessionOptions = {
  password: sessionPassword,
  cookieName: 'pyiurs-analytics-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax' as const,
  },
};

// Version simplifiée pour getSession
export async function getSession(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookie(cookieHeader);
  const sessionCookie = cookies[sessionOptions.cookieName];
  
  if (!sessionCookie) {
    return null;
  }

  try {
    return await unsealData<SessionData>(sessionCookie, {
      password: sessionPassword!,
    });
  } catch {
    return null;
  }
}

// Fonction utilitaire pour parser les cookies
function parseCookie(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

export async function createSession(userId: string, username: string) {
  const session: SessionData = {
    userId,
    username,
    isLoggedIn: true,
  };

  return await sealData(session, {
    password: sessionPassword!,
    ...sessionOptions.cookieOptions,
  });
}

export async function destroySession() {
  return await sealData({}, {
    password: sessionPassword!,
    ...sessionOptions.cookieOptions,
    ttl: 0,
  });
}