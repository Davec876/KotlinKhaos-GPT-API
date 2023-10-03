import type { Env } from '../index';
import type Quiz from './Quiz';
import type User from './User';

export default class QuizConversation {
	private readonly id: string;
	private readonly quizId: string;
	private readonly userId: string;
	private readonly questionLimit: number;
	private readonly quizQuestions: Quiz['questions'];
	private userAnswers: string[];

	private constructor(
		id: QuizConversation['id'],
		quizId: QuizConversation['quizId'],
		userId: QuizConversation['userId'],
		questionLimit: QuizConversation['questionLimit'],
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

	public static async newConversation(env: Env, quiz: Quiz, user: User) {
		const quizConversationId = crypto.randomUUID();

		// const completionMessage = await createNewConversation(env, prompt);
		// const history = [completionMessage];
		const userAnswers = [];

		// await env.QUIZ_CONVERSATIONS.put(
		// 	quizConversationId,
		// 	JSON.stringify({
		// 		quizId: quiz.getId(),
		// 		userId: user.getId(),
		// 		questionLimit: quiz.getQuestionLimit(),
		// 		quizQuestions: quiz.getQuestions(),
		// 		userAnswers: userAnswers,
		// 	}),
		// 	{ expirationTtl: 86400 }
		// );
		return new QuizConversation(quizConversationId, quiz.getId(), user.getId(), quiz.getQuestionLimit(), quiz.getQuestions(), userAnswers);
	}

	// Load quizConversation from kv
	public static async getConversation(env: Env, quizConversationId: string) {
		const res = await env.QUIZ_CONVERSATIONS.get(quizConversationId);

		if (!res) {
			return null;
		}

		const parsedRes = JSON.parse(res);

		return new QuizConversation(
			quizConversationId,
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
