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

export async function getLeaderboard(limitCount = 5): Promise<LeaderboardEntry[]> {
  const q = query(
    leaderboardCol,
    orderBy('wins', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(docSnap => docSnap.data() as LeaderboardEntry)
    .sort((a, b) => (b.wins - a.wins) || (a.updatedAt - b.updatedAt) || a.displayName.localeCompare(b.displayName));
}
