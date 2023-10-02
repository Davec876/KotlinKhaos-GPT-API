/**
 * Welcome to Cloudflare Workers!
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import {
	error,
	type IRequest, // creates error responses
	json, // creates JSON responses
	withParams, // middleware: puts params directly on the Request
} from 'itty-router';
import {
	ContinueConversationRoute,
	CreateConversationRoute,
	GetConversationRoute,
	GiveConversationFeedbackRoute,
} from './routes/PracticeConversationRoutes';

export interface Env {
	OPENAI_API_TOKEN: string;
	QUIZS: KVNamespace;
	QUIZ_CONVERSATIONS: KVNamespace;
	PRACTICE_CONVERSATIONS: KVNamespace;
}

// create a new Router
const router = OpenAPIRouter();

router
	// add some middleware upstream on all routes
	.all('*', withParams)

	// POST GPT create a new conversation utilizing a prompt
	.post('/android-problem/', CreateConversationRoute)

	// GET GPT conversation by Id
	.get('/android-problem/:practiceConversationId', GetConversationRoute)

	// POST GPT give feedback to a user's answer
	.post('/android-problem/:practiceConversationId', GiveConversationFeedbackRoute)

	// POST GPT continue a conversation
	.post('/android-problem/:practiceConversationId/continue', ContinueConversationRoute)

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
