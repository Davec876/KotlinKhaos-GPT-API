import { OpenAPIRoute, Path, Query, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest, error } from 'itty-router';
import type { Env } from '../index';
import User from '../classes/User';
import PracticeConversation from '../classes/PracticeConversation';

// POST GPT create a new conversation utilizing a prompt
export class CreateConversationRoute extends OpenAPIRoute {
	static schema = {
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
		// TODO: Hardcoding, eventually this will be inside of the fireBase JWT we are validating and decoding
		const user = await User.getUser(env, '1');
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
			'404': {
				schema: {
					status: 404,
					error: 'No practice conversation by that Id found',
				},
				description: 'No practice conversation by that Id found',
			},
		},
	};

	async handle(req: IRequest, env: Env) {
		const conversationId = req.params.practiceConversationId;
		const conversation = await PracticeConversation.getConversation(env, conversationId);

		if (!conversation) {
			return error(404, 'No practice conversation by that Id found');
		}

		return { message: conversation.getLatestContent() };
	}
}

// POST GPT give feedback to a user's answer
export class GiveConversationFeedbackRoute extends OpenAPIRoute {
	static schema = {
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
			'404': {
				schema: {
					status: 404,
					error: 'No practice conversation by that Id found',
				},
				description: 'No practice conversation by that Id found',
			},
		},
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async handle(req: IRequest, env: Env, context: any) {
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
			return error(404, 'No practice conversation by that Id found');
		}

		const message = await conversation.giveFeedback(env, userAnswer);

		return { message };
	}
}

// POST GPT continue a conversation
export class ContinueConversationRoute extends OpenAPIRoute {
	static schema = {
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
			'404': {
				schema: {
					status: 404,
					error: 'No practice conversation by that Id found',
				},
				description: 'No practice conversation by that Id found',
			},
		},
	};

	async handle(req: IRequest, env: Env) {
		const conversationId = req.params.practiceConversationId;

		const conversation = await PracticeConversation.getConversation(env, conversationId);

		if (!conversation) {
			return error(404, 'No conversation by that Id found');
		}

		const message = await conversation.continue(env);

		return { message };
	}
}
