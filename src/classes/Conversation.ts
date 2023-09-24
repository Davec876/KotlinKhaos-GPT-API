import {
	continueConversation,
	createNewConversation,
	giveFeedbackToConversation,
	giveFinalScoreFromConversation,
} from '../services/openAi';
import type { Env } from '../index';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';

export default class Conversation {
	private readonly conversationId: string;
	private readonly userId: string;
	private readonly prompt: string;
	private questionCount: number;
	private history: ChatCompletionMessage[];

	private constructor(
		conversationId: string,
		userId: Conversation['userId'],
		prompt: Conversation['prompt'],
		questionCount: Conversation['questionCount'],
		history: Conversation['history']
	) {
		this.conversationId = conversationId;
		this.userId = userId;
		this.prompt = prompt;
		this.questionCount = questionCount;
		this.history = history;
	}

	public getId() {
		return this.conversationId;
	}
	private getUserId() {
		return this.userId;
	}
	public getPrompt() {
		return this.prompt;
	}
	private getQuestionCount() {
		return this.questionCount;
	}
	private async incrementQuestionCount(env: Env) {
		this.questionCount = this.questionCount + 1;
		await env.CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 });
	}
	public getHistory() {
		return this.history;
	}
	private getLatestHistory() {
		return this.history[this.history.length - 1];
	}
	public getLatestContent() {
		return this.history[this.history.length - 1].content;
	}
	public async appendMessagesToHistory(env: Env, message: ChatCompletionMessage[]) {
		this.history = this.history.concat(message);
		await env.CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 });
	}
	public async appendMessageToHistory(env: Env, message: ChatCompletionMessage) {
		this.history.push(message);
		await env.CONVERSATIONS.put(this.getId(), this.toString(), { expirationTtl: 86400 });
	}

	public static async newConversation(env: Env, userId: string, prompt: string) {
		const conversationId = crypto.randomUUID();
		const questionCount = 1;

		const completionMessage = await createNewConversation(env, prompt);
		const history = [completionMessage];
		await env.CONVERSATIONS.put(conversationId, JSON.stringify({ userId, prompt, questionCount, history }), { expirationTtl: 86400 });
		return new Conversation(conversationId, userId, prompt, questionCount, history);
	}

	public static async getConversation(env: Env, conversationId: string) {
		const res = await env.CONVERSATIONS.get(conversationId);

		if (!res) {
			return null;
		}

		const parsedRes = JSON.parse(res);

		return new Conversation(conversationId, parsedRes.userId, parsedRes.prompt, parsedRes.questionCount, parsedRes.history);
	}

	public async continue(env: Env) {
		const numberOfUserResponses = this.getHistory().filter(({ role }) => role === 'user').length;

		// Finished Quiz
		if (this.getQuestionCount() > 3) {
			return this.getLatestContent();
		}
		if (this.getQuestionCount() === 3) {
			this.incrementQuestionCount(env);
			return this.getFinalScore(env);
		}

		// Don't continue until the user has responded
		if (this.getQuestionCount() > numberOfUserResponses) {
			return this.getLatestContent();
		}

		const feedbackMessage = await continueConversation(this, env);
		await this.incrementQuestionCount(env);
		return feedbackMessage;
	}

	public async giveFeedback(env: Env, userAnswer: string) {
		const numberOfAssistantResponses = this.getHistory().filter(({ role }) => role === 'assistant').length;

		// Don't generate feedback if feedback has already been given for this question
		if (this.getQuestionCount() === numberOfAssistantResponses - this.getQuestionCount()) {
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
			questionCount: this.getQuestionCount(),
			history: this.getHistory(),
		});
	}
}
