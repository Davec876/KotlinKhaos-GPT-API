import { type IRequest, error } from 'itty-router';
import type { ExecutionContext } from '@cloudflare/workers-types';
import type { Env } from '../index';
import { getDebugToken, verifyToken } from '../services/firebase';
import User from '../classes/User';

function getBearer(req: IRequest): null | string {
	const auth = req.headers.get('Authorization');
	if (!auth || auth.substring(0, 6) !== 'Bearer') {
		return null;
	}
	return auth.substring(6).trim();
}

export async function authRoute(req: IRequest, env: Env, ctx: ExecutionContext) {
	const bearer = getBearer(req);

	if (bearer) {
		const userToken = await verifyToken(bearer, ctx);
		env.REQ_USER = await User.getUserFromToken(env, userToken);
		return;
	}

	// env.DEBUG is expected to be a string
	if (env.DEBUG === 'true') {
		// Generate debug token if no token supplied and in debug mode
		const debugToken = await getDebugToken(env);
		return { debugIdToken: debugToken };
	}

	return error(403, 'Authorization required');
}
