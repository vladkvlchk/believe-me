import { Pool } from "pg";
import { config } from "../config";

const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      wallet TEXT PRIMARY KEY,
      twitter_id TEXT UNIQUE,
      twitter_username TEXT,
      twitter_avatar TEXT,
      linked_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function upsertProfile(
  wallet: string,
  twitter: { id: string; username: string; avatar: string }
) {
  await pool.query(
    `INSERT INTO profiles (wallet, twitter_id, twitter_username, twitter_avatar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (wallet) DO UPDATE SET
       twitter_id = $2,
       twitter_username = $3,
       twitter_avatar = $4,
       linked_at = NOW()`,
    [wallet.toLowerCase(), twitter.id, twitter.username, twitter.avatar]
  );
}

export async function getProfile(wallet: string) {
  const { rows } = await pool.query(
    "SELECT * FROM profiles WHERE wallet = $1",
    [wallet.toLowerCase()]
  );
  return rows[0] || null;
}

export async function searchProfiles(query: string) {
  const { rows } = await pool.query(
    `SELECT wallet, twitter_username, twitter_avatar, linked_at
     FROM profiles
     WHERE twitter_username ILIKE $1 OR wallet ILIKE $1
     ORDER BY linked_at DESC
     LIMIT 50`,
    [`%${query}%`]
  );
  return rows;
}

export async function getAllProfiles() {
  const { rows } = await pool.query(
    `SELECT wallet, twitter_username, twitter_avatar, linked_at
     FROM profiles
     ORDER BY linked_at DESC
     LIMIT 50`
  );
  return rows;
}
