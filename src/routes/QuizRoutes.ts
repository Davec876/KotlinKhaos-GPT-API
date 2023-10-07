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
export class CreateQuizInstructorRoute extends OpenAPIRoute {
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

// POST GPT get the next quiz question
export class NextQuizQuestionInstructorRoute extends OpenAPIRoute {
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
		const user = env.REQ_USER;
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		const question = await quiz.nextQuestion(env, user);
		return { question };
	}
}

// PUT GPT edit the quiz
export class EditQuizInstructorRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Edit a quiz',
		parameters: {
			quizId: Path(Str),
		},
		requestBody: {
			questions: ['Your edited questions here'],
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
	async handle(req: IRequest, env: Env, ctx: ExecutionContext, context: any) {
		const user = env.REQ_USER;
		const quizId = req.params.quizId;
		// TODO: Add typeguard later
		const questions: string[] = context.body.questions;

		const quiz = await Quiz.getQuiz(env, quizId);
		await quiz.editQuizQuestions(env, user, questions);
		return { success: true };
	}
}

// POST GPT start the quiz
export class StartQuizInstructorRoute extends OpenAPIRoute {
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
		const user = env.REQ_USER;
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		const success = await quiz.startQuiz(env, user);
		return { success };
	}
}

// POST GPT finish the quiz
export class FinishQuizInstructorRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Finish a quiz',
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
		const user = env.REQ_USER;
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		await quiz.finishQuiz(env, user);
		return { success: true };
	}
}

// GET GPT quiz by id for instructor
export class GetQuizInstructorRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get quiz details by id for instructor',
		parameters: {
			quizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					quiz: {
						id: Str,
						name: Str,
						started: Bool,
						finished: Bool,
						startedAttemptsUserIds: [Str],
						finishedUserAttempts: [
							{
								attemptId: Str,
								studentId: Str,
								score: Str,
								submittedOn: Date,
							},
						],
					},
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const instructor = env.REQ_USER;
		const quizId = req.params.quizId;
		const quiz = await Quiz.getQuiz(env, quizId);
		return { quiz: quiz.getQuizViewForInstructor(instructor) };
	}
}

// GET GPT quiz by id for student
export class GetQuizStudentRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get quiz by id for student',
		parameters: {
			quizId: Path(Str),
		},
		responses: {
			'200': {
				schema: {
					quiz: {
						id: Str,
						name: Str,
						started: Bool,
						finished: Bool,
						userAttempt: {
							attemptId: Str,
							studentId: Str,
							score: Str,
							submittedOn: Date,
						},
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
