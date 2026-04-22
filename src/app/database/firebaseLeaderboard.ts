import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  wins: number;
  avatar?: string;
  color?: string;
  updatedAt: number;
}

const leaderboardCol = collection(firebaseDb, 'leaderboard');

function toLeaderboardError(error: unknown): Error {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'permission-denied'
  ) {
    return new Error(
      'Leaderboard access is not enabled in Firestore yet. Deploy the Firestore rules so signed-in players can view it.'
    );
  }

  return error instanceof Error ? error : new Error('Failed to load leaderboard.');
}

export async function getLeaderboard(limitCount = 5): Promise<LeaderboardEntry[]> {
  try {
    const q = query(
      leaderboardCol,
      orderBy('wins', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(docSnap => docSnap.data() as LeaderboardEntry)
      .sort((a, b) => (b.wins - a.wins) || (a.updatedAt - b.updatedAt) || a.displayName.localeCompare(b.displayName));
  } catch (error) {
    throw toLeaderboardError(error);
  }
}
