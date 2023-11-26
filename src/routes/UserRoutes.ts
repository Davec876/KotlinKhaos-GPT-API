import { OpenAPIRoute, Query, Str } from '@cloudflare/itty-router-openapi';
import { error, type IRequest } from 'itty-router';
import type { Env } from '../index';
import User from '../classes/User';

const routeTag = ['User'];

// GET retrieve profile picture hash for user
export class GetUserProfilePictureHash extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: "Get user's profile picture hash",
		responses: {
			'200': {
				schema: {
					sha256: Str,
				},
				description: 'Successful response',
			},
		},
	};

	async handle(req: IRequest, env: Env) {
		const user = env.REQ_USER;
		const sha256 = user.getAvatarHash();
		return { sha256 };
	}
}

// GET retrieve a s3 presigned upload url to upload a profile picture for the user
export class GetUploadPresignedUrlForUserProfilePicture extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: "Get upload presigned url for uploading a user's profile picture",
		parameters: {
			sha256: Query(Str),
		},
		responses: {
			'200': {
				schema: {
					sha256: Str,
					uploadUrl: Str,
				},
				description: 'Successful response',
			},
		},
	};

	async handle(req: IRequest, env: Env) {
		const url = new URL(req.url);
		const user = env.REQ_USER;
		const sha256FileHash = url.searchParams.get('sha256');

		if (!sha256FileHash) {
			return error(400, 'No sha256 hash specified!');
		}

		return await User.getPresignedProfilePictureUploadUrl(env, user.getId(), sha256FileHash);
	}
}
