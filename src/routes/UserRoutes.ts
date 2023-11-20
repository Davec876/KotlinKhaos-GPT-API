import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi';
import { type IRequest } from 'itty-router';
import type { Env } from '../index';
import User from '../classes/User';

const routeTag = ['User'];

// GET retrieve a s3 presigned upload url to upload a profile picture for the user
export class GetUploadPresignedUrlForUserProfilePicture extends OpenAPIRoute {
	static schema = {
		tags: routeTag,
		summary: "Get upload presigned url for uploading a user's profile picture",
		responses: {
			'200': {
				schema: {
					uploadUrl: Str,
				},
				description: 'Successfull response',
			},
		},
	};

	async handle(req: IRequest, env: Env) {
		const user = env.REQ_USER;
		const uploadUrl = await User.getPresignedProfilePictureUploadUrl(env, user.getId());
		return { uploadUrl };
	}
}
