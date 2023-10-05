import { OpenAI } from 'openai';
import { getModel } from './openAiShared';
import type { Env } from '../../index';
import type QuizAttempt from '../../classes/QuizAttempt';
import type { ChatCompletionMessage } from 'openai/resources/chat';

function mergedQuestionsAndUserAnswers(quizAttempt: QuizAttempt): ChatCompletionMessage[] {
	const mergedQuestionsAndUserAnswers: ChatCompletionMessage[] = [];
	const numberOfQuestions = quizAttempt.getNumberOfQuestions();
	const questions = quizAttempt.getQuizQuestions();
	const userAnswers = quizAttempt.getUserAnswers();

	for (let i = 0; i < numberOfQuestions; i++) {
		const question = questions[i];
		const userMessage: ChatCompletionMessage = {
			content: userAnswers[i],
			role: 'user',
		};

		mergedQuestionsAndUserAnswers.push(question);
		mergedQuestionsAndUserAnswers.push(userMessage);
	}
	return mergedQuestionsAndUserAnswers;
}

function getFinalScoreMessage(history: ChatCompletionMessage[]): ChatCompletionMessage[] {
	const finalScoreMessage = history.concat({
		content:
			'Tally up the score based off all the users answers and reply with a final serious score out of 10 in the exact stringified json format {"score": "scoreAchieved/10"}',
		role: 'system',
	});
	return finalScoreMessage;
}

export async function giveFinalScoreFromQuizAttempt(quizAttempt: QuizAttempt, env: Env): Promise<ChatCompletionMessage> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const history = mergedQuestionsAndUserAnswers(quizAttempt);
	const message = getFinalScoreMessage(history);

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
	});
	const finalScore = completion.choices[0].message;
	return finalScore;
}
