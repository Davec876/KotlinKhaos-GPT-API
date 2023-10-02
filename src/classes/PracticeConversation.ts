import {
	continueConversation,
	createNewConversation,
	giveFeedbackToConversation,
	giveFinalScoreFromConversation,
} from '../services/openAi';
import type { Env } from '../index';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type User from './User';

export default class PracticeQuizConversation {
	private readonly id: string;
	private readonly userId: string;
	private readonly prompt: string;
	private readonly questionLimit: number;
	private currentQuestionNumber: number;
	private history: ChatCompletionMessage[];

	private constructor(
		id: PracticeQuizConversation['id'],
		userId: PracticeQuizConversation['userId'],
		prompt: PracticeQuizConversation['prompt'],
		questionLimit: PracticeQuizConversation['questionLimit'],
		currentQuestionNumber: PracticeQuizConversation['currentQuestionNumber'],
		history: ChatCompletionMessage[]
	) {
		this.id = id;
		this.userId = userId;
		this.prompt = prompt;
		this.questionLimit = questionLimit;
		this.currentQuestionNumber = currentQuestionNumber;
		this.history = history;
	}

	public getId() {
		return this.id;
	}
	private getUserId() {
		return this.userId;
	}
	public getPrompt() {
		return this.prompt;
	}
	private getQuestionLimit() {
		return this.questionLimit;
	}
	private getCurrentQuestionNumber() {
		return this.currentQuestionNumber;
	}
	private async incrementCurrentQuestionNumber(env: Env) {
		this.currentQuestionNumber = this.currentQuestionNumber + 1;
		await env.PRACTICE_CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 });
	}
	public getHistory() {
		return this.history;
	}
	public getLatestContent() {
		return this.history[this.history.length - 1].content;
	}
	public async appendMessagesToHistory(env: Env, message: ChatCompletionMessage[]) {
		this.history = this.history.concat(message);
		await env.PRACTICE_CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 });
	}
	public async appendMessageToHistory(env: Env, message: ChatCompletionMessage) {
		this.history.push(message);
		await env.PRACTICE_CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 });
	}

	public static async newConversation(env: Env, user: User, prompt: string) {
		const practiceConversationId = crypto.randomUUID();
		const questionLimit = 3;
		const currentQuestionNumber = 1;
		// const usersClass = Class.getClass(env, user.getClassId());

		const completionMessage = await createNewConversation(env, prompt);
		const history = [completionMessage];
		await env.PRACTICE_CONVERSATIONS.put(
			practiceConversationId,
			JSON.stringify({
				userId: user.getId(),
				prompt: prompt,
				questionLimit,
				currentQuestionNumber,
				history,
			}),
			{
				expirationTtl: 86400,
			}
		);
		return new PracticeQuizConversation(practiceConversationId, user.getId(), prompt, questionLimit, currentQuestionNumber, history);
	}

	public static async getConversation(env: Env, practiceConversationId: string) {
		const res = await env.PRACTICE_CONVERSATIONS.get(practiceConversationId);

		if (!res) {
			return null;
		}

		const parsedRes = JSON.parse(res);

		return new PracticeQuizConversation(
			practiceConversationId,
			parsedRes.userId,
			parsedRes.prompt,
			parsedRes.questionLimit,
			parsedRes.currentQuestionNumber,
			parsedRes.history
		);
	}

	public async continue(env: Env) {
		const numberOfUserResponses = this.getHistory().filter(({ role }) => role === 'user').length;

		// Finished Quiz
		if (this.getCurrentQuestionNumber() > this.getQuestionLimit()) {
			return this.getLatestContent();
		}
		// Generate final score once last question is complete
		if (this.getCurrentQuestionNumber() === this.getQuestionLimit()) {
			this.incrementCurrentQuestionNumber(env);
			return this.getFinalScore(env);
		}

		// Don't continue until the user has responded
		if (this.getCurrentQuestionNumber() > numberOfUserResponses) {
			return this.getLatestContent();
		}

		const feedbackMessage = await continueConversation(this, env);
		await this.incrementCurrentQuestionNumber(env);
		return feedbackMessage;
	}

	public async giveFeedback(env: Env, userAnswer: string) {
		const numberOfAssistantResponses = this.getHistory().filter(({ role }) => role === 'assistant').length;

		// Don't generate feedback if quiz is finished, or if feedback has already been given for this question
		if (
			this.getCurrentQuestionNumber() > this.getQuestionLimit() ||
			this.getCurrentQuestionNumber() === numberOfAssistantResponses - this.getCurrentQuestionNumber()
		) {
			return this.getLatestContent();
		}

		const feedbackMessage = await giveFeedbackToConversation(this, userAnswer, env);
		return feedbackMessage;
	}

	public async getFinalScore(env: Env) {
		const finalScore = await giveFinalScoreFromConversation(this, env);
		return finalScore;
	}

	private toString() {
		return JSON.stringify({
			userId: this.getUserId(),
			prompt: this.getPrompt(),
			questionLimit: this.getQuestionLimit(),
			currentQuestionNumber: this.getCurrentQuestionNumber(),
			history: this.getHistory(),
		});
	}
}
