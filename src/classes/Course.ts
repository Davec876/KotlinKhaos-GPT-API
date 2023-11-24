import Quiz from './Quiz';
import type { Env } from '../index';
import type User from './User';
import { KotlinKhaosAPIError } from './errors/KotlinKhaosAPI';
import {
	type CourseDataFirebaseDB,
	getCourseDataFromFirebaseDB,
	getTokenForUserId,
	saveCourseDataToFirebaseDB,
} from '../services/firebase';

export interface CourseInfoSnapshotForQuiz {
	readonly id: string;
	readonly educationLevel: string;
	readonly description: string;
}

// Course for interacting with firebase course
export default class Course {
	private readonly id: string;
	private readonly instructorId: User['id'];
	private readonly name: string;
	private readonly educationLevel: 'UNIVERSITY' | 'ELEMENTARY' | 'HIGH_SCHOOL';
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
	public static async getCourse(env: Env, userId: string, courseId: string) {
		const serviceToken = await getTokenForUserId(env, userId);
		const courseDataFirebaseDB = await getCourseDataFromFirebaseDB(courseId, serviceToken);

		if (courseDataFirebaseDB.educationLevel === 'NONE') {
			throw new Error('Failed parsing user type');
		}
		let studentIds: Set<User['id']>;
		let quizIds: Set<User['id']>;

		// Convert back to Set
		if (!courseDataFirebaseDB.quizIds) {
			quizIds = new Set();
		} else {
			quizIds = new Set(courseDataFirebaseDB.quizIds);
		}
		if (!courseDataFirebaseDB.studentIds) {
			studentIds = new Set();
		} else {
			studentIds = new Set(courseDataFirebaseDB.studentIds);
		}

		const educationLevel = courseDataFirebaseDB.educationLevel.toLowerCase() as Course['educationLevel'];
		return new Course(
			courseId,
			courseDataFirebaseDB.instructorId,
			courseDataFirebaseDB.name,
			educationLevel,
			courseDataFirebaseDB.description,
			studentIds,
			quizIds
		);
	}

	// save course to firebase db with new quiz
	public async saveCourseWithNewQuiz(env: Env, userId: string, quizId: string) {
		this.quizIds.add(quizId);
		const serviceToken = await getTokenForUserId(env, userId);
		const courseData: CourseDataFirebaseDB = {
			id: this.getId(),
			instructorId: this.getInstructorId(),
			name: this.getName(),
			educationLevel: this.getEducationLevel().toUpperCase() as Course['educationLevel'],
			description: this.getDescription(),
			studentIds: [...this.getStudentIds()],
			quizIds: [...this.getQuizIds()],
		};
		await saveCourseDataToFirebaseDB(courseData, serviceToken);
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
		const quizsForInstructorViewPromises = quizs.map((quiz) => {
			return quiz.getQuizViewForInstructor(env, user);
		});
		return Promise.all(quizsForInstructorViewPromises);
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
		const quizsForStudentViewPromises = quizs.map((quiz) => {
			return quiz.getQuizViewForStudent(env, user);
		});
		return Promise.all(quizsForStudentViewPromises);
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
		const quizsForStudentViewPromises = quizs.map((quiz) => {
			return quiz.getQuizViewForStudent(env, user);
		});
		const quizViews = await Promise.all(quizsForStudentViewPromises);

		return quizViews.reduce<Record<string, { averageScore: number; quizs: Array<{ quizAttemptId: string; score: number }> }>>(
			(acc, { usersAttempt }) => {
				if (usersAttempt && usersAttempt.submittedOn.getUTCDate() <= oneWeekAgo) {
					const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
					const dayStr = dayNames[usersAttempt.submittedOn.getUTCDay()];

					if (!acc[dayStr]) {
						acc[dayStr] = {
							averageScore: 0,
							quizs: [],
						};
					}

					acc[dayStr].quizs.push({
						quizAttemptId: usersAttempt.attemptId,
						score: usersAttempt.score,
					});

					// calculate average score
					const totalScore = acc[dayStr].quizs.reduce((sum, attempt) => sum + attempt.score, 0);
					acc[dayStr].averageScore = totalScore / acc[dayStr].quizs.length;
				}
				return acc;
			},
			{}
		);
	}
}
