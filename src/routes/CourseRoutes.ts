import { Bool, Num, OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest } from 'itty-router';
import type { Env } from '../index';
import Course from '../classes/Course';

const error404Schema = {
	schema: {
		status: 404,
		error: 'No quizs found for that course',
	},
	description: 'No quizs found for that course',
};
const routeTag = ['Course'];

// GET all course quizs details for instructor
export class GetCourseQuizsInstructorRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get all course quizs details for instructor',
		responses: {
			'200': {
				schema: {
					quizs: [
						{
							id: Str,
							name: Str,
							started: Bool,
							finished: Bool,
							questions: [
								{
									content: Str,
									role: Str,
								},
							],
							startedAttemptsUserIds: [Str],
							finishedUserAttempts: [
								{
									attemptId: Str,
									studentId: Str,
									score: Num,
									submittedOn: Date,
								},
							],
						},
					],
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const instructor = env.REQ_USER;
		const course = await Course.getCourse(env, instructor.getCourseId());
		return { quizs: await course.getAllQuizsForCourseInstructorView(env, instructor) };
	}
}

// GET all course quizs for student
export class GetCourseQuizsStudentRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get all course quizs for student',
		responses: {
			'200': {
				schema: {
					quizs: [
						{
							id: Str,
							name: Str,
							started: Bool,
							finished: Bool,
							userAttempt: {
								attemptId: Str,
								studentId: Str,
								score: Num,
								submittedOn: Date,
							},
						},
					],
				},
				description: 'Successfull response',
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const student = env.REQ_USER;
		const course = await Course.getCourse(env, student.getCourseId());
		return { quizs: await course.getAllQuizsForCourseStudentView(env, student) };
	}
}

// GET weekly course quizs summary for student
export class GetCourseWeeklyQuizsSummaryForStudentRoute extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: 'Get weekly course quizs summary for student',
		responses: {
			'200': {
				schema: {
					'weekly-summary': {
						sat: {
							averageScore: Num,
							quizs: [
								{
									quizAttemptId: Str,
									score: Num,
								},
							],
						},
					},
				},
				description:
					"Successfull weekly course summary response. Where each day's summary is outputted under the key 'sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'",
			},
			'404': error404Schema,
		},
	};

	async handle(req: IRequest, env: Env) {
		const student = env.REQ_USER;
		const course = await Course.getCourse(env, student.getCourseId());
		return { 'weekly-summary': await course.getWeeklyQuizsSummaryForCourseStudentView(env, student) };
	}
}
