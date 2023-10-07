import Quiz from './Quiz';
import type { Env } from '../index';
import type User from './User';
import { KotlinKhaosAPIError } from './errors/KotlinKhaosAPI';

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
	private readonly studentIds: Set<User['id']>;
	private readonly quizIds: Set<Quiz['id']>;

	private constructor(
		id: Course['id'],
		instructorId: User['id'],
		name: Course['name'],
		educationLevel: Course['educationLevel'],
		description: Course['description'],
		studentIds: Course['studentIds'],
		quizIds: Course['quizIds']
	) {
		this.id = id;
		this.instructorId = instructorId;
		this.name = name;
		this.educationLevel = educationLevel;
		this.description = description;
		this.studentIds = studentIds;
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
	public getStudentIds() {
		return this.studentIds;
	}
	public getQuizIds() {
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
			studentIds: ['rkIyTsb1avUYH5QYmIArZbxqQgE2'],
			quizIds: ['d4294609-72f7-4ec5-8d7f-f6db0493647e'],
		};

		const studentIds: Set<string> = new Set(fakeCourseRes.studentIds);
		const quizIds: Set<string> = new Set(fakeCourseRes.quizIds);

		return new Course(
			courseId,
			fakeCourseRes.instructorId,
			fakeCourseRes.name,
			fakeCourseRes.educationLevel,
			fakeCourseRes.description,
			studentIds,
			quizIds
		);
		// return new Course(courseId, parsedRes.instructorId, parsedRes.name, parsedRes.educationLevel, parsedRes.description, parsedRes.userIds, parsedRes.quizIds);
	}

	public async getAllQuizsForCourseInstructorView(env: Env, user: User) {
		const quizIds = this.getQuizIds();
		if (user.getType() === 'student') {
			throw new KotlinKhaosAPIError('Only the course instructor can view details on all the quizs', 403);
		}
		if (quizIds.size === 0) {
			throw new KotlinKhaosAPIError('No quizs found for this course', 404);
		}
		const quizPromises: Promise<Quiz>[] = [];
		quizIds.forEach((quizId) => {
			quizPromises.push(Quiz.getQuiz(env, quizId));
		});
		const quizs = await Promise.all(quizPromises);
		return quizs.map((quiz) => {
			return quiz.getQuizViewForInstructor(user);
		});
	}

	public async getAllQuizsForCourseStudentView(env: Env, user: User) {
		const quizIds = this.getQuizIds();
		if (quizIds.size === 0) {
			throw new KotlinKhaosAPIError('No quizs found for this course', 404);
		}

		const quizPromises: Promise<Quiz>[] = [];
		quizIds.forEach((quizId) => {
			quizPromises.push(Quiz.getQuiz(env, quizId));
		});
		const quizs = await Promise.all(quizPromises);
		return quizs.map((quiz) => {
			return quiz.getQuizViewForStudent(user);
		});
	}

	public async getWeeklyQuizsSummaryForCourseStudentView(env: Env, user: User) {
		const quizIds = this.getQuizIds();

		if (quizIds.size === 0) {
			return [];
		}

		const quizPromises: Promise<Quiz>[] = [];
		quizIds.forEach((quizId) => {
			quizPromises.push(Quiz.getQuiz(env, quizId));
		});
		const quizs = await Promise.all(quizPromises);
		const oneWeekAgo = new Date().setDate(new Date().getUTCDate() - 7);

		return quizs.reduce<{ quizAttemptId: string; score: string; day: Date }[]>((acc, quiz) => {
			const { usersAttempt } = quiz.getQuizViewForStudent(user);
			if (usersAttempt && usersAttempt.submittedOn.getUTCDate() <= oneWeekAgo) {
				acc.push({
					quizAttemptId: usersAttempt.attemptId,
					score: usersAttempt.score,
					day: usersAttempt.submittedOn,
				});
			}
			return acc;
		}, []);
	}
}
