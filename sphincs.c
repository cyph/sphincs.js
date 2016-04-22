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
