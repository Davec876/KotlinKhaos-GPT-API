/**
 * Welcome to Cloudflare Workers!
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import {
	error,
	IRequest, // creates error responses
	json, // creates JSON responses
	Router, // the ~440 byte router itself
	withParams, // middleware: puts params directly on the Request
} from 'itty-router';
import Conversation from './classes/Conversation';

export interface Env {
	OPENAI_API_TOKEN: string;
	CONVERSATIONS: KVNamespace;
}

// create a new Router
const router = Router();

router
	// add some middleware upstream on all routes
	.all('*', withParams)

	// POST GPT create a new conversation utilizing a prompt
	.POST('/android-problem/', async (req, env: Env) => {
		const url = new URL(req.url);
		// TODO: Hardcoding, eventually this will be inside of the fireBase JWT we are validating and decoding
		const userId = '1';
		const prompt = url.searchParams.get('prompt');

		if (!prompt) {
			return error(400, 'No prompt specified!');
		}

		if (prompt.length > 20) {
			return error(400, 'Prompt is too long');
		}

		const conversation = await Conversation.newConversation(env, userId, prompt);

		return { answer: conversation.getLatestContent(), conversationId: conversation.getId() };
	})

	// GET GPT conversation by Id
	.get('/android-problem/:conversationId', async (req, env: Env) => {
		const conversation = await Conversation.getConversation(env, req.params.conversationId);

		if (!conversation) {
			return error(404, 'No conversation by that Id found');
		}

		return { feedback: conversation.getLatestContent() };
	})

	// POST GPT give feedback to a user's answer
	.POST('/android-problem/:conversationId', async (req, env: Env) => {
		const conversationId = req.params.conversationId;

		// TODO: Add typeguard later
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const body: any = await req.json().catch(() => error(400, 'Expect JSON body'));
		const userAnswer: string = body.answer;

		if (!userAnswer) {
			return error(400, 'No answer specified!');
		}

		if (userAnswer.length > 300) {
			return error(400, 'Please shorten your answer');
		}

		const conversation = await Conversation.getConversation(env, conversationId);

		if (!conversation) {
			return error(404, 'No conversation by that Id found');
		}

		const feedback = await conversation.giveFeedback(env, userAnswer);

		return { feedback };
	})

	// POST GPT continue a conversation
	.POST('/android-problem/:conversationId/continue', async (req, env: Env) => {
		const conversationId = req.params.conversationId;

		const conversation = await Conversation.getConversation(env, conversationId);

		if (!conversation) {
			return error(404, 'No conversation by that Id found');
		}

		const feedback = await conversation.continue(env);

		return { feedback };
	})

	// 404 for everything else
	.all('*', () => error(404));

// Example: Cloudflare Worker module syntax
export default {
	fetch: (req: IRequest, env: Env) =>
		router
			.handle(req, env)
			.then(json) // send as JSON
			.catch(error), // catch errors
};
