import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type { Env } from '../index';
import type User from './User';
import Class from './Class';

interface UserAttempt {
	readonly userId: string;
	score: number;
}

interface QuizOptions {
	readonly name: string;
	readonly questionLimit: number;
	readonly prompt: string;
}

export default class Quiz {
	private readonly id: string;
	private readonly authorId: string;
	private readonly classId: string;
	private name: string;
	private questionLimit: number;
	private userAttempts: UserAttempt[];
	private started: boolean;
	private finished: boolean;
	private questions: ChatCompletionMessage[];

	private constructor(
		id: Quiz['id'],
		authorId: Quiz['authorId'],
		classId: Quiz['classId'],
		name: Quiz['name'],
		questionLimit: Quiz['questionLimit'],
		userAttempts: Quiz['userAttempts'],
		started: Quiz['started'],
		finished: Quiz['finished'],
		questions: Quiz['questions']
	) {
		this.id = id;
		this.authorId = authorId;
		this.classId = classId;
		this.name = name;
		this.questionLimit = questionLimit;
		this.userAttempts = userAttempts;
		this.started = started;
		this.finished = finished;
		this.questions = questions;
	}

	public getId() {
		return this.id;
	}
	private getAuthorId() {
		return this.authorId;
	}
	private getClassId() {
		return this.classId;
	}
	private getName() {
		return this.name;
	}
	public getQuestionLimit() {
		return this.questionLimit;
	}
	private getUserAttempts() {
		return this.userAttempts;
	}
	private getStarted() {
		return this.started;
	}
	private getFinished() {
		return this.finished;
	}
	public getQuestions() {
		return this.questions;
	}

	public static async newQuiz(env: Env, author: User, quizOptions: QuizOptions) {
		const quizId = crypto.randomUUID();

		const usersClass = Class.getClass(env, author.getClassId())
		const userAttempts = [];
		const started = false;
		const finished = false;

		// const completionMessage = await createNewConversation(env, prompt);
		// const questions = [completionMessage];
		// await env.QUIZS.put(
		// 	quizId,
		// 	JSON.stringify({
		// 		authorId: author.getId(),
		// 		classId: author.getClassId(),
		// 		name: quizOptions.name,
		// 		questionLimit: quizOptions.questionLimit,
		// 		userAttempts: userAttempts,
		// 		started: started,
		// 		finished: finished,
		// 		questions: questions,
		// 	})
		// );

		// return new Quiz(
		// 	quizId,
		// 	author.getId(),
		// 	author.getClassId(),
		// 	quizOptions.name,
		// 	quizOptions.questionLimit,
		// 	userAttempts,
		// 	started,
		// 	finished,
		// 	questions
		// );
	}

	public static async getQuiz(env: Env, quizId: string) {
		const res = await env.QUIZS.get(quizId);

		if (!res) {
			return null;
		}

		const parsedRes = JSON.parse(res);

		return new Quiz(
			quizId,
			parsedRes.id,
			parsedRes.classId,
			parsedRes.name,
			parsedRes.questionLimit,
			parsedRes.userAttempts,
			parsedRes.started,
			parsedRes.finished,
			parsedRes.questions
		);
	}

	private toString() {
		return JSON.stringify({
			authorId: this.getAuthorId(),
			classId: this.getClassId(),
			name: this.getName(),
			questionLimit: this.getQuestionLimit(),
			userAttempts: this.getUserAttempts(),
			started: this.getStarted(),
			finished: this.getFinished(),
			questions: this.getQuestions(),
		});
	}
}
