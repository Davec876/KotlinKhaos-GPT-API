import type Course from './Course';
import type { Env } from '../index';
import { getUserDataFromFirebaseDB, type FirebaseUserToken } from '../services/firebase';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// Class for interacting with firebase user
export default class User {
	private readonly id: string;
	private readonly courseId: Course['id'];
	private readonly name: string;
	private readonly type: 'student' | 'instructor';

	private constructor(id: User['id'], courseId: User['courseId'], name: User['name'], type: User['type']) {
		this.id = id;
		this.courseId = courseId;
		this.name = name;
		this.type = type;
	}

	public getId() {
		return this.id;
	}
	public getCourseId() {
		return this.courseId;
	}
	public getProfilePicture(env: Env) {
		return this.getPresignedProfilePictureUrl(env);
	}
	private getName() {
		return this.name;
	}
	public getType() {
		return this.type;
	}

	public static async getUserFromToken(userToken: FirebaseUserToken, userBearerToken: string) {
		const userDataFirebaseDB = await getUserDataFromFirebaseDB(userToken.user_id, userBearerToken);

		if (userDataFirebaseDB.type === 'NONE') {
			throw new Error('Failed parsing user type');
		}

		const userType = userDataFirebaseDB.type.toLowerCase() as User['type'];
		return new User(userToken.user_id, userDataFirebaseDB.courseId, userDataFirebaseDB.name, userType);
	}

	// Load user from firebase db
	public static async getUser(env: Env, userId: string) {
		// TODO: Fetch user from firebase db through service module
		// const res = await env.CONVERSATIONS.get(conversationId);
		// if (!res) {
		// 	return null;
		// }
		// const parsedRes = JSON.parse(res);
		// return new User(parsedRes.id, parsedRes.courseId, parsedRes.name);
		// TODO: Hardcode fake values for now
		const fakeUserRes = {
			courseId: '1',
			name: 'Test User',
			type: 'student' as const,
		};

		return new User(userId, fakeUserRes.courseId, fakeUserRes.name, fakeUserRes.type);
	}

	private async getPresignedProfilePictureUrl(env: Env) {
		const S3 = new S3Client({
			region: 'auto',
			endpoint: `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.ACCESS_KEY_ID,
				secretAccessKey: env.SECRET_ACCESS_KEY,
			},
		});

		const url = await getSignedUrl(S3, new GetObjectCommand({ Bucket: 'public', Key: `kotlin-khaos/profile/picture/${this.getId()}` }), {
			expiresIn: 3600,
		});
		return url;
	}

	public static async getPresignedProfilePictureUploadUrl(env: Env, userId: string) {
		const S3 = new S3Client({
			region: 'auto',
			endpoint: `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.ACCESS_KEY_ID,
				secretAccessKey: env.SECRET_ACCESS_KEY,
			},
		});

		const url = await getSignedUrl(S3, new PutObjectCommand({ Bucket: 'public', Key: `kotlin-khaos/profile/picture/${userId}` }), {
			expiresIn: 3600,
		});
		return url;
	}
}
