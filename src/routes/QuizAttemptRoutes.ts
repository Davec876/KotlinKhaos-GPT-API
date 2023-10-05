import { Bool, OpenAPIRoute, Path, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest, error } from 'itty-router';
import type { Env } from '../index';
import QuizAttempt from '../classes/QuizAttempt';

const error404Schema = {
	schema: {
		status: 404,
		error: 'No quizAttempt by that Id found',
	},
	description: 'No quiz Attempt by that Id found',
};
const routeTag = ['QuizAttempt'];

// POST GPT create a new quiz attempt
export class CreateQuizAttemptRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Create a quiz attempt',
		parameters: {
			quizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					quizAttemptId: Str,
				},
				description: 'Successfull response',
			},
		},
	};

	async handle(req: IRequest, env: Env) {
		const quizId = req.params.quizId;
		const user = env.REQ_USER;

		const quizAttempt = await QuizAttempt.newQuizAttempt(env, user, quizId);

		if (!quizAttempt) {
			return error(500, 'Something went wrong generating the quizAttempt');
		}

		return { quizAttemptId: quizAttempt.getId() };
	}
}

// GET GPT quizAttempt by Id
export class GetQuizAttemptRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get quiz attempt by Id',
		parameters: {
			quizAttemptId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					quizAttempt: {
						questions: [Str],
						submitted: Bool,
					},
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const quizAttemptId = req.params.quizAttemptId;
		const quizAttempt = await QuizAttempt.getQuizAttempt(env, quizAttemptId);
		if (!quizAttempt) {
			return error(404, 'No quizAttempt by that Id found');
		}
		return { quizAttempt: quizAttempt.getQuizAttemptViewForStudent() };
	}
}

// POST GPT submit quiz attempt
export class SubmitQuizAttemptRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Submit a quiz Attempt',
		parameters: {
			quizAttemptId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					score: Str,
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const quizAttemptId = req.params.quizAttemptId;
		const quizAttempt = await QuizAttempt.getQuizAttempt(env, quizAttemptId);
		if (!quizAttempt) {
			return error(404, 'No quizAttempt by that Id found');
		}

		// TODO: Set userAnswers
		const score = await quizAttempt.submitAttempt(env);
		if (!score) {
			return error(500, 'Error retrieving score');
		}

		return { score: score.score };
	}
}
