import { type IRequest, error } from 'itty-router';
import type { Env } from '../index';
import { getDebugUserToken, getDebugInstructorToken, verifyToken } from '../services/firebase';
import User from '../classes/User';

function getBearer(req: IRequest): null | string {
	const auth = req.headers.get('Authorization');
	if (!auth || auth.substring(0, 6) !== 'Bearer') {
		return null;
	}
	return auth.substring(6).trim();
}

export async function authRoute(req: IRequest, env: Env, ctx: ExecutionContext) {
	try {
		const bearer = getBearer(req);

		if (bearer && bearer !== 'debugStudent' && bearer !== 'debugInstructor') {
			const userToken = await verifyToken(bearer, ctx);
			env.REQ_USER = await User.getUserFromToken(env, userToken, bearer);
			return;
		}

		// env.DEBUG is expected to be a string
		if (bearer === 'debugStudent' || (bearer !== 'debugInstructor' && env.DEBUG === 'student')) {
			// Generate debug token if bearer is debug or no token supplied and in debug mode
			const debugStudentIdToken = await getDebugUserToken(env);
			return { debugStudentIdToken };
		}

		if (bearer === 'debugInstructor' || env.DEBUG === 'instructor') {
			const debugInstructorIdToken = await getDebugInstructorToken(env);
			return { debugInstructorIdToken };
		}

		return error(401, 'Authorization required');
	} catch (err) {
		if (err instanceof Error && err.message === 'Invalid Token or Protected Header formatting') {
			return error(401, 'Invalid Authorization token');
		}
		throw err;
	}
}
