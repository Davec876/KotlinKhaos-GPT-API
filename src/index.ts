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
	withParams,
	createCors, // middleware: puts params directly on the Request
} from 'itty-router';
import {
	ContinueConversationRoute,
	CreateConversationRoute,
	GetConversationRoute,
	GiveConversationFeedbackRoute,
} from './routes/PracticeConversationRoutes';
import { authRoute } from './routes/AuthRoute';
import type User from './classes/User';
export interface Env {
	DEBUG: string;
	GPT_4: string;
	OPENAI_API_TOKEN: string;
	FIREBASE_API_KEY: string;
	REQ_USER: User;
	QUIZS: KVNamespace;
	QUIZ_CONVERSATIONS: KVNamespace;
	PRACTICE_CONVERSATIONS: KVNamespace;
}

const { preflight, corsify } = createCors();

// create a new Router
const router = OpenAPIRouter({
	schema: {
		info: {
			title: 'Kotlin Khaos GPT',
			version: '1.0.0',
		},
		security: [
			{
				BearerAuth: [],
			},
		],
	},
});

// OpenAPI require JWT on all routes
router.registry.registerComponent('securitySchemes', 'BearerAuth', {
	type: 'http',
	scheme: 'bearer',
});

// Redirect root request to the /docs page
router.original.get('/', (req: IRequest) => Response.redirect(`${req.url}docs`, 301));

router
	.all('*', preflight)

	// add some middleware upstream on all routes
	.all('*', withParams)

	// auth middleware
	.all('*', authRoute)

	// POST GPT create a new conversation utilizing a prompt
	.post('/practice-problem/', CreateConversationRoute)

	// GET GPT conversation by Id
	.get('/practice-problem/:practiceConversationId', GetConversationRoute)

	// POST GPT give feedback to a user's answer
	.post('/practice-problem/:practiceConversationId', GiveConversationFeedbackRoute)

	// POST GPT continue a conversation
	.post('/practice-problem/:practiceConversationId/continue', ContinueConversationRoute)

	// 404 for everything else
	.all('*', () => error(404));

// Example: Cloudflare Worker module syntax
export default {
	fetch: (req: IRequest, env: Env, ctx: ExecutionContext) =>
		router
			.handle(req, env, ctx)
			.then(json) // send as JSON
			.then(corsify)
			.catch(error), // catch errors
};
