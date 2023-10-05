import Course, { type CourseInfoSnapshotForQuiz } from './Course';
import { createNewQuiz, getNextQuestion } from '../services/openAi/openAiQuiz';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type { Env } from '../index';
import type User from './User';

interface UserAttempt {
	readonly userId: string;
	readonly score: string;
}

interface QuizOptions {
	readonly name: string;
	readonly questionLimit: number;
	readonly prompt: string;
}

export default class Quiz {
	private readonly id: string;
	private readonly authorId: string;
	private readonly courseId: string;
	private readonly savedAuthorsCourseInfo: CourseInfoSnapshotForQuiz;
	private readonly prompt: string;
	private readonly questionLimit: number;
	private name: string;
	private userAttempts: UserAttempt[];
	private started: boolean;
	private finished: boolean;
	private questions: ChatCompletionMessage[];

	private constructor(
		id: Quiz['id'],
		authorId: Quiz['authorId'],
		courseId: Quiz['courseId'],
		savedAuthorsCourseInfo: Quiz['savedAuthorsCourseInfo'],
		prompt: Quiz['prompt'],
		questionLimit: Quiz['questionLimit'],
		name: Quiz['name'],
		userAttempts: Quiz['userAttempts'],
		started: Quiz['started'],
		finished: Quiz['finished'],
		questions: Quiz['questions']
	) {
		this.id = id;
		this.authorId = authorId;
		this.courseId = courseId;
		this.savedAuthorsCourseInfo = savedAuthorsCourseInfo;
		this.prompt = prompt;
		this.questionLimit = questionLimit;
		this.name = name;
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
	private getCourseId() {
		return this.courseId;
	}
	public getSavedAuthorsCourseInfo() {
		return this.savedAuthorsCourseInfo;
	}
	public getPrompt() {
		return this.prompt;
	}
	public getQuestionLimit() {
		return this.questionLimit;
	}
	private getName() {
		return this.name;
	}
	private getUserAttempts() {
		return this.userAttempts;
	}
	public getStarted() {
		return this.started;
	}
	private getFinished() {
		return this.finished;
	}
	public getQuestions() {
		return this.questions;
	}
	public getNumberOfQuestions() {
		return this.questions.length;
	}
	private async addQuestion(question: ChatCompletionMessage) {
		this.questions.push(question);
	}

	public static async newQuiz(env: Env, author: User, quizOptions: QuizOptions) {
		const quizId = crypto.randomUUID();

		const authorsCourse = await Course.getCourse(env, author.getCourseId());
		const authorsCourseInfo = authorsCourse.getCourseInfoSnapshotForQuiz();
		const userAttempts: UserAttempt[] = [];
		const started = false;
		const finished = false;

		const question = await createNewQuiz(env, authorsCourse, quizOptions.prompt);
		const questions = [question];

		await env.QUIZS.put(
			quizId,
			JSON.stringify({
				authorId: author.getId(),
				courseId: author.getCourseId(),
				savedAuthorsCourseInfo: authorsCourseInfo,
				prompt: quizOptions.prompt,
				questionLimit: quizOptions.questionLimit,
				name: quizOptions.name,
				userAttempts,
				started,
				finished,
				questions,
			})
		);

		return new Quiz(
			quizId,
			author.getId(),
			author.getCourseId(),
			authorsCourseInfo,
			quizOptions.prompt,
			quizOptions.questionLimit,
			quizOptions.name,
			userAttempts,
			started,
			finished,
			questions
		);
	}

	// Load quiz from kv
	public static async getQuiz(env: Env, quizId: string) {
		const res = await env.QUIZS.get(quizId);

		if (!res) {
			return null;
		}

		const parsedRes = JSON.parse(res);

		return new Quiz(
			quizId,
			parsedRes.authorId,
			parsedRes.courseId,
			parsedRes.savedAuthorsCourseInfo,
			parsedRes.prompt,
			parsedRes.questionLimit,
			parsedRes.name,
			parsedRes.userAttempts,
			parsedRes.started,
			parsedRes.finished,
			parsedRes.questions
		);
	}

	public async nextQuestion(env: Env) {
		// TODO: Do better error handling here, but don't generate another question if limit reached
		if (this.getNumberOfQuestions() >= this.getQuestionLimit()) {
			return null;
		}

		const nextQuestion = await getNextQuestion(this, env);
		this.addQuestion(nextQuestion);
		await this.saveStateToKv(env);
		return nextQuestion.content;
	}

	public startQuiz() {
		// TODO: Do better error handling here, but don't let quiz start if question and questionLimit aren't the same
		if (this.getNumberOfQuestions() !== this.getQuestionLimit()) {
			return null;
		}

		this.started = true;
	}

	public static async addUserAttempt(env: Env, userAttempt: UserAttempt, quizId: string) {
		const quiz = await Quiz.getQuiz(env, quizId);

		//TODO: Better error handling
		if (!quiz) {
			return null;
		}

		quiz.userAttempts.push(userAttempt);
		quiz.saveStateToKv(env);
	}

	private async saveStateToKv(env: Env) {
		await env.QUIZS.put(this.getId(), this.toString());
	}

	private toString() {
		return JSON.stringify({
			authorId: this.getAuthorId(),
			courseId: this.getCourseId(),
			savedAuthorsCourseInfo: this.getSavedAuthorsCourseInfo(),
			prompt: this.getPrompt(),
			questionLimit: this.getQuestionLimit(),
			name: this.getName(),
			userAttempts: this.getUserAttempts(),
			started: this.getStarted(),
			finished: this.getFinished(),
			questions: this.getQuestions(),
		});
	}
}
