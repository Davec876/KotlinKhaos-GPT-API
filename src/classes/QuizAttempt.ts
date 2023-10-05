import type { Env } from '../index';
import type Quiz from './Quiz';
import type User from './User';

export default class QuizAttempt {
	private readonly id: string;
	private readonly quizId: string;
	private readonly userId: string;
	private readonly questionLimit: number;
	private readonly quizQuestions: Quiz['questions'];
	private userAnswers: string[];

	private constructor(
		id: QuizAttempt['id'],
		quizId: QuizAttempt['quizId'],
		userId: QuizAttempt['userId'],
		questionLimit: QuizAttempt['questionLimit'],
		quizQuestions: Quiz['questions'],
		userAnswers: string[]
	) {
		this.id = id;
		this.quizId = quizId;
		this.userId = userId;
		this.questionLimit = questionLimit;
		this.quizQuestions = quizQuestions;
		this.userAnswers = userAnswers;
	}

	private getId() {
		return this.id;
	}
	private getQuizId() {
		return this.quizId;
	}
	private getUserId() {
		return this.userId;
	}
	private getQuestionLimit() {
		return this.questionLimit;
	}
	private getQuizQuestions() {
		return this.quizQuestions;
	}
	private getUserAnswers() {
		return this.userAnswers;
	}

	public static async newQuizAttempt(env: Env, quiz: Quiz, user: User) {
		const quizAttemptId = crypto.randomUUID();

		// const completionMessage = await createNewQuiz(env, prompt);
		// const history = [completionMessage];
		const userAnswers = [];

		// await env.QUIZ_ATTEMPTS.put(
		// 	quizAttemptId,
		// 	JSON.stringify({
		// 		userId: user.getId(),
		// 		questionLimit: quiz.getQuestionLimit(),
		// 		quizQuestions: quiz.getQuestions(),
		// 		userAnswers: userAnswers,
		// 	}),
		// 	{ expirationTtl: 86400 }
		// );
		return new QuizAttempt(quizAttemptId, quiz.getId(), user.getId(), quiz.getQuestionLimit(), quiz.getQuestions(), userAnswers);
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
			parsedRes.userId,
			parsedRes.quizId,
			parsedRes.questionLimit,
			parsedRes.currentQuestionNumber,
			parsedRes.history
		);
	}

	private toString() {
		return JSON.stringify({
			quizId: this.getQuizId(),
			userId: this.getUserId(),
			questionLimit: this.getQuestionLimit(),
			quizQuestions: this.getQuizQuestions(),
			userAnswers: this.getUserAnswers(),
		});
	}
}
