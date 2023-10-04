import { OpenAPIRoute, Path, Query, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest, error } from 'itty-router';
import type { Env } from '../index';
import PracticeConversation from '../classes/PracticeConversation';

const error404Schema = {
	schema: {
		status: 404,
		error: 'No practiceConversation by that Id found',
	},
	description: 'No practice conversation by that Id found',
};
const routeTag = ['PracticeConversation'];

// POST GPT create a new conversation utilizing a prompt
export class CreateConversationRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Create a new conversation utilizing a prompt',
		parameters: {
			prompt: Query(Str),
		},
		responses: {
			'200': {
				schema: {
					problem: Str,
					practiceConversationId: Str,
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

		if (prompt.length > 20) {
			return error(400, 'Prompt is too long');
		}

		const conversation = await PracticeConversation.newConversation(env, user, prompt);

		return { problem: conversation.getLatestContent(), practiceConversationId: conversation.getId() };
	}
}

// GET GPT conversation by Id
export class GetConversationRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get practiceConversation by Id',
		parameters: {
			practiceConversationId: Path(Str),
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
		const conversationId = req.params.practiceConversationId;
		const conversation = await PracticeConversation.getConversation(env, conversationId);

		if (!conversation) {
			return error(404, 'No practiceConversation by that Id found');
		}

		return { message: conversation.getLatestContent() };
	}
}

// POST GPT give feedback to a user's response
export class GiveConversationFeedbackRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: "Give feedback to a user's response",
		parameters: {
			practiceConversationId: Path(Str),
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
		const conversationId = req.params.practiceConversationId;

		// TODO: Add typeguard later
		const userAnswer: string = context.body.answer;

		if (!userAnswer) {
			return error(400, 'No answer specified!');
		}

		if (userAnswer.length > 300) {
			return error(400, 'Please shorten your answer');
		}

		const conversation = await PracticeConversation.getConversation(env, conversationId);

		if (!conversation) {
			return error(404, 'No practiceConversation by that Id found');
		}

		const message = await conversation.giveFeedback(env, userAnswer);

		return { message };
	}
}

// POST GPT continue a conversation
export class ContinueConversationRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Continue a conversation',
		parameters: {
			practiceConversationId: Path(Str),
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
		const conversationId = req.params.practiceConversationId;

		const conversation = await PracticeConversation.getConversation(env, conversationId);

		if (!conversation) {
			return error(404, 'No practiceConversation by that Id found');
		}

		const message = await conversation.continue(env);

		return { message };
	}
}
