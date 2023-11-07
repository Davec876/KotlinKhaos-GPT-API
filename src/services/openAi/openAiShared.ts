import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { CourseInfoSnapshotForQuiz } from '../../classes/Course';
import type { Env } from '../../index';

export function getModel(env: Env) {
	return env.GPT_4 === 'true' ? 'gpt-4-1106-preview' : 'gpt-3.5-turbo-1106';
}

export function parseFinalScore(finalScore: string | null) {
	if (finalScore === null) {
		return null;
	}

	try {
		// TODO: Typeguard this / throw error if gpt returns wrong format
		return Number.parseInt((JSON.parse(finalScore) as { score: string }).score);
	} catch (err) {
		if (err instanceof SyntaxError) {
			console.error(err);
			return null;
		}
		throw err;
	}
}

export function getStartingMessage(savedUsersCourseInfo: CourseInfoSnapshotForQuiz, prompt: string): ChatCompletionMessageParam[] {
	return [
		{
			content: `For the following questions, reply with only one numbered interview-type knowledge question. This is for a ${savedUsersCourseInfo.educationLevel} student taking a course about the ${savedUsersCourseInfo.description}`,
			role: 'system',
		},
		{
			content: `With a particular focus on ${prompt}`,
			role: 'system',
		},
	];
}
