#include "crypto_sign/sphincs256/ref/api.h"

int sphincsjs_public_key_bytes () {
	return CRYPTO_PUBLICKEYBYTES;
}

int sphincsjs_secret_key_bytes () {
	return CRYPTO_SECRETKEYBYTES;
}

int sphincsjs_signature_bytes () {
	return CRYPTO_BYTES;
}

int sphincsjs_keypair (unsigned char *pk, unsigned char *sk) {
	return crypto_sign_sphincs_keypair(pk, sk);
}

int sphincsjs_sign (
	unsigned char *sm,
	unsigned long long *smlen,
	const unsigned char *m,
	unsigned long long mlen,
	const unsigned char *sk
) {
	return crypto_sign_sphincs(
		sm,
		smlen,
		m,
		mlen,
		sk
	);
}

int sphincsjs_open (
	unsigned char *m,
	unsigned long long *mlen,
	const unsigned char *sm,
	unsigned long long smlen,
	const unsigned char *pk
) {
	return crypto_sign_sphincs_open(
		m,
		mlen,
		sm,
		smlen,
		pk
	);
}
