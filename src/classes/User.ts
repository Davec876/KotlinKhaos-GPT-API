import type Course from './Course';
import type { Env } from '../index';
import { getUserDataFromFirebaseDB, type FirebaseUserToken } from '../services/firebase';

// Course for interacting with firebase user
export default class User {
	private readonly id: string;
	private readonly courseId: Course['id'];
	private readonly name: string;
	private readonly type: 'student' | 'instructor';

	private constructor(id: User['id'], courseId: User['courseId'], name: User['name'], type: User['type']) {
		this.id = id;
		this.courseId = courseId;
		this.name = name;
		this.type = type;
	}

	public getId() {
		return this.id;
	}
	public getCourseId() {
		return this.courseId;
	}
	private getName() {
		return this.name;
	}
	public getType() {
		return this.type;
	}

	public static async getUserFromToken(userToken: FirebaseUserToken, userBearerToken: string) {
		const userDataFirebaseDB = await getUserDataFromFirebaseDB(userToken.user_id, userBearerToken);

		if (userDataFirebaseDB.type === 'NONE') {
			throw new Error('Failed parsing user type');
		}

		const userType = userDataFirebaseDB.type.toLowerCase() as User['type'];
		return new User(userToken.user_id, userDataFirebaseDB.courseId, userDataFirebaseDB.name, userType);
	}

	// Load user from firebase db
	public static async getUser(env: Env, userId: string) {
		// TODO: Fetch user from firebase db through service module
		// const res = await env.CONVERSATIONS.get(conversationId);
		// if (!res) {
		// 	return null;
		// }
		// const parsedRes = JSON.parse(res);
		// return new User(parsedRes.id, parsedRes.courseId, parsedRes.name);
		// TODO: Hardcode fake values for now
		const fakeUserRes = {
			courseId: '1',
			name: 'Test User',
			type: 'student' as const,
		};

		return new User(userId, fakeUserRes.courseId, fakeUserRes.name, fakeUserRes.type);
	}
}
