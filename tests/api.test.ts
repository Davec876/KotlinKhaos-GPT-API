import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { getDebugUserToken } from '../src/services/firebase';
import type { DebugEnv } from './config';

function generateDebugStudentEnv(): DebugEnv {
	return {
		DEBUG: process.env.DEBUG!,
		GPT_4: process.env.GPT_4!,
		OPENAI_API_TOKEN: process.env.OPENAI_API_TOKEN!,
		FIREBASE_API_KEY: process.env.FIREBASE_API_KEY!,
		ACCOUNT_ID: process.env.ACCOUNT_ID!,
		ACCESS_KEY_ID: process.env.ACCESS_KEY_ID!,
		SECRET_ACCESS_KEY: process.env.SECRET_ACCESS_KEY!,
	};
}
const host = 'https://kotlin-khaos-api.maximoguk.com';

describe('API Endpoint Testing', () => {
	it('Should be able to create practice quiz with specified prompt', async () => {
		const debugEnv = generateDebugStudentEnv();
		const debugToken = await getDebugUserToken(debugEnv);
		const response = await fetch(`${host}/practice-quizs?prompt=recyclerview'`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${debugToken}`,
			},
		});

		expect(response).toBeDefined();
		expect(response.status).toBe(200);
		const responseBody = await response.json();

		expect(responseBody).toHaveProperty('problem');
		expect(typeof responseBody.problem).toBe('string');

		expect(responseBody).toHaveProperty('practiceQuizId');
		expect(typeof responseBody.practiceQuizId).toBe('string');
	});

	it('Should get 400 error when no prompt specified for practice quiz', async () => {
		const debugEnv = generateDebugStudentEnv();
		const debugToken = await getDebugUserToken(debugEnv);
		const response = await fetch(`${host}/practice-quizs?prompt=`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${debugToken}`,
			},
		});
		expect(response).toBeDefined();
		expect(response.status).toBe(400);
	});

	it('No token supplied, should 401', async () => {
		const response = await fetch(`${host}/practice-quizs?prompt=recyclerview`, {
			method: 'GET',
		});
		expect(response).toBeDefined();
		expect(response.status).toBe(401);
	});
});
