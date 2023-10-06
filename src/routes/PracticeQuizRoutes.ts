import { OpenAPIRoute, Path, Query, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest, error } from 'itty-router';
import type { Env } from '../index';
import PracticeQuiz from '../classes/PracticeQuiz';

const error404Schema = {
	schema: {
		status: 404,
		error: 'No practiceQuiz by that Id found',
	},
	description: 'No practice quiz by that Id found',
};
const routeTag = ['PracticeQuiz'];

// POST GPT create a new practice quiz utilizing a prompt
export class CreatePracticeQuizRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Create a new practice quiz utilizing a prompt',
		parameters: {
			prompt: Query(Str),
		},
		responses: {
			'200': {
				schema: {
					problem: Str,
					practiceQuizId: Str,
				},
				description: 'Successfull response',
			},
			'400': {
				schema: {
					status: 400,
					error: 'No prompt specified!',
				},
				description: 'No prompt specified',
			},
		},
	};

	async handle(req: IRequest, env: Env) {
		const url = new URL(req.url);
		const user = env.REQ_USER;
		const prompt = url.searchParams.get('prompt');

		if (!prompt) {
			return error(400, 'No prompt specified!');
		}

		const practiceQuiz = await PracticeQuiz.newQuiz(env, user, prompt);
		return { problem: practiceQuiz.getLatestContent(), practiceQuizId: practiceQuiz.getId() };
	}
}

// GET GPT practiceQuiz by Id
export class GetPracticeQuizRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get practice quiz by Id',
		parameters: {
			practiceQuizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					message: Str,
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const user = env.REQ_USER;
		const practiceQuizId = req.params.practiceQuizId;
		const practiceQuiz = await PracticeQuiz.getQuiz(env, practiceQuizId);
		return { message: practiceQuiz.getPracticeViewForStudent(user) };
	}
}

// POST GPT give feedback to a user's response
export class GivePracticeQuizFeedbackRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: "Give feedback to a user's response",
		parameters: {
			practiceQuizId: Path(Str),
		},
		requestBody: {
			answer: 'Your answer to the problem that was generated for you',
		},
		responses: {
			'200': {
				schema: {
					message: Str,
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
	async handle(req: IRequest, env: Env, ctx: ExecutionContext, context: any) {
		const user = env.REQ_USER;
		const practiceQuizId = req.params.practiceQuizId;

		// TODO: Add typeguard later
		const userAnswer: string = context.body.answer;

		const practiceQuiz = await PracticeQuiz.getQuiz(env, practiceQuizId);
		const message = await practiceQuiz.giveFeedback(env, user, userAnswer);

		return { message };
	}
}

// POST GPT get the next practice quiz question
export class ContinuePracticeQuizRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get the next practice quiz question',
		parameters: {
			practiceQuizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					message: Str,
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const user = env.REQ_USER;
		const practiceQuizId = req.params.practiceQuizId;

		const practiceQuiz = await PracticeQuiz.getQuiz(env, practiceQuizId);
		const message = await practiceQuiz.continue(env, user);
		return { message };
	}
}
