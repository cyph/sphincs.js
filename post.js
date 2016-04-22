;

function dataReturn (returnValue, result) {
	if (returnValue === 0) {
		return result;
	}
	else {
		throw new Error('SPHINCS error: ' + returnValue);
	}
}

function dataResult (buffer, bytes) {
	return new Uint8Array(
		new Uint8Array(Module.HEAPU8.buffer, buffer, bytes)
	);
}


Module._sodium_init();


var sphincs	= {
	publicKeyLength: Module._sphincsjs_public_key_bytes(),
	privateKeyLength: Module._sphincsjs_secret_key_bytes(),
	signatureLength: Module._sphincsjs_signature_bytes(),

	keyPair: function () {
		var publicKeyBuffer		= Module._malloc(sphincs.publicKeyLength);
		var privateKeyBuffer	= Module._malloc(sphincs.privateKeyLength);

		try {
			var returnValue	= Module._crypto_sign_sphincs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, sphincs.publicKeyLength),
				privateKey: dataResult(privateKeyBuffer, sphincs.privateKeyLength)
			});
		}
		finally {
			Module._free(publicKeyBuffer);
			Module._free(privateKeyBuffer);
		}
	},

	sign: function (message, privateKey) {
		var signedLength		= message.length + sphincs.signatureLength;

		var signedBuffer		= Module._malloc(signedLength);
		var messageBuffer		= Module._malloc(message.length);
		var privateKeyBuffer	= Module._malloc(privateKey.length);

		Module.writeArrayToMemory(message, messageBuffer);
		Module.writeArrayToMemory(privateKey, privateKeyBuffer);

		try {
			var returnValue	= Module._crypto_sign_sphincs(
				signedBuffer,
				0,
				messageBuffer,
				message.length,
				privateKeyBuffer
			);

			return dataReturn(returnValue, dataResult(signedBuffer, signedLength));
		}
		finally {
			Module._free(signedBuffer);
			Module._free(messageBuffer);
			Module._free(privateKeyBuffer);
		}
	},

	open: function (signed, publicKey) {
		var openedLength	= signed.length - sphincs.signatureLength;

		var openedBuffer	= Module._malloc(openedLength);
		var signedBuffer	= Module._malloc(signed.length);
		var publicKeyBuffer	= Module._malloc(publicKey.length);

		Module.writeArrayToMemory(signed, signedBuffer);
		Module.writeArrayToMemory(publicKey, publicKeyBuffer);

		try {
			var returnValue	= Module._crypto_sign_sphincs_open(
				openedBuffer,
				0,
				signedBuffer,
				signed.length,
				publicKeyBuffer
			);

			return dataReturn(returnValue, dataResult(openedBuffer, openedLength));
		}
		finally {
			Module._free(openedBuffer);
			Module._free(signedBuffer);
			Module._free(publicKeyBuffer);
		}
	}
};



return sphincs;

}());

self.sphincs	= sphincs;
