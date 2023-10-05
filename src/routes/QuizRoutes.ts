import { Bool, OpenAPIRoute, Path, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest } from 'itty-router';
import type { Env } from '../index';
import Quiz, { type QuizOptions } from '../classes/Quiz';

const error404Schema = {
	schema: {
		status: 404,
		error: 'No quiz by that Id found',
	},
	description: 'No quiz by that Id found',
};
const routeTag = ['Quiz'];

// POST GPT create a new quiz
export class CreateQuizRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Create a quiz',
		requestBody: {
			options: {
				name: 'Your quiz name',
				questionLimit: 3,
				prompt: 'Random prompt',
			},
		},
		responses: {
			'200': {
				schema: {
					quizId: Str,
				},
				description: 'Successfull response',
			},
		},
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
	async handle(req: IRequest, env: Env, ctx: ExecutionContext, context: any) {
		const author = env.REQ_USER;

		// TODO: Add typeguard later
		const quizOptions: QuizOptions = context.body.options;
		const quiz = await Quiz.newQuiz(env, author, quizOptions);
		return { quizId: quiz.getId() };
	}
}

// GET GPT quiz by Id
export class GetQuizRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get quiz by Id',
		parameters: {
			quizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					quiz: {
						name: Str,
						started: Bool,
						finished: Bool,
					},
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const student = env.REQ_USER;
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		return { quiz: quiz.getQuizViewForStudent(student) };
	}
}

// POST GPT get the next quiz question
export class NextQuizQuestionRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get the next quiz question',
		parameters: {
			quizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					question: Str,
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		const question = await quiz.nextQuestion(env);
		return { question };
	}
}

// POST GPT start the quiz
export class StartQuizRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Start a quiz',
		parameters: {
			quizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					success: Bool,
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		const success = await quiz.startQuiz(env);
		return { success };
	}
}
