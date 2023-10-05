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
	ContinuePracticeQuizRoute,
	CreatePracticeQuizRoute,
	GetPracticeQuizRoute,
	GivePracticeQuizFeedbackRoute,
} from './routes/PracticeQuizRoutes';
import { CreateQuizRoute, GetQuizRoute, NextQuizQuestionRoute, StartQuizRoute } from './routes/QuizRoutes';
import { CreateQuizAttemptRoute, GetQuizAttemptRoute, SubmitQuizAttemptRoute } from './routes/QuizAttemptRoutes';
import { authRoute } from './routes/AuthRoute';
import type User from './classes/User';
export interface Env {
	DEBUG: string;
	GPT_4: string;
	OPENAI_API_TOKEN: string;
	FIREBASE_API_KEY: string;
	REQ_USER: User;
	QUIZS: KVNamespace;
	QUIZ_ATTEMPTS: KVNamespace;
	PRACTICE_QUIZ_CONVERSATIONS: KVNamespace;
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

	// POST GPT create a new practice quiz utilizing a prompt
	.post('/practice-quiz/', CreatePracticeQuizRoute)

	// GET GPT practiceQuiz by Id
	.get('/practice-quiz/:practiceQuizId', GetPracticeQuizRoute)

	// POST GPT give feedback to a user's response
	.post('/practice-quiz/:practiceQuizId', GivePracticeQuizFeedbackRoute)

	// POST GPT get the next practice quiz question
	.post('/practice-quiz/:practiceQuizId/continue', ContinuePracticeQuizRoute)

	// POST GPT create a new quiz
	.post('/quiz/', CreateQuizRoute)

	// GET GPT quiz by Id
	.get('/quiz/:quizId', GetQuizRoute)

	// POST GPT get the next quiz question
	.post('/quiz/:quizId/next-question', NextQuizQuestionRoute)

	// POST GPT start the quiz
	.post('/quiz/:quizId/start', StartQuizRoute)

	// POST GPT create a new quiz attempt
	.post('/quiz/:quizId/attempt', CreateQuizAttemptRoute)

	// GET GPT quizAttempt by Id
	.get('/quiz-attempts/:quizAttemptId', GetQuizAttemptRoute)

	// POST GPT submit quiz attempt
	.post('/quiz-attempts/:quizAttemptId/submit', SubmitQuizAttemptRoute)

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
