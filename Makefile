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
	cat c_src/crypto_sign/sphincs256/ref/sign.c | \
		perl -pe 's/(crypto_sign_sphincs.*unsigned long )long ([a-z])/\1\2/g' > sphincs_sign.c.new
	mv sphincs_sign.c.new c_src/crypto_sign/sphincs256/ref/sign.c

	git clone https://github.com/ahf/sphincs.git erlang-binding
	mv erlang-binding/c_src/crypto_core/templates c_src/
	mv erlang-binding/c_src/crypto_stream/chacha12/ref/api.c c_src/crypto_stream/chacha12/e/ref/stream.c
	rm -rf erlang-binding
	ls c_src/templates/* | xargs -I% sed -i 's|@@@IMPLEMENTATION@@@|ref|g' %

	bash -c ' \
		args="$$(echo " \
			--memory-init-file 0 \
			-s TOTAL_MEMORY=104900000 -s TOTAL_STACK=52443072 \
			-s NO_DYNAMIC_EXECUTION=1 -s RUNNING_JS_OPTS=1 -s ASSERTIONS=0 \
			-s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s ALIASING_FUNCTION_POINTERS=1 \
			-s FUNCTION_POINTER_ALIGNMENT=1 -s DISABLE_EXCEPTION_CATCHING=1 \
			 -s RESERVED_FUNCTION_POINTERS=8 -s NO_FILESYSTEM=1 \
			-Ilibsodium/src/libsodium/include/sodium \
			-Iopenssl/include \
			-Ic_src -Ic_src/include -Ic_src/templates -Ic_src/crypto_stream/chacha12/e/ref \
			libsodium/src/libsodium/randombytes/randombytes.c \
			c_src/crypto_hash/blake256/ref/hash.c \
			c_src/crypto_hash/blake512/ref/hash.c \
			c_src/crypto_stream/chacha12/e/ref/stream.c \
			c_src/crypto_stream/chacha12/e/ref/chacha.c \
			$$(find c_src/crypto_sign/sphincs256/ref -name '"'"'*.c'"'"' -type f) \
			sphincs.c \
			-s EXPORTED_FUNCTIONS=\"[ \
				'"'"'_randombytes_stir'"'"', \
				'"'"'_crypto_sign_sphincs_keypair'"'"', \
				'"'"'_crypto_sign_sphincs'"'"', \
				'"'"'_crypto_sign_sphincs_open'"'"', \
				'"'"'_sphincsjs_public_key_bytes'"'"', \
				'"'"'_sphincsjs_secret_key_bytes'"'"', \
				'"'"'_sphincsjs_signature_bytes'"'"' \
			]\" \
			--pre-js pre.js --post-js post.js \
		" | perl -pe "s/\s+/ /g" | perl -pe "s/\[ /\[/g" | perl -pe "s/ \]/\]/g")"; \
		\
		bash -c "emcc -O3 $$args -o dist/sphincs.js"; \
		bash -c "emcc -O0 -g4 $$args -o dist/sphincs.debug.js"; \
	'

	rm -rf c_src libsodium openssl

clean:
	rm -rf dist c_src libsodium openssl
