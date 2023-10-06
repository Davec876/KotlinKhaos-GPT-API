import { Bool, OpenAPIRoute, Path, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest } from 'itty-router';
import type { Env } from '../index';
import QuizAttempt from '../classes/QuizAttempt';
import Quiz from '../classes/Quiz';

const error404Schema = {
	schema: {
		status: 404,
		error: 'No quizAttempt by that Id found',
	},
	description: 'No quiz Attempt by that Id found',
};
const routeTag = ['QuizAttempt'];

// POST GPT create a new quiz attempt
export class CreateQuizAttemptStudentRoute extends OpenAPIRoute {
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
		return { quizAttemptId: quizAttempt.getId() };
	}
}

// GET quiz attempt score by quizId for a authenticated user
export class GetQuizAttemptStudentRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get quiz attempt score by quizId for current user',
		parameters: {
			quizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					attemptId: Str,
					userId: Str,
					score: Str,
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const user = env.REQ_USER;
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		const usersAttempt = quiz.getQuizAttemptScoreViewForStudent(user);
		return usersAttempt;
	}
}

// GET GPT quizAttempt by Id
export class GetQuizAttemptByIdStudentRoute extends OpenAPIRoute {
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
		const user = env.REQ_USER;
		const quizAttemptId = req.params.quizAttemptId;
		const quizAttempt = await QuizAttempt.getQuizAttempt(env, quizAttemptId);
		return { quizAttempt: quizAttempt.getQuizAttemptViewForStudent(user) };
	}
}

// POST GPT submit quiz attempt
export class SubmitQuizAttemptStudentRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Submit a quiz Attempt',
		parameters: {
			quizAttemptId: Path(Str),
		},
		requestBody: {
			answers: ['Your answer here', 'Your answer here #2', 'Your answer here #3'],
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
	async handle(req: IRequest, env: Env, ctx: ExecutionContext, context: any) {
		const quizAttemptId = req.params.quizAttemptId;
		// TODO: Add typeguard later
		const userAnswers: string[] = context.body.answers;

		const quizAttempt = await QuizAttempt.getQuizAttempt(env, quizAttemptId);
		const score = await quizAttempt.submitAttempt(env, userAnswers);
		return { score: score.score };
	}
}
