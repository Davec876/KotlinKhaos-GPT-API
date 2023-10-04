// The types declarations are broken on this library see https://github.com/kriasoft/web-auth-library/issues/18
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getIdToken, getAccessToken, verifyIdToken } from 'web-auth-library/google';
import firebaseSecret from '../../firebase-secret.json';
import type { Env } from '../index';

// Sourced from https://github.com/kriasoft/web-auth-library/blob/main/google/idToken.ts#L249
export interface FirebaseUserToken {
	sub: string;
	user_id: string;
	email?: string;
	email_verified?: boolean;
	name?: string;
}

export async function verifyToken(token: string, ctx: ExecutionContext): Promise<FirebaseUserToken> {
	return await verifyIdToken({
		env: { GOOGLE_CLOUD_PROJECT: firebaseSecret.project_id },
		idToken: token,
		waitUntil: ctx.waitUntil,
	});
}

export async function getDebugToken(env: Env) {
	// Generate debug token if no token supplied and in debug mode
	const tokenRes = await getIdToken({
		credentials: JSON.stringify(firebaseSecret),
		uid: 'E5Ptdo8YRnSFOO1tKk502ksP2322',
		apiKey: env.FIREBASE_API_KEY,
	});
	return tokenRes.idToken as string;
}

// export async function getServiceToken() {
// This method advises us to use waitUntil, however it doesn't seem to work properly on first request
// return (await getAccessToken({
// 	credentials: JSON.stringify(firebaseSecret), // GCP service account key (JSON)
// 	scope: 'https://www.googleapis.com/auth/cloud-platform',
// })) as string;
// }

// export async function getFirestoreData(env: Env) {
// 	const idToken = await getIdToken({
// 		credentials: JSON.stringify(firebaseSecret),
// 		uid: 1,
// 		apiKey: env.FIREBASE_API_KEY,
// 	});

// 	const prefixURL = `https://firestore.googleapis.com/v1/projects/${env.GOOGLE_CLOUD_PROJECT}/databases/(default)/documents`;
// 	const res = await fetch(`${prefixURL}/cities/LA`, {
// 		headers: { Authorization: `Bearer ${idToken}` },
// 	});
// }
