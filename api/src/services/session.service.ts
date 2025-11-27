import { getDatabase } from './database.service';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface SessionData {
  userId: string;
  licenseKey: string;
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt?: Date;
}

interface ActiveSession {
  id: string;
  userId: string;
  licenseKey: string;
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  loginAt: Date;
  lastActivityAt: Date;
}

/**
 * Session Service
 * Manages one active session per license (user/license pair)
 * Automatically invalidates previous sessions when a new login occurs
 */

export const createSession = async (sessionData: SessionData): Promise<string> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const sessionId = uuidv4();

    // First, invalidate any existing active sessions for this user+license combination
    await invalidatePreviousSessions(sessionData.userId, sessionData.licenseKey);

    // Create new session
    const now = new Date();
    const expiresAt = sessionData.expiresAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    await db.run(
      `INSERT INTO sessions (id, userId, licenseKey, refreshToken, deviceInfo, ipAddress, userAgent, isActive, loginAt, lastActivityAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        sessionId,
        sessionData.userId,
        sessionData.licenseKey,
        sessionData.refreshToken,
        sessionData.deviceInfo || null,
        sessionData.ipAddress || null,
        sessionData.userAgent || null,
        now.toISOString(),
        now.toISOString(),
        expiresAt.toISOString(),
      ]
    );

    logger.info(
      `Session created: ${sessionId} for user ${sessionData.userId} with license ${sessionData.licenseKey}`
    );

    return sessionId;
  } catch (error: any) {
    logger.error('Error creating session:', error);
    throw error;
  }
};

/**
 * Invalidate all previous sessions for a user+license combination
 * Called when user logs in again (prevents concurrent sessions)
 */
export const invalidatePreviousSessions = async (
  userId: string,
  licenseKey: string
): Promise<number> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const result = await db.run(
      `UPDATE sessions 
       SET isActive = 0 
       WHERE userId = ? AND licenseKey = ? AND isActive = 1`,
      [userId, licenseKey]
    );

    const invalidatedCount = result.changes || 0;

    if (invalidatedCount > 0) {
      logger.info(
        `Invalidated ${invalidatedCount} previous session(s) for user ${userId} (license: ${licenseKey})`
      );
    }

    return invalidatedCount;
  } catch (error: any) {
    logger.error('Error invalidating sessions:', error);
    throw error;
  }
};

/**
 * Get active session by refresh token
 */
export const getSessionByRefreshToken = async (
  refreshToken: string
): Promise<ActiveSession | null> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    const session = await db.get(
      `SELECT * FROM sessions 
       WHERE refreshToken = ? 
       AND isActive = 1 
       AND expiresAt > ?
       LIMIT 1`,
      [refreshToken, now]
    );

    return session || null;
  } catch (error: any) {
    logger.error('Error getting session:', error);
    throw error;
  }
};

/**
 * Get all active sessions for a user
 */
export const getUserActiveSessions = async (userId: string): Promise<ActiveSession[]> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    const sessions = await db.all(
      `SELECT * FROM sessions 
       WHERE userId = ? 
       AND isActive = 1 
       AND expiresAt > ?
       ORDER BY lastActivityAt DESC`,
      [userId, now]
    );

    return sessions || [];
  } catch (error: any) {
    logger.error('Error getting user sessions:', error);
    throw error;
  }
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = async (sessionId: string): Promise<boolean> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    const result = await db.run(
      `UPDATE sessions 
       SET lastActivityAt = ? 
       WHERE id = ? AND isActive = 1`,
      [now, sessionId]
    );

    return (result.changes || 0) > 0;
  } catch (error: any) {
    logger.error('Error updating session activity:', error);
    throw error;
  }
};

/**
 * Logout session (mark as inactive)
 */
export const logoutSession = async (sessionId: string): Promise<boolean> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const result = await db.run(
      `UPDATE sessions SET isActive = 0 WHERE id = ?`,
      [sessionId]
    );

    if ((result.changes || 0) > 0) {
      logger.info(`Session ${sessionId} logged out`);
    }

    return (result.changes || 0) > 0;
  } catch (error: any) {
    logger.error('Error logging out session:', error);
    throw error;
  }
};

/**
 * Delete expired sessions (cleanup)
 */
export const deleteExpiredSessions = async (): Promise<number> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    const result = await db.run(
      `DELETE FROM sessions WHERE expiresAt < ?`,
      [now]
    );

    const deletedCount = result.changes || 0;

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} expired session(s)`);
    }

    return deletedCount;
  } catch (error: any) {
    logger.error('Error deleting expired sessions:', error);
    throw error;
  }
};

/**
 * Verify session is valid (active, not expired, refresh token valid)
 */
export const isSessionValid = async (
  sessionId: string,
  refreshToken: string
): Promise<boolean> => {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    const session = await db.get(
      `SELECT id FROM sessions 
       WHERE id = ? 
       AND refreshToken = ? 
       AND isActive = 1 
       AND expiresAt > ?`,
      [sessionId, refreshToken, now]
    );

    return !!session;
  } catch (error: any) {
    logger.error('Error verifying session:', error);
    return false;
  }
};

export default {
  createSession,
  invalidatePreviousSessions,
  getSessionByRefreshToken,
  getUserActiveSessions,
  updateSessionActivity,
  logoutSession,
  deleteExpiredSessions,
  isSessionValid,
};
