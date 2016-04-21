all:
	rm -rf dist sphincs 2> /dev/null
	mkdir dist

	wget http://hyperelliptic.org/ebats/supercop-20141124.tar.bz2
	bunzip2 < supercop-20141124.tar.bz2 | tar -xf -
	mv supercop-20141124/crypto_sign/sphincs256/ref sphincs
	rm -rf supercop*

	emcc -O3 --llvm-opts 0 --memory-init-file 0 \
		-INTRUEncrypt/include -INTRUEncrypt/src \
		NTRUEncrypt/src/*.c sphincs.c \
		-s EXPORTED_FUNCTIONS="['_keypair', '_encrypt', '_decrypt', '_init', '_publen', '_privlen', '_enclen', '_declen']" \
		--pre-js pre.js --post-js post.js \
		-o dist/sphincs.js

	rm -rf sphincs

clean:
	rm -rf dist sphincs
