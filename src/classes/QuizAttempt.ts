import Quiz from './Quiz';
import type { Env } from '../index';
import type User from './User';
import type Course from './Course';
import { giveFinalScoreFromQuizAttempt } from '../services/openAi/openAiQuizAttempt';
import { KotlinKhaosAPIError } from './errors/KotlinKhaosAPI';
import { parseFinalScore } from '../services/openAi/openAiShared';

export default class QuizAttempt {
	private readonly id: string;
	private readonly quizId: Quiz['id'];
	private readonly courseId: Course['id'];
	private readonly studentId: User['id'];
	private readonly quizQuestions: Quiz['questions'];
	private score: number;
	private userAnswers: string[];
	private submittedOn?: Date;

	private constructor(
		id: QuizAttempt['id'],
		quizId: QuizAttempt['quizId'],
		courseId: QuizAttempt['courseId'],
		studentId: QuizAttempt['studentId'],
		quizQuestions: Quiz['questions'],
		score: QuizAttempt['score'],
		userAnswers: string[],
		submittedOn?: QuizAttempt['submittedOn']
	) {
		this.id = id;
		this.quizId = quizId;
		this.courseId = courseId;
		this.studentId = studentId;
		this.quizQuestions = quizQuestions;
		this.score = score;
		this.userAnswers = userAnswers;
		this.submittedOn = submittedOn;
	}

	public getId() {
		return this.id;
	}
	private getQuizId() {
		return this.quizId;
	}
	private getCourseId() {
		return this.courseId;
	}
	private getStudentId() {
		return this.studentId;
	}
	public getQuizQuestions() {
		return this.quizQuestions;
	}
	private getScore() {
		return this.score;
	}
	public getUserAnswers() {
		return this.userAnswers;
	}
	private getSubmittedOn() {
		return this.submittedOn;
	}
	private isSubmitted() {
		return !!this.getSubmittedOn();
	}
	public getNumberOfQuestions() {
		return this.quizQuestions.length;
	}
	private getNumberOfAnswers() {
		return this.userAnswers.length;
	}
	private setScore(score: number) {
		this.score = score;
	}
	private setUserAnswers(userAnswers: string[]) {
		this.userAnswers = userAnswers;
	}
	private setSubmittedOn(submittedOn: Date) {
		this.submittedOn = submittedOn;
	}
	private checkIfUserIsQuizAttemptCreator(user: User) {
		return this.getStudentId() === user.getId();
	}
	private checkIfUserIsStudent(user: User) {
		return user.getCourseId() === this.getCourseId();
	}
	private checkIfUserIsInstructor(user: User) {
		return this.checkIfUserIsStudent(user) && user.getType() === 'instructor';
	}
	public getQuizAttemptViewForStudent(user: User) {
		if (!this.checkIfUserIsQuizAttemptCreator(user) && !this.checkIfUserIsInstructor(user)) {
			throw new KotlinKhaosAPIError("You don't have access to this quizAttempt", 403);
		}
		const questions = this.getQuizQuestions().map(({ content }) => content);
		const answers = this.getUserAnswers();
		return { answers, questions, submitted: this.isSubmitted() };
	}
	public static async newQuizAttempt(env: Env, user: User, quizId: string) {
		const quizAttemptId = crypto.randomUUID();
		const quiz = await Quiz.getQuiz(env, quizId);

		if (user.getCourseId() !== quiz.getCourseId()) {
			throw new KotlinKhaosAPIError("Only students of this quiz's course may attempt this quiz", 403);
		}

		const score = 0;
		const userAnswers: string[] = [];
		const submittedOn = undefined;

		await quiz.addStartedAttemptUserIdAndSaveState(env, user.getId());
		await env.QUIZ_ATTEMPTS.put(
			quizAttemptId,
			JSON.stringify({
				quizId: quiz.getId(),
				courseId: quiz.getCourseId(),
				studentId: user.getId(),
				quizQuestions: quiz.getQuestions(),
				score,
				userAnswers,
				submittedOn,
			})
		).catch((err) => {
			console.error(err);
			throw new KotlinKhaosAPIError('Error creating new quizAttempt', 500);
		});

		return new QuizAttempt(
			quizAttemptId,
			quiz.getId(),
			quiz.getCourseId(),
			user.getId(),
			quiz.getQuestions(),
			score,
			userAnswers,
			submittedOn
		);
	}

