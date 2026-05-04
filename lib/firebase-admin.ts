import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Firebase Admin Auth を遅延初期化して返す。
 * 環境変数が設定されていない場合（ビルド時など）はエラーをスローする。
 */
export function getAdminAuth(): Auth {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin env vars が設定されていません (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)',
    );
  }

  const app = getApps().length === 0
    ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
    : getApps()[0];

  return getAuth(app);
}
