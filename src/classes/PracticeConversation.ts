import {
	continueConversation,
	createNewConversation,
	giveFeedbackToConversation,
	giveFinalScoreFromConversation,
} from '../services/openAi/openAiPracticeConversation';
import Course from './Course';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type { Env } from '../index';
import type User from './User';

interface SavedUsersCourseInfo {
	id: string;
	educationLevel: string;
	description: string;
}

export default class PracticeQuizConversation {
	private readonly id: string;
	private readonly userId: string;
	// The user's course info at time of practice conversation creation
	private readonly savedUsersCourseInfo: SavedUsersCourseInfo;
	private readonly prompt: string;
	private readonly questionLimit: number;
	private state: 'awaitingUserResponse' | 'assistantResponded' | 'completed';
	private currentQuestionNumber: number;
	private history: ChatCompletionMessage[];

	private constructor(
		id: PracticeQuizConversation['id'],
		userId: PracticeQuizConversation['userId'],
		savedUsersCourseInfo: SavedUsersCourseInfo,
		prompt: PracticeQuizConversation['prompt'],
		questionLimit: PracticeQuizConversation['questionLimit'],
		state: PracticeQuizConversation['state'],
		currentQuestionNumber: PracticeQuizConversation['currentQuestionNumber'],
		history: ChatCompletionMessage[]
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
	private async incrementCurrentQuestionNumber(env: Env) {
		this.currentQuestionNumber = this.currentQuestionNumber + 1;
		await this.saveStateToKv(env);
	}
	public getHistory() {
		return this.history;
	}
	public getLatestContent() {
		return this.history[this.history.length - 1].content;
	}
	public async appendMessagesToHistory(env: Env, state: PracticeQuizConversation['state'], message: ChatCompletionMessage[]) {
		this.setState(state);
		this.history = this.history.concat(message);
		await this.saveStateToKv(env);
	}
	public async appendMessageToHistory(env: Env, state: PracticeQuizConversation['state'], message: ChatCompletionMessage) {
		this.setState(state);
		this.history.push(message);
		await this.saveStateToKv(env);
	}
	private setState(state: PracticeQuizConversation['state']) {
		this.state = state;
	}
	private isFinished() {
		return this.getState() === 'completed';
	}

	public static async newConversation(env: Env, user: User, prompt: string) {
		const practiceConversationId = crypto.randomUUID();
		const questionLimit = 3;
		const state = 'awaitingUserResponse';
		const currentQuestionNumber = 1;
		const usersCourse = await Course.getCourse(env, user.getCourseId());
		const usersCourseInfo: SavedUsersCourseInfo = {
			id: usersCourse.getId(),
			educationLevel: usersCourse.getEducationLevel(),
			description: usersCourse.getDescription(),
		};
		const completionMessage = await createNewConversation(env, usersCourseInfo, prompt);
		const history = [completionMessage];

		await env.PRACTICE_CONVERSATIONS.put(
			practiceConversationId,
			JSON.stringify({
				userId: user.getId(),
				savedUsersCourseInfo: usersCourseInfo,
				prompt,
				questionLimit,
				state,
				currentQuestionNumber,
				history,
			}),
			{
				expirationTtl: 86400,
			}
		);

		return new PracticeQuizConversation(
			practiceConversationId,
			user.getId(),
			usersCourseInfo,
			prompt,
			questionLimit,
			state,
			currentQuestionNumber,
			history
		);
	}

	// Load practiceConversation from kv
	public static async getConversation(env: Env, practiceConversationId: string) {
		const res = await env.PRACTICE_CONVERSATIONS.get(practiceConversationId);

		if (!res) {
			return null;
		}

		const parsedRes = JSON.parse(res);
		return new PracticeQuizConversation(
			practiceConversationId,
			parsedRes.userId,
			parsedRes.savedUsersCourseInfo,
			parsedRes.prompt,
			parsedRes.questionLimit,
			parsedRes.state,
			parsedRes.currentQuestionNumber,
			parsedRes.history
		);
	}

	public async continue(env: Env) {
		// Finished conversation
		if (this.isFinished()) {
			return this.parseFinalScore(this.getLatestContent());
		}
		// Generate final score once last question is complete
		if (this.getCurrentQuestionNumber() === this.getQuestionLimit()) {
			return this.getFinalScore(env);
		}
		// Don't continue if awaiting user response
		if (this.getState() === 'awaitingUserResponse') {
			return this.getLatestContent();
		}

		const feedbackMessage = await continueConversation(this, env);
		await this.incrementCurrentQuestionNumber(env);
		return feedbackMessage;
	}

	public async giveFeedback(env: Env, userAnswer: string) {
		// Don't generate feedback if quiz is finished or if assistant has already responded
		if (this.isFinished() || this.getState() === 'assistantResponded') {
			return this.getLatestContent();
		}

		const feedbackMessage = await giveFeedbackToConversation(this, userAnswer, env);
		return feedbackMessage;
	}

	private parseFinalScore(finalScore: string | null) {
		if (finalScore === null) {
			return null;
		}

		try {
			// TODO: Typeguard this / throw error if gpt returns wrong format
			return JSON.parse(finalScore) as { score: string };
		} catch (err) {
			if (err instanceof SyntaxError) {
				console.error(err);
				return null;
			}
			throw err;
		}
	}

	public async getFinalScore(env: Env) {
		const finalScore = await giveFinalScoreFromConversation(this, env);
		return this.parseFinalScore(finalScore);
	}

	private async saveStateToKv(env: Env) {
		await env.PRACTICE_CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 });
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
		});
	}
}
