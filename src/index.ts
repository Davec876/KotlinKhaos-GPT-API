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
import {
	CreateQuizInstructorRoute,
	NextQuizQuestionInstructorRoute,
	StartQuizInstructorRoute,
	GetQuizStudentRoute,
	EditQuizInstructorRoute,
	FinishQuizInstructorRoute,
	GetQuizInstructorRoute,
} from './routes/QuizRoutes';
import {
	CreateQuizAttemptStudentRoute,
	GetQuizAttemptByIdStudentRoute,
	GetQuizAttemptStudentRoute,
	SubmitQuizAttemptStudentRoute,
} from './routes/QuizAttemptRoutes';
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
	.post('/practice-quizs/', CreatePracticeQuizRoute)

	// GET GPT practiceQuiz by Id
	.get('/practice-quizs/:practiceQuizId', GetPracticeQuizRoute)

	// POST GPT give feedback to a user's response
	.post('/practice-quizs/:practiceQuizId', GivePracticeQuizFeedbackRoute)

	// POST GPT get the next practice quiz question
	.post('/practice-quizs/:practiceQuizId/continue', ContinuePracticeQuizRoute)

	// POST GPT create a new quiz
	.post('/instructor/quizs/', CreateQuizInstructorRoute)

	// POST GPT get the next quiz question
	.post('/instructor/quizs/:quizId/next-question', NextQuizQuestionInstructorRoute)

	// PUT GPT edit the quiz
	.put('/instructor/quizs/:quizId/edit', EditQuizInstructorRoute)

	// POST GPT start the quiz
	.post('/instructor/quizs/:quizId/start', StartQuizInstructorRoute)

	// POST GPT finish the quiz
	.post('/instructor/quizs/:quizId/finish', FinishQuizInstructorRoute)

	// GET GPT quiz by Id for instructor
	.get('/instructor/quizs/:quizId', GetQuizInstructorRoute)

	// GET GPT quiz by Id for student
	.get('/student/quizs/:quizId', GetQuizStudentRoute)

	// POST GPT create a new quiz attempt
	.post('/student/quizs/:quizId/attempt', CreateQuizAttemptStudentRoute)

	// GET quiz attempt score by quizId for a authenticated user
	.get('/student/quizs/:quizId/attempt', GetQuizAttemptStudentRoute)

	// GET GPT quizAttempt by Id for student
	.get('/student/quiz-attempts/:quizAttemptId', GetQuizAttemptByIdStudentRoute)

	// POST GPT submit quiz attempt
	.post('/student/quiz-attempts/:quizAttemptId/submit', SubmitQuizAttemptStudentRoute)

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
