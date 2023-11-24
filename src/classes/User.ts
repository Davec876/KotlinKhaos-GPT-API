import type Course from './Course';
import type { Env } from '../index';
import { getUserDataFromFirebaseDB, type FirebaseUserToken, getTokenForUserId } from '../services/firebase';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sha256HashStrings } from '../util/sha256Hash';

// Class for interacting with firebase user
export default class User {
	private readonly id: string;
	private readonly courseId: Course['id'];
	private readonly name: string;
	private readonly avatarHash: string | null;
	private readonly type: 'student' | 'instructor';

	private constructor(id: User['id'], courseId: User['courseId'], name: User['name'], avatarHash: User['avatarHash'], type: User['type']) {
		this.id = id;
		this.courseId = courseId;
		this.name = name;
		this.avatarHash = avatarHash;
		this.type = type;
	}

	public getId() {
		return this.id;
	}
	public getCourseId() {
		return this.courseId;
	}
	public getAvatarHash() {
		return this.avatarHash;
	}
	public getName() {
		return this.name;
	}
	public getType() {
		return this.type;
	}

	public static async getUserFromToken(env: Env, userToken: FirebaseUserToken, userBearerToken: string) {
		const userDataFirebaseDBPromise = getUserDataFromFirebaseDB(userToken.user_id, userBearerToken);
		const userAvatarHashPromise = User.getAvatarHash(env, userToken.user_id);
		const [userDataFirebaseDB, userAvatarHash] = await Promise.all([userDataFirebaseDBPromise, userAvatarHashPromise]);

		if (userDataFirebaseDB.type === 'NONE') {
			throw new Error('Failed parsing user type');
		}

		const userType = userDataFirebaseDB.type.toLowerCase() as User['type'];
		return new User(userToken.user_id, userDataFirebaseDB.courseId, userDataFirebaseDB.name, userAvatarHash, userType);
	}

	// Load user from firebase db
	public static async getUser(env: Env, userId: string) {
		const serviceToken = await getTokenForUserId(env, userId);
		const userDataFirebaseDBPromise = getUserDataFromFirebaseDB(userId, serviceToken);
		const userAvatarHashPromise = User.getAvatarHash(env, userId);
		const [userDataFirebaseDB, userAvatarHash] = await Promise.all([userDataFirebaseDBPromise, userAvatarHashPromise]);

		if (userDataFirebaseDB.type === 'NONE') {
			throw new Error('Failed parsing user type');
		}

		const userType = userDataFirebaseDB.type.toLowerCase() as User['type'];
		return new User(userId, userDataFirebaseDB.courseId, userDataFirebaseDB.name, userAvatarHash, userType);
	}

	public static async getAvatarHash(env: Env, userId: string) {
		return await env.USER_R2_AVATAR_HASHES.get(userId);
	}

	public static async getPresignedProfilePictureUploadUrl(env: Env, userId: string, sha256FileHash: string) {
		const sha256Hash = await sha256HashStrings(sha256FileHash, userId);
		const S3 = new S3Client({
			region: 'auto',
			endpoint: `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.ACCESS_KEY_ID,
				secretAccessKey: env.SECRET_ACCESS_KEY,
			},
		});

		const url = await getSignedUrl(
			S3,
			new PutObjectCommand({ Bucket: 'public', Key: `kotlin-khaos/profile/picture/${userId}/${sha256Hash}` }),
			{
				expiresIn: 3600,
			}
		);
		await env.USER_R2_AVATAR_HASHES.put(userId, sha256Hash);
		return url;
	}
}
