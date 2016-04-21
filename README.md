# sphincs.js

## Overview

The [SPHINCS](https://sphincs.cr.yp.to) post-quantum cryptographic signing primitive
compiled to pure JavaScript using [Emscripten](https://github.com/kripken/emscripten).
A simple wrapper is provided to make SPHINCS easy to use in Web applications.

## Example Usage

	var plaintext	= new Uint8Array([104, 101, 108, 108, 111]); // ("hello")

	var keyPair		= sphincs.keyPair();
	var signed		= sphincs.sign(plaintext, keyPair.privateKey);
	var verified	= sphincs.open(signed, keyPair.publicKey); // same as plaintext
