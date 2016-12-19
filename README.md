# sphincs.js

## Overview

The [SPHINCS](https://sphincs.cr.yp.to) post-quantum cryptographic signing scheme
compiled to pure JavaScript using [Emscripten](https://github.com/kripken/emscripten).
A simple wrapper is provided to make SPHINCS easy to use in Web applications.

N.B. Unless interoperability with other SPHINCS implementations is a hard requirement,
it is recommended to use [supersphincs](https://github.com/cyph/supersphincs)
instead of this.

## Example Usage

	const keyPair /*: {privateKey: Uint8Array; publicKey: Uint8Array} */ =
		sphincs.keyPair()
	;

	const message /*: Uint8Array */ =
		new Uint8Array([104, 101, 108, 108, 111, 0]) // "hello"
	;

	/* Combined signatures */

	const signed /*: Uint8Array */ =
		sphincs.sign(message, keyPair.privateKey)
	;

	const verified /*: Uint8Array */ =
		sphincs.open(signed, keyPair.publicKey) // same as message
	;

	/* Detached signatures */
	
	const signature /*: Uint8Array */ =
		sphincs.signDetached(message, keyPair.privateKey)
	;

	const isValid /*: boolean */ =
		sphincs.verifyDetached(signature, message, keyPair.publicKey) // true
	;
