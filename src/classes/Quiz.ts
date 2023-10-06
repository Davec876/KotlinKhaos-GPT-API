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
	private startedAttemptsUserIds: Set<User['id']>;
	private finishedUserAttempts: Map<User['id'], FinishedUserAttempt>;
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
	private clearStartedAttempts() {
		this.startedAttemptsUserIds = new Set();
	}
	private addStartedAttemptUserId(userId: string) {
		if (this.checkIfUserAttempted(userId)) {
			throw new KotlinKhaosAPIError('This user has already attempted this quiz', 400);
		}
		this.startedAttemptsUserIds.add(userId);
	}
	private addFinishedUserAttempt(userId: string, finishedUserAttempt: FinishedUserAttempt) {
		this.finishedUserAttempts.set(userId, finishedUserAttempt);
	}
	private checkIfUserFinished(userId: string) {
		return this.finishedUserAttempts.has(userId);
	}
	private checkIfUserAttempted(userId: string) {
		return this.startedAttemptsUserIds.has(userId) || this.finishedUserAttempts.has(userId);
	}
	private setStarted(started: boolean) {
		this.started = started;
	}
	private setFinished(finished: boolean) {
		this.finished = finished;
	}
	private setQuestions(questions: ChatCompletionMessage[]) {
		this.questions = questions;
	}
	public getQuizAttemptViewForStudent(user: User) {
		if (user.getCourseId() !== this.getCourseId()) {
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
	public getQuizViewForInstructor(user: User) {
		if (user.getId() !== this.getAuthorId()) {
			throw new KotlinKhaosAPIError("Only the quiz author can view this quiz's details", 403);
		}
		const startedAttemptsUserIds = [...this.getStartedAttemptsUserIds()];
		const finishedUserAttempts = Object.fromEntries(this.getFinishedUserAttempts().entries());
		return {
			name: this.getName(),
			started: this.getStarted(),
			finished: this.getFinished(),
			questions: this.getQuestions(),
			startedAttemptsUserIds,
			finishedUserAttempts,
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
		const startedAttemptsUserIds: Set<string> = new Set();
		const finishedUserAttempts: Map<string, FinishedUserAttempt> = new Map();
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
				startedAttemptsUserIds: [...startedAttemptsUserIds],
				finishedUserAttempts: Object.fromEntries(finishedUserAttempts.entries()),
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

			// Convert back to Set and Map
			const startedAttemptsUserIds: Set<User['id']> = new Set(parsedRes.startedAttemptsUserIds);
			const finishedUserAttempts: Map<User['id'], FinishedUserAttempt> = new Map(Object.entries(parsedRes.finishedUserAttempts));

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
		this.setStarted(true);
		await this.saveStateToKv(env);
		return true;
	}

	public async addStartedAttemptUserIdAndSaveState(env: Env, userId: string) {
		this.addStartedAttemptUserId(userId);
		await this.saveStateToKv(env);
	}

	public static async addFinishedUserAttemptAndSaveState(env: Env, userAttempt: FinishedUserAttempt, quizId: string, userId: string) {
		const quiz = await Quiz.getQuiz(env, quizId);
		quiz.addFinishedUserAttempt(userId, userAttempt);
		await quiz.saveStateToKv(env);
	}

	private validateEditQuizQuestionsConditions(user: User, questions: string[]) {
		if (this.getAuthorId() !== user.getId()) {
			throw new KotlinKhaosAPIError('Only the quiz author may configure this quiz', 403);
		}
		if (this.getStarted()) {
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
			const userMessage: ChatCompletionMessage = {
				content: question,
				role: 'user',
			};
			return userMessage;
		});
		this.setQuestions(userQuestionMessages);
		await this.saveStateToKv(env);
	}

	private validateFinishQuizConditions(user: User) {
		if (this.getAuthorId() !== user.getId()) {
			throw new KotlinKhaosAPIError('Only the quiz author may configure this quiz', 403);
		}
		if (this.getFinished()) {
			throw new KotlinKhaosAPIError('This quiz has already finished', 400);
		}
	}

	public async finishQuiz(env: Env, user: User) {
		this.validateFinishQuizConditions(user);
		this.clearStartedAttempts();

		const authorsCourse = await Course.getCourse(env, this.getCourseId());
		const courseMemberIds = authorsCourse.getUserIds();

		// Assign 0 as user's score if user did not finish the quiz
		courseMemberIds.forEach((courseMemberId) => {
			if (!this.checkIfUserFinished(courseMemberId)) {
				const finishedUserAttempt: FinishedUserAttempt = {
					attemptId: '',
					userId: courseMemberId,
					score: '0',
				};
				this.addFinishedUserAttempt(courseMemberId, finishedUserAttempt);
			}
		});

		this.setFinished(true);
		await this.saveStateToKv(env);
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
			started: this.getStarted(),
			finished: this.getFinished(),
			questions: this.getQuestions(),
		});
	}
}
