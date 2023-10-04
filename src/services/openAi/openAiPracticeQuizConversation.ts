import { OpenAI } from 'openai';
import type { Env } from '../../index';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type PracticeQuiz from '../../classes/PracticeQuiz';

function getStartingMessage(savedUsersCourseInfo: PracticeQuiz['savedUsersCourseInfo'], prompt: string): ChatCompletionMessage[] {
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

function giveFeedbackMessage(practiceQuiz: PracticeQuiz, userMessage: ChatCompletionMessage): ChatCompletionMessage[] {
	const usersCourseInfo = practiceQuiz.getSavedUsersCourseInfo();
	const systemMessage: ChatCompletionMessage = {
		content: `A ${usersCourseInfo.educationLevel} student who is taking a course about the ${usersCourseInfo.description} is replying to a question that you've just given them in a numbered quiz format. You are replying to them and giving them serious concise feedback within 50 words on their answer and assigning a score out of 10 in the format 'Score: score/10'`,
		role: 'system',
	};
	const feedbackMessage = [systemMessage, ...practiceQuiz.getHistory(), userMessage];
	return feedbackMessage;
}

function continueConversationMessage(practiceQuiz: PracticeQuiz): ChatCompletionMessage[] {
	const startingMessage = getStartingMessage(practiceQuiz.getSavedUsersCourseInfo(), practiceQuiz.getPrompt());
	return [...startingMessage, ...practiceQuiz.getHistory()];
}

function getFinalScoreMessage(history: ChatCompletionMessage[]): ChatCompletionMessage[] {
	const finalScoreMessage = history.concat({
		content:
			'Tally up the score based off all the users answers and feedback provided and reply with a final serious score out of 10 in the exact stringified json format {"score": "scoreAchieved/10"}',
		role: 'system',
	});
	return finalScoreMessage;
}

function getModel(env: Env) {
	return env.GPT_4 === 'true' ? 'gpt-4' : 'gpt-3.5-turbo';
}

export async function createNewConversation(
	env: Env,
	savedUsersCourseInfo: PracticeQuiz['savedUsersCourseInfo'],
	prompt: string
): Promise<ChatCompletionMessage> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: getStartingMessage(savedUsersCourseInfo, prompt),
		max_tokens: 50,
	});
	const newQuestion = completion.choices[0].message;

	return newQuestion;
}

export async function continueConversation(practiceQuiz: PracticeQuiz, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = continueConversationMessage(practiceQuiz);

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
	});
	const nextQuestion = completion.choices[0].message;

	const newState = 'awaitingUserResponse';
	await practiceQuiz.appendMessageToHistory(env, newState, nextQuestion);
	return practiceQuiz.getLatestContent();
}

export async function giveFeedbackToConversation(practiceQuiz: PracticeQuiz, userAnswer: string, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const userMessage: ChatCompletionMessage = {
		content: userAnswer,
		role: 'user',
	};
	const message = giveFeedbackMessage(practiceQuiz, userMessage);

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 100,
	});
	const feedback = completion.choices[0].message;

	// Combine user message and feedback from GPT
	const messages = [userMessage, feedback];

	const newState = 'assistantResponded';
	await practiceQuiz.appendMessagesToHistory(env, newState, messages);
	return practiceQuiz.getLatestContent();
}

export async function giveFinalScoreFromConversation(practiceQuiz: PracticeQuiz, env: Env): Promise<string | null> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = getFinalScoreMessage(practiceQuiz.getHistory());

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
	});
	const completionMessage = completion.choices[0].message;

	const newState = 'completed';
	await practiceQuiz.appendMessageToHistory(env, newState, completionMessage);
	return practiceQuiz.getLatestContent();
}