	// Load quizAttempt from kv
	public static async getQuizAttempt(env: Env, quizAttemptId: string) {
		try {
			const res = await env.QUIZ_ATTEMPTS.get(quizAttemptId).catch((err) => {
				console.error(err);
				throw new KotlinKhaosAPIError('Error loading quizAttempt state', 500);
			});

			if (!res) {
				throw new KotlinKhaosAPIError('No quizAttempt found by that Id', 404);
			}

			const parsedRes = JSON.parse(res);

			// Parsed Date
			const submittedOn = parsedRes.submittedOn ? new Date(parsedRes.submittedOn) : undefined;

			return new QuizAttempt(
				quizAttemptId,
				parsedRes.quizId,
				parsedRes.courseId,
				parsedRes.studentId,
				parsedRes.quizQuestions,
				parsedRes.score,
				parsedRes.userAnswers,
				submittedOn
			);
		} catch (err) {
			if (err instanceof SyntaxError) {
				console.error(err);
				throw new KotlinKhaosAPIError('Error parsing quiz from kv', 500);
			}
			throw err;
		}
	}

	private getUserAttemptSnapshot() {
		return {
			attemptId: this.getId(),
			studentId: this.getStudentId(),
			score: this.getScore(),
			submittedOn: this.getSubmittedOn()!,
		};
	}

	private validateSubmitAttempt(userAnswers: string[]) {
		if (this.isSubmitted()) {
			throw new KotlinKhaosAPIError('quizAttempt has already been submitted', 400);
		}
		if (this.getNumberOfAnswers() > this.getNumberOfQuestions()) {
			throw new KotlinKhaosAPIError("You've got too many answers in your response", 400);
		}
		if (this.getNumberOfAnswers() < this.getNumberOfQuestions()) {
			const diff = this.getNumberOfQuestions() - this.getNumberOfAnswers();
			throw new KotlinKhaosAPIError(`You're missing answers from your quiz, add ${diff} more`, 400);
		}
		userAnswers.forEach((userAnswer) => {
			if (userAnswer.length > 300) {
				throw new KotlinKhaosAPIError('Please shorten your answers', 400);
			}
		});
	}

	public async submitAttempt(env: Env, userAnswers: string[]) {
		this.setUserAnswers(userAnswers);
		this.validateSubmitAttempt(userAnswers);

		const scoreMessage = await giveFinalScoreFromQuizAttempt(this, env);
		if (!scoreMessage.content) {
			throw new KotlinKhaosAPIError('Error generating score', 500);
		}
		// Validate finalScore
		const parsedFinalScore = parseFinalScore(scoreMessage.content);
		if (!parsedFinalScore) {
			throw new KotlinKhaosAPIError('Error parsing final score for quizAttempt', 500);
		}

		const submittedOnTime = new Date();
		this.setScore(parsedFinalScore);
		this.setSubmittedOn(submittedOnTime);
		await this.saveStateToKv(env);
		await Quiz.addFinishedUserAttemptAndSaveState(env, this.getUserAttemptSnapshot(), this.getQuizId(), this.getStudentId());
		return { score: this.getScore() };
	}

	private async saveStateToKv(env: Env) {
		await env.QUIZ_ATTEMPTS.put(this.getId(), this.toString()).catch((err) => {
			console.error(err);
			throw new KotlinKhaosAPIError('Error saving quizAttempt state', 500);
		});
	}

	private toString() {
		return JSON.stringify({
			quizId: this.getQuizId(),
			courseId: this.getCourseId(),
			studentId: this.getStudentId(),
			quizQuestions: this.getQuizQuestions(),
			score: this.getScore(),
			userAnswers: this.getUserAnswers(),
			submittedOn: this.getSubmittedOn(),
		});
	}
}
