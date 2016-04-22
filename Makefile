all:
	rm -rf dist c_src libsodium openssl 2> /dev/null
	mkdir dist

	git clone -b stable https://github.com/jedisct1/libsodium.git
	cd libsodium ; emconfigure ./configure --enable-minimal --disable-shared

	git clone -b OpenSSL_1_0_2-stable https://github.com/openssl/openssl.git
	cd openssl ; emconfigure ./config

	wget http://hyperelliptic.org/ebats/supercop-20141124.tar.bz2
	bunzip2 < supercop-20141124.tar.bz2 | tar -xf -
	mv supercop-20141124 c_src
	rm supercop-20141124.tar.bz2

	sed -i 's|crypto_hash|crypto_hash_blake256_ref|g' c_src/crypto_hash/blake256/ref/hash.c
	sed -i 's|sigma|sigma_blake256_ref|g' c_src/crypto_hash/blake256/ref/hash.c
	sed -i 's|crypto_hash_blake256_ref.h|crypto_hash.h|g' c_src/crypto_hash/blake256/ref/hash.c
	sed -i 's|cst|cst_blake256_ref|g' c_src/crypto_hash/blake256/ref/hash.c

	sed -i 's|crypto_hash|crypto_hash_blake512_ref|g' c_src/crypto_hash/blake512/ref/hash.c
	sed -i 's|sigma|sigma_blake512_ref|g' c_src/crypto_hash/blake512/ref/hash.c
	sed -i 's|crypto_hash_blake512_ref.h|crypto_hash.h|g' c_src/crypto_hash/blake512/ref/hash.c
	sed -i 's|cst|cst_blake512_ref|g' c_src/crypto_hash/blake512/ref/hash.c

	sed -i 's|crypto_sign|crypto_sign_sphincs|g' c_src/crypto_sign/sphincs256/ref/sign.c
	sed -i 's|crypto_sign_sphincs.h|crypto_sign.h|g' c_src/crypto_sign/sphincs256/ref/sign.c

	git clone https://github.com/ahf/sphincs.git erlang-binding
	mv erlang-binding/c_src/crypto_core/templates c_src/
	mv erlang-binding/c_src/crypto_stream/chacha12/ref/api.c c_src/crypto_stream/chacha12/e/ref/stream.c
	rm -rf erlang-binding
	ls c_src/templates/* | xargs -I% sed -i 's|@@@IMPLEMENTATION@@@|ref|g' %

	emcc -O3 --llvm-lto 1 --memory-init-file 0 \
		-s TOTAL_MEMORY=35000000 -s RESERVED_FUNCTION_POINTERS=8 \
		-s NO_DYNAMIC_EXECUTION=1 -s RUNNING_JS_OPTS=1 -s ASSERTIONS=0 \
		-s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s ALIASING_FUNCTION_POINTERS=1 \
		-s FUNCTION_POINTER_ALIGNMENT=1 -s DISABLE_EXCEPTION_CATCHING=1 \
		-s NO_FILESYSTEM=1 \
		-Ilibsodium/src/libsodium/include/sodium \
		-Iopenssl/include \
		-Ic_src -Ic_src/include -Ic_src/templates -Ic_src/crypto_stream/chacha12/e/ref \
		libsodium/src/libsodium/randombytes/randombytes.c \
		libsodium/src/libsodium/sodium/core.c \
		libsodium/src/libsodium/sodium/runtime.c \
		libsodium/src/libsodium/sodium/utils.c \
		libsodium/src/libsodium/crypto_pwhash/argon2/argon2-core.c \
		libsodium/src/libsodium/crypto_pwhash/argon2/pwhash_argon2i.c \
		libsodium/src/libsodium/crypto_stream/chacha20/stream_chacha20.c \
		libsodium/src/libsodium/crypto_scalarmult/curve25519/scalarmult_curve25519.c \
		libsodium/src/libsodium/crypto_generichash/blake2/ref/blake2b-ref.c \
		libsodium/src/libsodium/crypto_generichash/blake2/ref/generichash_blake2b.c \
		libsodium/src/libsodium/crypto_onetimeauth/poly1305/onetimeauth_poly1305.c \
		c_src/crypto_hash/blake256/ref/hash.c \
		c_src/crypto_hash/blake512/ref/hash.c \
		c_src/crypto_stream/chacha12/e/ref/stream.c \
		c_src/crypto_stream/chacha12/e/ref/chacha.c \
		$$(find c_src/crypto_sign/sphincs256/ref -name '*.c' -type f) \
		sphincs.c \
		-s EXPORTED_FUNCTIONS="[ \
			'_sodium_init', \
			'_crypto_sign_sphincs_keypair', \
			'_crypto_sign_sphincs', \
			'_crypto_sign_sphincs_open', \
			'_sphincsjs_public_key_bytes', \
			'_sphincsjs_secret_key_bytes', \
			'_sphincsjs_signature_bytes' \
		]" \
		--pre-js pre.js --post-js post.js \
		-o dist/sphincs.js

	rm -rf c_src libsodium openssl

clean:
	rm -rf dist c_src libsodium openssl
