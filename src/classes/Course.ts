import type { Env } from '../index';

// Course for interacting with firebase course
export default class Course {
	private readonly id: string;
	private readonly name: string;
	private readonly educationLevel: string;
	private readonly description: string;
	private readonly userIds: string[];
	private readonly quizIds: string[];

	private constructor(
		id: Course['id'],
		name: Course['name'],
		educationLevel: Course['educationLevel'],
		description: Course['description'],
		userIds: Course['userIds'],
		quizIds: Course['quizIds']
	) {
		this.id = id;
		this.name = name;
		this.educationLevel = educationLevel;
		this.description = description;
		this.userIds = userIds;
		this.quizIds = quizIds;
	}

	public getId() {
		return this.id;
	}
	public getName() {
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
	// Load course from firebase db
	public static async getCourse(env: Env, courseId: string) {
		// TODO: Fetch course from firebase db through service module
		// const res = await env.CONVERSATIONS.get(conversationId);
		// if (!res) {
		// 	return null;
		// }
		// const parsedRes = JSON.parse(res);

		// TODO: Hardcode fake values for now
		const fakeCourseRes = {
			name: 'Fake Course Name',
			educationLevel: 'University',
			description:
				'Principles of mobile computing and the concepts and techniques underlying the design and development of mobile computing applications utilizing Kotlin and android.',
			userIds: ['E5Ptdo8YRnSFOO1tKk502ksP2322'],
			quizIds: [''],
		};

		return new Course(
			courseId,
			fakeCourseRes.name,
			fakeCourseRes.educationLevel,
			fakeCourseRes.description,
			fakeCourseRes.userIds,
			fakeCourseRes.quizIds
		);
		// return new Course(courseId, parsedRes.name, parsedRes.educationLevel, parsedRes.description, parsedRes.userIds, parsedRes.quizIds);
	}
}
