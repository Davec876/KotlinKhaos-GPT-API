import Course, { type CourseInfoSnapshotForQuiz } from './Course';
import { createNewQuiz, getNextQuestion } from '../services/openAi/openAiQuiz';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { Env } from '../index';
import type User from './User';
import type QuizAttempt from './QuizAttempt';
import { KotlinKhaosAPIError } from './errors/KotlinKhaosAPI';

interface FinishedUserAttempt {
	readonly attemptId: QuizAttempt['id'];
	readonly studentId: User['id'];
	readonly score: number;
	readonly submittedOn: Date;
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
	private startedAttemptsUserIds: Set<User['id']>;
	private finishedUserAttempts: Map<User['id'], FinishedUserAttempt>;
	private questions: ChatCompletionMessageParam[];
	private startedAt?: Date;
	private finishedAt?: Date;

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
		questions: Quiz['questions'],
		startedAt?: Date,
		finishedAt?: Date
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
		this.questions = questions;
		this.startedAt = startedAt;
		this.finishedAt = finishedAt;
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
	public getName() {
		return this.name;
	}
	private getStartedAttemptsUserIds() {
		return this.startedAttemptsUserIds;
	}
	private getFinishedUserAttempts() {
		return this.finishedUserAttempts;
	}
	private getStartedAt() {
		return this.startedAt;
	}
	private getFinishedAt() {
		return this.finishedAt;
	}
	private isStarted() {
		return !!this.getStartedAt();
	}
	private isFinished() {
		return !!this.getFinishedAt();
	}
	public getQuestions() {
		return this.questions;
	}
	public getNumberOfQuestions() {
		return this.questions.length;
	}
	private clearStartedAttempts() {
		this.startedAttemptsUserIds = new Set();
	}
	private addStartedAttemptUserId(userId: string) {
		this.startedAttemptsUserIds.add(userId);
	}
	private addFinishedUserAttempt(userId: string, finishedUserAttempt: FinishedUserAttempt) {
		this.finishedUserAttempts.set(userId, finishedUserAttempt);
	}
	private checkIfUserIsStudent(user: User) {
		return user.getCourseId() === this.getCourseId();
	}
	private checkIfUserIsAuthor(user: User) {
		return user.getId() === this.getAuthorId();
	}
	private checkIfUserFinished(userId: string) {
		return this.finishedUserAttempts.has(userId);
	}
	private checkIfUserAttempted(userId: string) {
		return this.startedAttemptsUserIds.has(userId) || this.finishedUserAttempts.has(userId);
	}
	private setStartedAt(startedAt: Date) {
		this.startedAt = startedAt;
	}
	private setFinishedAt(finishedAt: Date) {
		this.finishedAt = finishedAt;
	}
	private setQuestions(questions: ChatCompletionMessageParam[]) {
		this.questions = questions;
	}
	public getQuizAttemptScoreViewForStudent(user: User) {
		if (!this.checkIfUserIsStudent(user)) {
			throw new KotlinKhaosAPIError('Only course members can view this quiz', 403);
		}
		if (!this.checkIfUserFinished(user.getId()) && this.checkIfUserAttempted(user.getId())) {
			throw new KotlinKhaosAPIError('User has not finished this quiz', 404);
		}
		if (!this.checkIfUserAttempted(user.getId())) {
			throw new KotlinKhaosAPIError('User has not attempted this quiz', 404);
		}
		const usersAttempt = this.getFinishedUserAttempts().get(user.getId());
		return usersAttempt;
	}
	public getQuizViewForStudent(user: User) {
		if (!this.checkIfUserIsStudent(user)) {
			throw new KotlinKhaosAPIError('Only course members can view this quiz', 403);
		}
		const usersAttempt = this.getFinishedUserAttempts().get(user.getId()) ?? null;
		return {
			id: this.getId(),
			name: this.getName(),
			started: this.isStarted(),
			finished: this.isFinished(),
			usersAttempt: usersAttempt,
		};
	}
	public getQuizViewForInstructor(user: User) {
		if (!this.checkIfUserIsAuthor(user)) {
			throw new KotlinKhaosAPIError("Only the quiz author can view this quiz's details", 403);
		}
		const startedAttemptsUserIds = [...this.getStartedAttemptsUserIds()];
		const finishedUserAttempts = Object.fromEntries(this.getFinishedUserAttempts().entries());
		return {
			id: this.getId(),
			name: this.getName(),
			started: this.isStarted(),
			finished: this.isFinished(),
			questions: this.getQuestions(),
			startedAttemptsUserIds,
			finishedUserAttempts,
		};
	}
	private async addQuestion(question: ChatCompletionMessageParam) {
		this.questions.push(question);
	}
	private static validateNewQuizConditions(quizOptions: QuizOptions, user: User) {
		if (user.getType() !== 'instructor') {
			throw new KotlinKhaosAPIError("Only instructors may create quiz's", 403);
		}

		if (quizOptions.prompt.length > 40) {
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
		const startedAttemptsUserIds: Set<string> = new Set();
		const finishedUserAttempts: Map<string, FinishedUserAttempt> = new Map();
		const startedAt = undefined;
		const finishedAt = undefined;

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
				startedAttemptsUserIds: [...startedAttemptsUserIds],
				finishedUserAttempts: Object.fromEntries(finishedUserAttempts.entries()),
				startedAt,
				finishedAt,
				questions,
			}),
			{
				expirationTtl: 86400,
			}
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
			questions,
			startedAt,
			finishedAt
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

			// Convert back to Set and Map
			const startedAttemptsUserIds: Set<User['id']> = new Set(parsedRes.startedAttemptsUserIds);
			const finishedUserAttempts: Map<User['id'], FinishedUserAttempt> = new Map(Object.entries(parsedRes.finishedUserAttempts));
			// Parse date from map
			finishedUserAttempts.forEach((userAttempt) => {
				(userAttempt.submittedOn as Date) = new Date(userAttempt.submittedOn);
			});

