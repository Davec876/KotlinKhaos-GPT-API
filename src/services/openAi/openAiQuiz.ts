import { OpenAI } from 'openai';
import { getModel } from './openAiShared';
import { getStartingMessage } from './openAiShared';
import type { Env } from '../../index';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';
import type Quiz from '../../classes/Quiz';
import type Course from '../../classes/Course';

function continueConversationMessage(quiz: Quiz): ChatCompletionMessage[] {
	const startingMessage = getStartingMessage(quiz.getSavedAuthorsCourseInfo(), quiz.getPrompt());
	return [...startingMessage, ...quiz.getQuestions()];
}

export async function createNewQuiz(env: Env, usersCourse: Course, prompt: string): Promise<ChatCompletionMessage> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: getStartingMessage(usersCourse.getCourseInfoSnapshotForQuiz(), prompt),
		max_tokens: 50,
	});
	const firstQuestion = completion.choices[0].message;

	return firstQuestion;
}

export async function getNextQuestion(quiz: Quiz, env: Env): Promise<ChatCompletionMessage> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const message = continueConversationMessage(quiz);

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
	});
	const nextQuestion = completion.choices[0].message;

	return nextQuestion;
}
