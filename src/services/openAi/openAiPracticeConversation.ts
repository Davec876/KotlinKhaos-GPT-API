import { OpenAI } from 'openai';
import type { Env } from '../../index';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type PracticeConversation from '../../classes/PracticeConversation';

function getStartingMessage(savedUsersCourseInfo: PracticeConversation['savedUsersCourseInfo'], prompt: string): ChatCompletionMessage[] {
	return [
		{
			content: `For the following questions, reply with only one numbered interview-type knowledge question. This is for a ${savedUsersCourseInfo.educationLevel} student taking a course about the ${savedUsersCourseInfo.description}`,
			role: 'system',
		},
		{
			content: `With a particular focus on ${prompt}`,
			role: 'user',
		},
	];
}

function giveFeedbackMessage(
	savedUsersCourseInfo: PracticeConversation['savedUsersCourseInfo'],
	history: ChatCompletionMessage[],
	userAnswer: string
): ChatCompletionMessage[] {
	const feedbackMessage: ChatCompletionMessage[] = [];
	const systemMessage: ChatCompletionMessage = {
		content: `A ${savedUsersCourseInfo.educationLevel} student who is taking a course about the ${savedUsersCourseInfo.description} is replying to a question that you've just given them in a numbered quiz format. You are replying to them and giving them serious concise feedback within 50 words on their answer and assigning a score out of 10 in the format 'Score: score/10'`,
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
				'Tally up the score based off all the users answers and feedback provided and reply with a final serious score out of 10 in the exact stringified json format {"score": "scoreAchieved/10"}',
			role: 'system',
		},
	];
}

function getModel(env: Env) {
	return env.GPT_4 === 'true' ? 'gpt-4' : 'gpt-3.5-turbo';
}

export async function createNewConversation(
	env: Env,
	savedUsersCourseInfo: PracticeConversation['savedUsersCourseInfo'],
	prompt: string
): Promise<ChatCompletionMessage> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: getStartingMessage(savedUsersCourseInfo, prompt),
		max_tokens: 50,
	});

	return completion.choices[0].message;
}

export async function continueConversation(conversation: PracticeConversation, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = getStartingMessage(conversation.getSavedUsersCourseInfo(), conversation.getPrompt()).concat(conversation.getHistory());

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
	});

	await conversation.appendMessageToHistory(env, completion.choices[0].message);
	return conversation.getLatestContent();
}

export async function giveFeedbackToConversation(conversation: PracticeConversation, userAnswer: string, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = giveFeedbackMessage(conversation.getSavedUsersCourseInfo(), conversation.getHistory(), userAnswer);

	const completion = await openai.chat.completions.create({
		model: getModel(env),
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
		model: getModel(env),
		messages: message,
		max_tokens: 50,
	});

	await conversation.appendMessageToHistory(env, completion.choices[0].message);
	return conversation.getLatestContent();
}
