import {
	continueConversation,
	createNewConversation,
	giveFeedbackToConversation,
	giveFinalScoreFromConversation,
} from '../services/openAi/openAiPracticeQuizConversation';
import Course, { type CourseInfoSnapshotForQuiz } from './Course';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { Env } from '../index';
import type User from './User';
import type { PracticeQuizKv } from '../types/kv';
import { KotlinKhaosAPIError } from './errors/KotlinKhaosAPI';
import { parseFinalScore } from '../services/openAi/openAiShared';

export default class PracticeQuiz {
	private readonly id: string;
	private readonly userId: User['id'];
	// The user's course info at time of practice conversation creation
	private readonly savedUsersCourseInfo: CourseInfoSnapshotForQuiz;
	private readonly prompt: string;
	private readonly questionLimit: number;
	private state: 'awaitingUserResponse' | 'assistantResponded' | 'completed';
	private currentQuestionNumber: number;
	private history: ChatCompletionMessageParam[];

	private constructor(
		id: PracticeQuiz['id'],
		userId: PracticeQuiz['userId'],
		savedUsersCourseInfo: PracticeQuiz['savedUsersCourseInfo'],
		prompt: PracticeQuiz['prompt'],
		questionLimit: PracticeQuiz['questionLimit'],
		state: PracticeQuiz['state'],
		currentQuestionNumber: PracticeQuiz['currentQuestionNumber'],
		history: ChatCompletionMessageParam[]
	) {
		this.id = id;
		this.userId = userId;
		this.savedUsersCourseInfo = savedUsersCourseInfo;
		this.prompt = prompt;
		this.questionLimit = questionLimit;
		this.state = state;
		this.currentQuestionNumber = currentQuestionNumber;
		this.history = history;
	}

	public getId() {
		return this.id;
	}
	private getUserId() {
		return this.userId;
	}
	public getSavedUsersCourseInfo() {
		return this.savedUsersCourseInfo;
	}
	public getPrompt() {
		return this.prompt;
	}
	private getQuestionLimit() {
		return this.questionLimit;
	}
	private getState() {
		return this.state;
	}
	private getCurrentQuestionNumber() {
		return this.currentQuestionNumber;
	}
	private incrementCurrentQuestionNumber() {
		this.currentQuestionNumber = this.currentQuestionNumber + 1;
	}
	public getHistory() {
		return this.history;
	}
	private getLatestContent() {
		return this.history[this.history.length - 1].content;
	}
	private checkIfUserIsQuizCreator(user: User) {
		return this.getUserId() === user.getId();
	}
	public getPracticeViewForStudent(user: User) {
		if (!this.checkIfUserIsQuizCreator(user)) {
			throw new KotlinKhaosAPIError("You don't have access to this practiceQuiz", 403);
		}
		if (this.isFinished()) {
			// Validate finalScore
			const parsedFinalScore = parseFinalScore(this.getLatestContent());
			if (parsedFinalScore === null) {
				throw new KotlinKhaosAPIError('Error parsing final score for practiceQuiz', 500);
			}
			return { score: parsedFinalScore };
		}
		return { message: this.getLatestContent() };
	}
	private async appendMessagesToHistory(env: Env, state: PracticeQuiz['state'], message: ChatCompletionMessageParam[]) {
		this.setState(state);
		this.history = this.history.concat(message);
	}
	private async appendMessageToHistory(env: Env, state: PracticeQuiz['state'], message: ChatCompletionMessageParam) {
		this.setState(state);
		this.history.push(message);
	}
	private setState(state: PracticeQuiz['state']) {
		this.state = state;
	}
	private isFinished() {
		return this.getState() === 'completed';
	}

	public static async newQuiz(env: Env, user: User, prompt: string) {
		if (prompt.length > 40) {
			throw new KotlinKhaosAPIError('Prompt is too long', 400);
		}

		const practiceQuizId = crypto.randomUUID();
		const questionLimit = 3;
		const state = 'awaitingUserResponse';
		const currentQuestionNumber = 1;
		const usersCourse = await Course.getCourse(env, user.getId(), user.getCourseId());
		const usersCourseInfo = usersCourse.getCourseInfoSnapshotForQuiz();
		const question = await createNewConversation(env, usersCourseInfo, prompt);
		const history = [question];

		await env.PRACTICE_QUIZ_CONVERSATIONS.put(
			practiceQuizId,
			JSON.stringify({
				userId: user.getId(),
				savedUsersCourseInfo: usersCourseInfo,
				prompt,
				questionLimit,
				state,
				currentQuestionNumber,
				history,
			} satisfies PracticeQuizKv),
			{
				expirationTtl: 86400,
			}
		).catch((err) => {
			console.error(err);
			throw new KotlinKhaosAPIError('Error creating new practiceQuiz', 500);
		});

		return new PracticeQuiz(practiceQuizId, user.getId(), usersCourseInfo, prompt, questionLimit, state, currentQuestionNumber, history);
	}

