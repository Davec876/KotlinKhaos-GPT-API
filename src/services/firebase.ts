// The types declarations are broken on this library see https://github.com/kriasoft/web-auth-library/issues/18
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getIdToken, getAccessToken, verifyIdToken } from 'web-auth-library/google';
import firebaseSecret from '../../firebase-secret.json';
import type { Env } from '../index';
import type User from '../classes/User';
import type { DebugEnv } from '../../tests/config';

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

export async function getDebugUserToken(env: Env | DebugEnv) {
	// Generate debug user token if no token supplied and in debug mode
	const tokenRes = await getIdToken({
		credentials: JSON.stringify(firebaseSecret),
		uid: '3QnuKVaGnVY6pSQ8zmB8zXIZOLG2',
		apiKey: env.FIREBASE_API_KEY,
	});
	return tokenRes.idToken as string;
}

export async function getDebugInstructorToken(env: Env) {
	// Generate debug instructor token if no token supplied and in debug mode
	const tokenRes = await getIdToken({
		credentials: JSON.stringify(firebaseSecret),
		uid: 'ZhGV0HFZOiUORM5S84uSdc0VJhq1',
		apiKey: env.FIREBASE_API_KEY,
	});
	return tokenRes.idToken as string;
}

export async function getTokenForUserId(env: Env, userId: string) {
	const tokenRes = await getIdToken({
		credentials: JSON.stringify(firebaseSecret),
		uid: userId,
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

export interface CourseDataFirebaseDB {
	readonly id: string;
	readonly instructorId: User['id'];
	readonly name: string;
	readonly educationLevel: 'UNIVERSITY' | 'ELEMENTARY' | 'HIGH_SCHOOL' | 'NONE';
	readonly description: string;
	readonly studentIds: string[];
	readonly quizIds: string[];
}

export async function getCourseDataFromFirebaseDB(courseId: string, userBearerToken: string): Promise<CourseDataFirebaseDB> {
	try {
		const prefixURL = `https://kotlin-khaos-default-rtdb.firebaseio.com`;
		return (await fetch(`${prefixURL}/courses/${courseId}.json?auth=${userBearerToken}`)).json();
	} catch (err) {
		throw new Error('Error fetching course data');
	}
}

export async function saveCourseDataToFirebaseDB(courseData: CourseDataFirebaseDB, userBearerToken: string) {
	try {
		const prefixURL = `https://kotlin-khaos-default-rtdb.firebaseio.com`;
		await fetch(`${prefixURL}/courses/${courseData.id}.json?auth=${userBearerToken}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(courseData),
		});
	} catch (err) {
		throw new Error('Error fetching course data');
	}
}
