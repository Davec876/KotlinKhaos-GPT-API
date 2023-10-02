import type { Env } from '../index';

// Class for interacting with firebase class
export default class Class {
	private readonly id: string;
	private readonly name: string;
	private readonly educationLevel: string;
	private readonly description: string;
	private readonly userIds: string[];
	private readonly quizIds: string[];

	private constructor(
		id: Class['id'],
		name: Class['name'],
		educationLevel: Class['educationLevel'],
		description: Class['description'],
		userIds: Class['userIds'],
		quizIds: Class['quizIds']
	) {
		this.id = id;
		this.name = name;
		this.educationLevel = educationLevel;
		this.description = description;
		this.userIds = userIds;
		this.quizIds = quizIds;
	}

	private getId() {
		return this.id;
	}
	private getName() {
		return this.name;
	}
	public getEducationLevel() {
		return this.educationLevel;
	}
	public getDescription() {
		return this.description;
	}
	private getUserIds() {
		return this.userIds;
	}
	private getQuizIds() {
		return this.quizIds;
	}

	public static async getClass(env: Env, classId: string) {
		// TODO: Fetch class from firebase db through service module
		// const res = await env.CONVERSATIONS.get(conversationId);
		// if (!res) {
		// 	return null;
		// }
		// const parsedRes = JSON.parse(res);
		// return new Class(parsedRes.id, parsedRes.name, parsedRes.educationLevel, parsedRes.description, parsedRes.userIds, parsedRes.quizIds);
	}
}
