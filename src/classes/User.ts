import type { Env } from '../index';
import type { FirebaseUserToken } from '../services/firebase';

// Class for interacting with firebase user
export default class User {
	private readonly id: string;
	private readonly classId: string;
	private readonly name: string;

	private constructor(id: User['id'], classId: User['classId'], name: User['name']) {
		this.id = id;
		this.classId = classId;
		this.name = name;
	}

	public getId() {
		return this.id;
	}
	public getClassId() {
		return this.classId;
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
		// return new User(parsedRes.id, parsedRes.classId, parsedRes.name);
		// TODO: Hardcode fake values for now
		const name = userToken.name ?? '';

		return new User(userToken.user_id, '1', name);
	}

	// Load user from firebase db
	public static async getUser(env: Env, userId: string) {
		// TODO: Fetch user from firebase db through service module
		// const res = await env.CONVERSATIONS.get(conversationId);
		// if (!res) {
		// 	return null;
		// }
		// const parsedRes = JSON.parse(res);
		// return new User(parsedRes.id, parsedRes.classId, parsedRes.name);
		// TODO: Hardcode fake values for now

		return new User(userId, '1', 'Test User');
	}
}
