import type { Env } from '../index';
import type Quiz from './Quiz';
import type User from './User';

export interface CourseInfoSnapshotForQuiz {
	id: string;
	educationLevel: string;
	description: string;
}

// Course for interacting with firebase course
export default class Course {
	private readonly id: string;
	private readonly instructorId: User['id'];
	private readonly name: string;
	private readonly educationLevel: string;
	private readonly description: string;
	private readonly userIds: Set<User['id']>;
	private readonly quizIds: Set<Quiz['id']>;

	private constructor(
		id: Course['id'],
		instructorId: User['id'],
		name: Course['name'],
		educationLevel: Course['educationLevel'],
		description: Course['description'],
		userIds: Course['userIds'],
		quizIds: Course['quizIds']
	) {
		this.id = id;
		this.instructorId = instructorId;
		this.name = name;
		this.educationLevel = educationLevel;
		this.description = description;
		this.userIds = userIds;
		this.quizIds = quizIds;
	}

	public getId() {
		return this.id;
	}
	private getInstructorId() {
		return this.instructorId;
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
	public getUserIds() {
		return this.userIds;
	}
	private getQuizIds() {
		return this.quizIds;
	}
	public getCourseInfoSnapshotForQuiz(): CourseInfoSnapshotForQuiz {
		return { id: this.getId(), educationLevel: this.getEducationLevel(), description: this.getDescription() };
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
			instructorId: 'rkIyTsb1avUYH5QYmIArZbxqQgE2',
			name: 'Fake Course Name',
			educationLevel: 'University',
			description:
				'Principles of mobile computing and the concepts and techniques underlying the design and development of mobile computing applications utilizing Kotlin and android.',
			userIds: ['rkIyTsb1avUYH5QYmIArZbxqQgE2'],
			quizIds: [''],
		};

		const userIds: Set<string> = new Set(fakeCourseRes.userIds);
		const quizIds: Set<string> = new Set(fakeCourseRes.quizIds);

		return new Course(
			courseId,
			fakeCourseRes.instructorId,
			fakeCourseRes.name,
			fakeCourseRes.educationLevel,
			fakeCourseRes.description,
			userIds,
			quizIds
		);
		// return new Course(courseId, parsedRes.instructorId, parsedRes.name, parsedRes.educationLevel, parsedRes.description, parsedRes.userIds, parsedRes.quizIds);
	}
}
