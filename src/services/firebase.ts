// The types declarations are broken on this library see https://github.com/kriasoft/web-auth-library/issues/18
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getIdToken, getAccessToken, verifyIdToken } from 'web-auth-library/google';
import firebaseSecret from '../../firebase-secret.json';
import type { Env } from '../index';

// Sourced from https://github.com/kriasoft/web-auth-library/blob/main/google/idToken.ts#L249
export interface FirebaseUserToken {
	readonly sub: string;
	readonly user_id: string;
	readonly email?: string;
	readonly email_verified?: boolean;
	readonly name?: string;
}

export async function verifyToken(token: string, ctx: ExecutionContext): Promise<FirebaseUserToken> {
	return await verifyIdToken({
		env: { GOOGLE_CLOUD_PROJECT: firebaseSecret.project_id },
		idToken: token,
		waitUntil: ctx.waitUntil,
	});
}

export async function getDebugUserToken(env: Env) {
	// Generate debug user token if no token supplied and in debug mode
	const tokenRes = await getIdToken({
		credentials: JSON.stringify(firebaseSecret),
		uid: 'Ey3M3insFkYi7eeKBLFnUMHlom32',
		apiKey: env.FIREBASE_API_KEY,
	});
	return tokenRes.idToken as string;
}

export async function getDebugInstructorToken(env: Env) {
	// Generate debug instructor token if no token supplied and in debug mode
	const tokenRes = await getIdToken({
		credentials: JSON.stringify(firebaseSecret),
		uid: 'qCe2yDD3M9epIkbUwSy77S9CXBt2',
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

interface UserDataFirebaseDB {
	readonly courseId: string;
	readonly name: string;
	readonly type: 'STUDENT' | 'INSTRUCTOR' | 'NONE';
}

export async function getUserDataFromFirebaseDB(userId: string, userBearerToken: string): Promise<UserDataFirebaseDB> {
	try {
		const prefixURL = `https://kotlin-khaos-default-rtdb.firebaseio.com`;
		return (await fetch(`${prefixURL}/users/${userId}.json?auth=${userBearerToken}`)).json();
	} catch (err) {
		throw new Error('Error fetching user data');
	}
}
