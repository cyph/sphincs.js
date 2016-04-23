# sphincs.js

## Overview

The [SPHINCS](https://sphincs.cr.yp.to) post-quantum cryptographic signing scheme
compiled to pure JavaScript using [Emscripten](https://github.com/kripken/emscripten).
A simple wrapper is provided to make SPHINCS easy to use in Web applications.

## Example Usage

	var keyPair		= sphincs.keyPair();
	var message		= new Uint8Array([104, 101, 108, 108, 111, 0]); // "hello"

	var signed		= sphincs.sign(message, keyPair.privateKey);
	var verified	= sphincs.open(signed, keyPair.publicKey); // same as message
	
	var signature	= sphincs.signDetached(message, keyPair.privateKey);
	var isValid		= sphincs.verifyDetached(signature, message, keyPair.publicKey); // true
