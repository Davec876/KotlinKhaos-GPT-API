import { OpenAI } from 'openai';
import { getModel, getStartingMessage } from './openAiShared';
import type { Env } from '../../index';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type PracticeQuiz from '../../classes/PracticeQuiz';

function giveFeedbackMessage(practiceQuiz: PracticeQuiz, userMessage: ChatCompletionMessageParam): ChatCompletionMessageParam[] {
	const usersCourseInfo = practiceQuiz.getSavedUsersCourseInfo();
	const systemMessage: ChatCompletionMessageParam = {
		content: `A ${usersCourseInfo.educationLevel} student who is taking a course about the ${usersCourseInfo.description} is replying to a question that you've just given them in a numbered quiz format. You are replying to them and giving them serious concise feedback within 50 words on their answer and assigning a score out of 10 in the format 'Score: score/10'`,
		role: 'system',
	};
	const feedbackMessage = [systemMessage, ...practiceQuiz.getHistory(), userMessage];
	return feedbackMessage;
}

function continueConversationMessage(practiceQuiz: PracticeQuiz): ChatCompletionMessageParam[] {
	const startingMessage = getStartingMessage(practiceQuiz.getSavedUsersCourseInfo(), practiceQuiz.getPrompt());
	return startingMessage.concat(practiceQuiz.getHistory());
}

function getFinalScoreMessage(history: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
	const finalScoreMessage = history.concat({
		content:
			'Tally up the score based off all the users answers and feedback provided and reply with a final serious score integer from 0 to 10 in the exact json format {"score": "scoreAchieved"}',
		role: 'system',
	});
	return finalScoreMessage;
}

export async function createNewConversation(
	env: Env,
	savedUsersCourseInfo: PracticeQuiz['savedUsersCourseInfo'],
	prompt: string
): Promise<ChatCompletionMessageParam> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: getStartingMessage(savedUsersCourseInfo, prompt),
		max_tokens: 50,
	});
	const newQuestion = completion.choices[0].message;

	return newQuestion;
}

export async function continueConversation(practiceQuiz: PracticeQuiz, env: Env) {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = continueConversationMessage(practiceQuiz);

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
	});
	const nextQuestion = completion.choices[0].message;
	const newState = 'awaitingUserResponse' as const;
	return { newState, nextQuestion };
}

export async function giveFeedbackToConversation(practiceQuiz: PracticeQuiz, userAnswer: string, env: Env) {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const userMessage: ChatCompletionMessageParam = {
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
	const newState = 'assistantResponded' as const;
	return { newState, messages };
}

export async function giveFinalScoreFromConversation(practiceQuiz: PracticeQuiz, env: Env) {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = getFinalScoreMessage(practiceQuiz.getHistory());

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
		response_format: { type: 'json_object' },
	});
	const finalScore = completion.choices[0].message;
	const newState = 'completed' as const;
	return { newState, finalScore };
}
