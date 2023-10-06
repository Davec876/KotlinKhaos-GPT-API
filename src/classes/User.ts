import type { Env } from '../index';
import type { FirebaseUserToken } from '../services/firebase';
import type Course from './Course';

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
			type: 'student' as const,
		};

		const name = userToken.name ?? fakeUserRes.name;
		const type = userToken.user_id === 'qUVYul1QVCY3GV4aGbykkafLDSv2' ? 'instructor' : fakeUserRes.type;

		return new User(userToken.user_id, fakeUserRes.courseId, name, type);
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
