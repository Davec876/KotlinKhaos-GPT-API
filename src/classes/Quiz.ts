import Course, { type CourseInfoSnapshotForQuiz } from './Course';
import { createNewQuiz, getNextQuestion } from '../services/openAi/openAiQuiz';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type { Env } from '../index';
import type User from './User';
import type QuizAttempt from './QuizAttempt';
import { KotlinKhaosAPIError } from './errors/KotlinKhaosAPI';

interface FinishedUserAttempt {
	readonly attemptId: QuizAttempt['id'];
	readonly userId: User['id'];
	readonly score: string;
}

export interface QuizOptions {
	readonly name: string;
	readonly questionLimit: number;
	readonly prompt: string;
}

export default class Quiz {
	private readonly id: string;
	private readonly authorId: User['id'];
	private readonly courseId: Course['id'];
	private readonly savedAuthorsCourseInfo: CourseInfoSnapshotForQuiz;
	private readonly prompt: string;
	private readonly questionLimit: number;
	private name: string;
	private startedAttemptsUserIds: User['id'][];
	private finishedUserAttempts: FinishedUserAttempt[];
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
		startedAttemptsUserIds: Quiz['startedAttemptsUserIds'],
		finishedUserAttempts: Quiz['finishedUserAttempts'],
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
		this.startedAttemptsUserIds = startedAttemptsUserIds;
		this.finishedUserAttempts = finishedUserAttempts;
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
	public getCourseId() {
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
	private getStartedAttemptsUserIds() {
		return this.startedAttemptsUserIds;
	}
	private getFinishedUserAttempts() {
		return this.finishedUserAttempts;
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
	private checkIfUserAttempted(userId: string) {
		const startedAttemptsUserIds = this.getStartedAttemptsUserIds();
		const finishedUserAttempts = this.getFinishedUserAttempts();
		const finishedUserIdsFromAttempts = finishedUserAttempts.map(({ userId }) => userId);

		const userIdsFromAttempts = startedAttemptsUserIds.concat(finishedUserIdsFromAttempts);
		const foundUserId = userIdsFromAttempts.includes(userId);
		if (foundUserId) {
			return true;
		}
		return false;
	}
	public getQuizAttemptViewForStudent(user: User) {
		if (user.getCourseId() !== this.getCourseId()) {
			throw new KotlinKhaosAPIError('Only course members can view this quiz', 403);
		}

		const usersAttempt = this.getFinishedUserAttempts().find(({ userId }) => userId === user.getId());
		if (!usersAttempt && this.checkIfUserAttempted(user.getId())) {
			throw new KotlinKhaosAPIError('User has not finished this quiz', 404);
		}
		if (!usersAttempt) {
			throw new KotlinKhaosAPIError('User has not attempted this quiz', 404);
		}
		return usersAttempt;
	}
	public getQuizViewForStudent(user: User) {
		if (user.getCourseId() !== this.getCourseId()) {
			throw new KotlinKhaosAPIError('Only course members can view this quiz', 403);
		}
		return {
			name: this.getName(),
			started: this.getStarted(),
			finished: this.getFinished(),
			userAttempted: this.checkIfUserAttempted(user.getId()),
		};
	}
	private async addQuestion(question: ChatCompletionMessage) {
		this.questions.push(question);
	}

	private static validateNewQuizConditions(quizOptions: QuizOptions, user: User) {
		if (user.getType() !== 'instructor') {
			throw new KotlinKhaosAPIError('Only instructors may create classes', 403);
		}

		if (quizOptions.prompt.length > 20) {
			throw new KotlinKhaosAPIError('Prompt is too long', 400);
		}

		if (quizOptions.questionLimit > 5) {
			throw new KotlinKhaosAPIError("Quiz's may only have a max of 5 questions", 400);
		}
	}
	public static async newQuiz(env: Env, author: User, quizOptions: QuizOptions) {
		this.validateNewQuizConditions(quizOptions, author);
		const quizId = crypto.randomUUID();
		const authorsCourse = await Course.getCourse(env, author.getCourseId());
		const authorsCourseInfo = authorsCourse.getCourseInfoSnapshotForQuiz();
		const startedAttemptsUserIds: string[] = [];
		const finishedUserAttempts: FinishedUserAttempt[] = [];
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
				startedAttemptsUserIds,
				finishedUserAttempts,
				started,
				finished,
				questions,
			})
		).catch((err) => {
			console.error(err);
			throw new KotlinKhaosAPIError('Error creating new quiz', 500);
		});

