import type { Env } from '../index';
import type { FirebaseUserToken } from '../services/firebase';

// Course for interacting with firebase user
export default class User {
	private readonly id: string;
	private readonly courseId: string;
	private readonly name: string;

	private constructor(id: User['id'], courseId: User['courseId'], name: User['name']) {
		this.id = id;
		this.courseId = courseId;
		this.name = name;
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

	public static async getUserFromToken(env: Env, userToken: FirebaseUserToken) {
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
			name: '',
		};

		const name = userToken.name ?? fakeUserRes.name;

		return new User(userToken.user_id, fakeUserRes.courseId, name);
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
		};

		return new User(userId, fakeUserRes.courseId, fakeUserRes.name);
	}
}
