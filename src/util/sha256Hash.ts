export async function sha256HashStrings(str1: string, str2: string) {
	// Convert the string into a Uint8Array for the Web Crypto API
	const encoder = new TextEncoder();
	const data = encoder.encode(str1 + str2);

	// Compute the SHA-256 hash
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);

	// Convert the hash to a hexadecimal string
	return bufferToHex(hashBuffer);
}

function bufferToHex(buffer: ArrayBuffer) {
	const hashArray = Array.from(new Uint8Array(buffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	return hashHex;
}