		return new Quiz(
			quizId,
			author.getId(),
			author.getCourseId(),
			authorsCourseInfo,
			quizOptions.prompt,
			quizOptions.questionLimit,
			quizOptions.name,
			startedAttemptsUserIds,
			finishedUserAttempts,
			started,
			finished,
			questions
		);
	}

	// Load quiz from kv
	public static async getQuiz(env: Env, quizId: string) {
		try {
			const res = await env.QUIZS.get(quizId).catch((err) => {
				console.error(err);
				throw new KotlinKhaosAPIError('Error loading quiz state', 500);
			});

			if (!res) {
				throw new KotlinKhaosAPIError('No quiz found by that Id', 404);
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
				parsedRes.startedAttemptsUserIds,
				parsedRes.finishedUserAttempts,
				parsedRes.started,
				parsedRes.finished,
				parsedRes.questions
			);
		} catch (err) {
			if (err instanceof SyntaxError) {
				console.error(err);
				throw new KotlinKhaosAPIError('Error parsing quiz from kv', 500);
			}
			throw err;
		}
	}

	private validateNextQuestionConditions(user: User) {
		if (this.getAuthorId() !== user.getId()) {
			throw new KotlinKhaosAPIError('Only the quiz author may configure this quiz', 403);
		}
		if (this.getNumberOfQuestions() >= this.getQuestionLimit()) {
			throw new KotlinKhaosAPIError("You've reached the quiz's question limit", 400);
		}
	}
	public async nextQuestion(env: Env, user: User) {
		this.validateNextQuestionConditions(user);
		const nextQuestion = await getNextQuestion(this, env);
		this.addQuestion(nextQuestion);
		await this.saveStateToKv(env);
		return nextQuestion.content;
	}

	private validateQuizStartConditions(user: User) {
		if (this.getAuthorId() !== user.getId()) {
			throw new KotlinKhaosAPIError('Only the quiz author may configure this quiz', 403);
		}
		if (this.getNumberOfQuestions() > this.getQuestionLimit()) {
			throw new KotlinKhaosAPIError("You've exceeded the question limit for the quiz", 400);
		}
		if (this.getNumberOfQuestions() < this.getQuestionLimit()) {
			const diff = this.getQuestionLimit() - this.getNumberOfQuestions();
			throw new KotlinKhaosAPIError(`You're missing questions from your quiz, add ${diff} more`, 400);
		}
		if (this.getStarted()) {
			throw new KotlinKhaosAPIError('Quiz has already started', 400);
		}
	}

	public async startQuiz(env: Env, user: User) {
		this.validateQuizStartConditions(user);
		this.started = true;
		await this.saveStateToKv(env);
		return true;
	}

	public async addStartedAttemptUserId(env: Env, userId: string) {
		if (this.checkIfUserAttempted(userId)) {
			throw new KotlinKhaosAPIError('This user has already attempted this quiz', 400);
		}
		this.startedAttemptsUserIds.push(userId);
		await this.saveStateToKv(env);
	}

	public static async addFinishedUserAttempt(env: Env, userAttempt: FinishedUserAttempt, quizId: string) {
		const quiz = await Quiz.getQuiz(env, quizId);
		quiz.finishedUserAttempts.push(userAttempt);
		await quiz.saveStateToKv(env);
	}

	private async saveStateToKv(env: Env) {
		await env.QUIZS.put(this.getId(), this.toString()).catch((err) => {
			console.error(err);
			throw new KotlinKhaosAPIError('Error saving quiz state', 500);
		});
	}

	private toString() {
		return JSON.stringify({
			authorId: this.getAuthorId(),
			courseId: this.getCourseId(),
			savedAuthorsCourseInfo: this.getSavedAuthorsCourseInfo(),
			prompt: this.getPrompt(),
			questionLimit: this.getQuestionLimit(),
			name: this.getName(),
			startedAttemptsUserIds: this.getStartedAttemptsUserIds(),
			finishedUserAttempts: this.getFinishedUserAttempts(),
			started: this.getStarted(),
			finished: this.getFinished(),
			questions: this.getQuestions(),
		});
	}
}
