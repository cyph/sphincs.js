all:
	rm -rf dist c_src libsodium openssl 2> /dev/null
	mkdir dist

	git clone -b stable https://github.com/jedisct1/libsodium.git
	cd libsodium ; ./configure

	git clone -b OpenSSL_1_0_2-stable https://github.com/openssl/openssl.git
	cd openssl ; ./config

	git clone https://github.com/ahf/sphincs.git erlang-binding
	mv erlang-binding/c_src ./
	rm -rf erlang-binding c_src/erlang_nif

	ls c_src/crypto_core/templates/* | xargs -I% sed -i 's|@@@IMPLEMENTATION@@@|ref|g' %

	emcc -Wall -O3 --llvm-opts 0 --memory-init-file 0 \
		-Ilibsodium/src/libsodium/include -Ilibsodium/src/libsodium/include/sodium \
		-Iopenssl/include \
		-Ic_src -Ic_src/crypto_core/include -Ic_src/crypto_core/templates \
		libsodium/src/libsodium/randombytes/randombytes.c \
		$$(find c_src/crypto_hash/blake256/ref -name '*.c' -type f | sort | tr '\n' ' ') \
		$$(find c_src/crypto_hash/blake512/ref -name '*.c' -type f | sort | tr '\n' ' ') \
		$$(find c_src/crypto_stream/chacha12/ref -name '*.c' -type f | sort | tr '\n' ' ') \
		$$(find c_src/crypto_sign/sphincs256/ref -name '*.c' -type f | sort | tr '\n' ' ') \
		sphincs.c \
		-s EXPORTED_FUNCTIONS="[ \
			'_sphincsjs_keypair', \
			'_sphincsjs_sign', \
			'_sphincsjs_open', \
			'_sphincsjs_public_key_bytes', \
			'_sphincsjs_secret_key_bytes', \
			'_sphincsjs_signature_bytes', \
			'_randombytes_stir' \
		]" \
		--pre-js pre.js --post-js post.js \
		-o dist/sphincs.js

	rm -rf c_src libsodium openssl

clean:
	rm -rf dist c_src libsodium openssl
