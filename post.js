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

function dataFree (buffer) {
	try {
		Module._free(buffer);
	}
	catch (_) {}
}


Module._randombytes_stir();


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
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	sign: function (message, privateKey) {
		var signedLength		= message.length + sphincs.signatureLength;

		var signedBuffer		= Module._malloc(signedLength);
		var messageBuffer		= Module._malloc(message.length);
		var privateKeyBuffer	= Module._malloc(sphincs.privateKeyLength);

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
			dataFree(signedBuffer);
			dataFree(messageBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	signDetached: function (message, privateKey) {
		return new Uint8Array(
			sphincs.sign(message, privateKey).buffer,
			0,
			sphincs.signatureLength
		);
	},

	open: function (signed, publicKey) {
		var openedLength	= signed.length - sphincs.signatureLength;

		var openedBuffer	= Module._malloc(openedLength);
		var signedBuffer	= Module._malloc(signed.length);
		var publicKeyBuffer	= Module._malloc(sphincs.publicKeyLength);

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
			dataFree(openedBuffer);
			dataFree(signedBuffer);
			dataFree(publicKeyBuffer);
		}
	},

	verifyDetached: function (signature, message, publicKey) {
		var signed	= new Uint8Array(sphincs.signatureLength + message.length);
		signed.set(signature);
		signed.set(message, sphincs.signatureLength);

		try {
			sphincs.open(signed, publicKey);
			return true; 
		}
		catch (_) {
			return false;
		}
		finally {
			dataFree(signed);
		}
	}
};



return sphincs;

}());

self.sphincs	= sphincs;
