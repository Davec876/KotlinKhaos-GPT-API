import { OpenAI } from 'openai';
import type { Env } from '../index';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type PracticeConversation from '../classes/PracticeConversation';

function getStartingMessage(prompt: string): ChatCompletionMessage[] {
	return [
		{
			content:
				'For the following questions, reply with only one numbered android interview-type knowledge question. This is for a university student taking a course about the principles of mobile computing and the concepts and techniques underlying the design and development of mobile computing applications utilizing Kotlin.',
			role: 'system',
		},
		{
			content: `With a particular focus on ${prompt}`,
			role: 'user',
		},
	];
}

function giveFeedbackMessage(history: ChatCompletionMessage[], userAnswer: string): ChatCompletionMessage[] {
	const feedbackMessage: ChatCompletionMessage[] = [];
	const systemMessage: ChatCompletionMessage = {
		content:
			"A university student who is taking a course about the principles of mobile computing is replying to a question that you've just given them in a numbered quiz format. You are replying to them and giving them serious concise feedback within 50 words on their answer and assigning a score out of 10 in the format 'Score: score/10'",
		role: 'system',
	};
	const userMessage: ChatCompletionMessage = {
		content: userAnswer,
		role: 'user',
	};

	feedbackMessage.push(systemMessage);
	feedbackMessage.concat(history);
	feedbackMessage.push(userMessage);
	return feedbackMessage;
}

function getFinalScoreMessage(): ChatCompletionMessage[] {
	return [
		{
			content:
				'Tally up the score based off all the users answers and feedback provided and reply with a final serious score out of 10 in the exact json format {"score": scoreAchieved/10}',
			role: 'system',
		},
	];
}

export async function createNewConversation(env: Env, prompt: string): Promise<ChatCompletionMessage> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const completion = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		messages: getStartingMessage(prompt),
		max_tokens: 50,
	});

	return completion.choices[0].message;
}

export async function continueConversation(conversation: PracticeConversation, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = getStartingMessage(conversation.getPrompt()).concat(conversation.getHistory());

	const completion = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		messages: message,
		max_tokens: 50,
	});

	await conversation.appendMessageToHistory(env, completion.choices[0].message);
	return conversation.getLatestContent();
}

export async function giveFeedbackToConversation(conversation: PracticeConversation, userAnswer: string, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = giveFeedbackMessage(conversation.getHistory(), userAnswer);

	const completion = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		messages: message,
		max_tokens: 100,
	});

	// Combine user message and completion message from GPT
	const messages = [message[message.length - 1], completion.choices[0].message];

	await conversation.appendMessagesToHistory(env, messages);
	return conversation.getLatestContent();
}

export async function giveFinalScoreFromConversation(conversation: PracticeConversation, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = conversation.getHistory().concat(getFinalScoreMessage());

	const completion = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		messages: message,
		max_tokens: 50,
	});

	await conversation.appendMessageToHistory(env, completion.choices[0].message);
	return conversation.getLatestContent();
}