			// Parsed Date
			const startedAt = parsedRes.startedAt ? new Date(parsedRes.startedAt) : undefined;
			const finishedAt = parsedRes.finishedAt ? new Date(parsedRes.finishedAt) : undefined;

			return new Quiz(
				quizId,
				parsedRes.authorId,
				parsedRes.courseId,
				parsedRes.savedAuthorsCourseInfo,
				parsedRes.prompt,
				parsedRes.questionLimit,
				parsedRes.name,
				startedAttemptsUserIds,
				finishedUserAttempts,
				parsedRes.questions,
				startedAt,
				finishedAt
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
		if (!this.checkIfUserIsAuthor(user)) {
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
		if (!this.checkIfUserIsAuthor(user)) {
			throw new KotlinKhaosAPIError('Only the quiz author may configure this quiz', 403);
		}
		if (this.getNumberOfQuestions() > this.getQuestionLimit()) {
			throw new KotlinKhaosAPIError("You've exceeded the question limit for the quiz", 400);
		}
		if (this.getNumberOfQuestions() < this.getQuestionLimit()) {
			const diff = this.getQuestionLimit() - this.getNumberOfQuestions();
			throw new KotlinKhaosAPIError(`You're missing questions from your quiz, add ${diff} more`, 400);
		}
		if (this.isStarted()) {
			throw new KotlinKhaosAPIError('Quiz has already started', 400);
		}
	}

	public async startQuiz(env: Env, user: User) {
		this.validateQuizStartConditions(user);
		const startedAtTime = new Date();
		this.setStartedAt(startedAtTime);
		await this.saveStateToKv(env);
		return true;
	}

	public async addStartedAttemptUserIdAndSaveState(env: Env, userId: string) {
		if (!this.isStarted()) {
			throw new KotlinKhaosAPIError('Quiz has not started', 400);
		}
		if (this.checkIfUserAttempted(userId)) {
			throw new KotlinKhaosAPIError('This user has already attempted this quiz', 400);
		}
		this.addStartedAttemptUserId(userId);
		await this.saveStateToKv(env);
	}

	public static async addFinishedUserAttemptAndSaveState(env: Env, userAttempt: FinishedUserAttempt, quizId: string, userId: string) {
		const quiz = await Quiz.getQuiz(env, quizId);
		quiz.addFinishedUserAttempt(userId, userAttempt);
		await quiz.saveStateToKv(env);
	}

	private validateEditQuizQuestionsConditions(user: User, questions: string[]) {
		if (!this.checkIfUserIsAuthor(user)) {
			throw new KotlinKhaosAPIError('Only the quiz author may configure this quiz', 403);
		}
		if (this.isStarted()) {
			throw new KotlinKhaosAPIError('You cannot edit questions once the quiz is in progress', 400);
		}
		if (questions.length > this.getQuestionLimit()) {
			throw new KotlinKhaosAPIError("You've exceeded the question limit for the quiz", 400);
		}
		if (questions.length < this.getQuestionLimit()) {
			const diff = this.getQuestionLimit() - questions.length;
			throw new KotlinKhaosAPIError(`You're missing questions from your quiz, add ${diff} more`, 400);
		}
	}

	public async editQuizQuestions(env: Env, user: User, questions: string[]) {
		this.validateEditQuizQuestionsConditions(user, questions);
		const userQuestionMessages = questions.map((question) => {
			if (question.length > 300) {
				throw new KotlinKhaosAPIError('Please shorten your questions', 400);
			}
			const userMessage: ChatCompletionMessageParam = {
				content: question,
				role: 'user',
			};
			return userMessage;
		});
		this.setQuestions(userQuestionMessages);
		await this.saveStateToKvAndExpire(env);
	}

	private validateFinishQuizConditions(user: User) {
		if (!this.checkIfUserIsAuthor(user)) {
			throw new KotlinKhaosAPIError('Only the quiz author may configure this quiz', 403);
		}
		if (this.isFinished()) {
			throw new KotlinKhaosAPIError('This quiz has already finished', 400);
		}
	}

	public async finishQuiz(env: Env, user: User) {
		this.validateFinishQuizConditions(user);
		this.clearStartedAttempts();

		const authorsCourse = await Course.getCourse(env, this.getCourseId());
		const studentIds = authorsCourse.getStudentIds();

		// Assign 0 as user's score if user did not finish the quiz
		studentIds.forEach((studentId) => {
			if (!this.checkIfUserFinished(studentId)) {
				const finishedUserAttempt: FinishedUserAttempt = {
					attemptId: '',
					studentId,
					score: 0,
					submittedOn: new Date(),
				};
				this.addFinishedUserAttempt(studentId, finishedUserAttempt);
			}
		});

		const finishedAtTime = new Date();
		this.setFinishedAt(finishedAtTime);
		await this.saveStateToKv(env);
	}

	// This is used primarily for editQuiz, since we still want to expire unstarted edited quizs
	// editQuiz can only be used on unstarted quizs
	private async saveStateToKvAndExpire(env: Env) {
		await env.QUIZS.put(this.getId(), this.toString(), {
			expirationTtl: 86400,
		}).catch((err) => {
			console.error(err);
			throw new KotlinKhaosAPIError('Error saving quiz state', 500);
		});
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
			startedAttemptsUserIds: [...this.getStartedAttemptsUserIds()],
			finishedUserAttempts: Object.fromEntries(this.getFinishedUserAttempts().entries()),
			startedAt: this.getStartedAt(),
			finishedAt: this.getFinishedAt(),
			questions: this.getQuestions(),
		});
	}
}
