import { OpenAI } from 'openai';
import { getModel } from './openAiShared';
import type { Env } from '../../index';
import type QuizAttempt from '../../classes/QuizAttempt';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

function mergedQuestionsAndUserAnswers(quizAttempt: QuizAttempt): ChatCompletionMessageParam[] {
	const mergedQuestionsAndUserAnswers: ChatCompletionMessageParam[] = [];
	const numberOfQuestions = quizAttempt.getNumberOfQuestions();
	const questions = quizAttempt.getQuizQuestions();
	const userAnswers = quizAttempt.getUserAnswers();

	for (let i = 0; i < numberOfQuestions; i++) {
		const question = questions[i];
		const userMessage: ChatCompletionMessageParam = {
			content: userAnswers[i],
			role: 'user',
		};

		mergedQuestionsAndUserAnswers.push(question);
		mergedQuestionsAndUserAnswers.push(userMessage);
	}
	return mergedQuestionsAndUserAnswers;
}

function getFinalScoreMessage(history: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
	const finalScoreMessage = history.concat({
		content:
			'Tally up the score based off all the users answers and reply with a final serious score integer from 0 to 10 in the exact json format {"score": "scoreAchieved"}',
		role: 'system',
	});
	return finalScoreMessage;
}

export async function giveFinalScoreFromQuizAttempt(quizAttempt: QuizAttempt, env: Env): Promise<ChatCompletionMessageParam> {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_TOKEN });
	const history = mergedQuestionsAndUserAnswers(quizAttempt);
	const message = getFinalScoreMessage(history);

	const completion = await openai.chat.completions.create({
		model: getModel(env),
		messages: message,
		max_tokens: 50,
		response_format: {"type": "json_object"}
	});
	const finalScore = completion.choices[0].message;
	return finalScore;
}
