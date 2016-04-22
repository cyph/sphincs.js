all:
	rm -rf dist c_src libsodium openssl 2> /dev/null
	mkdir dist

	git clone -b stable https://github.com/jedisct1/libsodium.git
	cd libsodium ; emconfigure ./configure --enable-minimal --disable-shared

	git clone -b OpenSSL_1_0_2-stable https://github.com/openssl/openssl.git
	cd openssl ; emconfigure ./config

	git clone https://github.com/ahf/sphincs.git erlang-binding
	mv erlang-binding/c_src ./
	rm -rf erlang-binding c_src/erlang_nif

	ls c_src/crypto_core/templates/* | xargs -I% sed -i 's|@@@IMPLEMENTATION@@@|ref|g' %

	emcc -O3 --llvm-lto 1 --memory-init-file 0 \
		-s TOTAL_MEMORY=35000000 -s RESERVED_FUNCTION_POINTERS=8 \
		-s NO_DYNAMIC_EXECUTION=1 -s RUNNING_JS_OPTS=1 -s ASSERTIONS=0 \
		-s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s ALIASING_FUNCTION_POINTERS=1 \
		-s FUNCTION_POINTER_ALIGNMENT=1 -s DISABLE_EXCEPTION_CATCHING=1 \
		-s NO_FILESYSTEM=1 \
		-Ilibsodium/src/libsodium/include -Ilibsodium/src/libsodium/include/sodium \
		-Iopenssl/include \
		-Ic_src -Ic_src/crypto_core/include -Ic_src/crypto_core/templates \
		$$(find libsodium/src/libsodium -name '*.c' -type f | sort | tr '\n' ' ') \
		$$(find c_src/crypto_hash/blake256/ref -name '*.c' -type f | sort | tr '\n' ' ') \
		$$(find c_src/crypto_hash/blake512/ref -name '*.c' -type f | sort | tr '\n' ' ') \
		$$(find c_src/crypto_stream/chacha12/ref -name '*.c' -type f | sort | tr '\n' ' ') \
		$$(find c_src/crypto_sign/sphincs256/ref -name '*.c' -type f | sort | tr '\n' ' ') \
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
