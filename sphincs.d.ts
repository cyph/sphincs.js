export interface ISPHINCS {
	/** Signature length. */
	bytes: number;

	/** Private key length. */
	privateKeyBytes: number;

	/** Public key length. */
	publicKeyBytes: number;

	/** Generates key pair. */
	keyPair () : {privateKey: Uint8Array; publicKey: Uint8Array};

	/** Verifies signed message against publicKey and returns it. */
	open (signed: Uint8Array, publicKey: Uint8Array) : Uint8Array;

	/** Signs message with privateKey and returns combined message. */
	sign (message: Uint8Array, privateKey: Uint8Array) : Uint8Array;

	/** Signs message with privateKey and returns signature. */
	signDetached (message: Uint8Array, privateKey: Uint8Array) : Uint8Array;

	/** Verifies detached signature against publicKey. */
	verifyDetached (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array) : boolean;
};

export const sphincs: ISPHINCS;
