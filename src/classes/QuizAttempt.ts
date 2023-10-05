import Quiz from './Quiz';
import type { Env } from '../index';
import type User from './User';
import { giveFinalScoreFromQuizAttempt } from '../services/openAi/openAiQuizAttempt';

export default class QuizAttempt {
	private readonly id: string;
	private readonly quizId: string;
	private readonly userId: string;
	private readonly quizQuestions: Quiz['questions'];
	private score: string;
	private userAnswers: string[];
	private submitted: boolean;

	private constructor(
		id: QuizAttempt['id'],
		quizId: QuizAttempt['quizId'],
		userId: QuizAttempt['userId'],
		quizQuestions: Quiz['questions'],
		score: QuizAttempt['score'],
		userAnswers: string[],
		submitted: QuizAttempt['submitted']
	) {
		this.id = id;
		this.quizId = quizId;
		this.userId = userId;
		this.quizQuestions = quizQuestions;
		this.score = score;
		this.userAnswers = userAnswers;
		this.submitted = submitted;
	}

	public getId() {
		return this.id;
	}
	private getQuizId() {
		return this.quizId;
	}
	private getUserId() {
		return this.userId;
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
	private getSubmitted() {
		return this.submitted;
	}
	public getNumberOfQuestions() {
		return this.quizQuestions.length;
	}
	private getNumberOfAnswers() {
		return this.userAnswers.length;
	}
	private setScore(score: string) {
		this.score = score;
	}
	private setSubmitted(submitted: boolean) {
		this.submitted = submitted;
	}
	public getQuizAttemptViewForStudent() {
		const questions = this.getQuizQuestions().map(({ content }) => content);
		return { questions, submitted: this.getSubmitted() };
	}

	public static async newQuizAttempt(env: Env, user: User, quizId: string) {
		const quizAttemptId = crypto.randomUUID();
		const quiz = await Quiz.getQuiz(env, quizId);

		if (!quiz) {
			return null;
		}

		const score = '';
		const userAnswers: string[] = [];
		const submitted = false;

		await env.QUIZ_ATTEMPTS.put(
			quizAttemptId,
			JSON.stringify({
				quizId: quiz.getId(),
				userId: user.getId(),
				quizQuestions: quiz.getQuestions(),
				score,
				userAnswers,
				submitted,
			})
		);

		return new QuizAttempt(quizAttemptId, quiz.getId(), user.getId(), quiz.getQuestions(), score, userAnswers, submitted);
	}

	// Load quizAttempt from kv
	public static async getQuizAttempt(env: Env, quizAttemptId: string) {
		const res = await env.QUIZ_ATTEMPTS.get(quizAttemptId);

		if (!res) {
			return null;
		}

		const parsedRes = JSON.parse(res);

		return new QuizAttempt(
			quizAttemptId,
			parsedRes.quizId,
			parsedRes.userId,
			parsedRes.quizQuestions,
			parsedRes.score,
			parsedRes.userAnswers,
			parsedRes.submitted
		);
	}

	private getUserAttemptSnapshot() {
		return {
			userId: this.getUserId(),
			score: this.getScore(),
		};
	}

	public async submitAttempt(env: Env) {
		// TODO: Add further validation and better errors here
		if (this.getSubmitted() && this.getNumberOfQuestions() !== this.getNumberOfAnswers()) {
			return null;
		}

		const score = await giveFinalScoreFromQuizAttempt(this, env);

		if (!score) {
			return null;
		}

		this.setScore(score);
		this.setSubmitted(true);
		this.saveStateToKv(env);
		await Quiz.addUserAttempt(env, this.getUserAttemptSnapshot(), this.getQuizId());

		return { score: score };
	}

	private async saveStateToKv(env: Env) {
		await env.QUIZ_ATTEMPTS.put(this.getId(), this.toString());
	}

	private toString() {
		return JSON.stringify({
			quizId: this.getQuizId(),
			userId: this.getUserId(),
			quizQuestions: this.getQuizQuestions(),
			score: this.getScore(),
			userAnswers: this.getUserAnswers(),
			submitted: this.getSubmitted(),
		});
	}
}