	// Load practiceQuiz from kv
	public static async getQuiz(env: Env, practiceQuizId: string) {
		try {
			const res = await env.PRACTICE_QUIZ_CONVERSATIONS.get<PracticeQuizKv>(practiceQuizId, { type: 'json' }).catch((err) => {
				console.error(err);
				throw new KotlinKhaosAPIError('Error loading practiceQuiz state', 500);
			});

			if (!res) {
				throw new KotlinKhaosAPIError('No practiceQuiz found by that Id', 404);
			}

			return new PracticeQuiz(
				practiceQuizId,
				res.userId,
				res.savedUsersCourseInfo,
				res.prompt,
				res.questionLimit,
				res.state,
				res.currentQuestionNumber,
				res.history
			);
		} catch (err) {
			if (err instanceof SyntaxError) {
				console.error(err);
				throw new KotlinKhaosAPIError('Error parsing quiz from kv', 500);
			}
			throw err;
		}
	}

	public async continue(env: Env, user: User) {
		if (!this.checkIfUserIsQuizCreator(user)) {
			throw new KotlinKhaosAPIError("You don't have access to this practiceQuiz", 403);
		}
		// Finished conversation
		if (this.isFinished()) {
			throw new KotlinKhaosAPIError('Cannot continue, quiz has finished', 400);
		}
		// Generate final score once last question is complete
		if (this.getCurrentQuestionNumber() === this.getQuestionLimit()) {
			const finalScore = await this.getFinalScore(env);
			return { score: finalScore };
		}
		// Don't continue if awaiting user response
		if (this.getState() === 'awaitingUserResponse') {
			throw new KotlinKhaosAPIError('Awaiting user response, cannot continue', 400);
		}

		const { newState, nextQuestion } = await continueConversation(this, env);
		this.appendMessageToHistory(env, newState, nextQuestion);
		this.incrementCurrentQuestionNumber();
		await this.saveStateToKv(env);
		return { problem: this.getLatestContent() };
	}

	private validateFeedbackConditions(user: User, userAnswer: string) {
		if (!this.checkIfUserIsQuizCreator(user)) {
			throw new KotlinKhaosAPIError("You don't have access to this practiceQuiz", 403);
		}
		if (!userAnswer) {
			throw new KotlinKhaosAPIError('No answer specified!', 400);
		}

		if (userAnswer.length > 300) {
			throw new KotlinKhaosAPIError('Please shorten your answer', 400);
		}

		// Don't generate feedback if quiz is finished or if assistant has already responded
		if (this.getState() === 'assistantResponded') {
			throw new KotlinKhaosAPIError('Awaiting user response, cannot give feedback', 400);
		}
		if (this.isFinished()) {
			throw new KotlinKhaosAPIError('Cannot give feedback, quiz has finished', 400);
		}
	}

	public async giveFeedback(env: Env, user: User, userAnswer: string) {
		this.validateFeedbackConditions(user, userAnswer);

		const { newState, messages } = await giveFeedbackToConversation(this, userAnswer, env);
		this.appendMessagesToHistory(env, newState, messages);
		await this.saveStateToKv(env);
		return { feedback: this.getLatestContent() };
	}

	private async getFinalScore(env: Env) {
		const { newState, finalScore } = await giveFinalScoreFromConversation(this, env);

		// Validate finalScore
		const parsedFinalScore = parseFinalScore(finalScore.content);
		if (parsedFinalScore === null) {
			throw new KotlinKhaosAPIError('Error parsing final score for practiceQuiz', 500);
		}

		this.appendMessageToHistory(env, newState, finalScore);
		await this.saveStateToKv(env);
		return parsedFinalScore;
	}

	private async saveStateToKv(env: Env) {
		await env.PRACTICE_QUIZ_CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 }).catch((err) => {
			console.error(err);
			throw new KotlinKhaosAPIError('Error saving practiceQuiz state', 500);
		});
	}

	private toString() {
		return JSON.stringify({
			userId: this.getUserId(),
			savedUsersCourseInfo: this.savedUsersCourseInfo,
			prompt: this.getPrompt(),
			questionLimit: this.getQuestionLimit(),
			state: this.getState(),
			currentQuestionNumber: this.getCurrentQuestionNumber(),
			history: this.getHistory(),
		} satisfies PracticeQuizKv);
	}
}
