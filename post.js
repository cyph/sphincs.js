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
	publicKeyBytes: Module._sphincsjs_public_key_bytes(),
	privateKeyBytes: Module._sphincsjs_secret_key_bytes(),
	bytes: Module._sphincsjs_signature_bytes(),

	keyPair: function () {
		var publicKeyBuffer		= Module._malloc(sphincs.publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(sphincs.privateKeyBytes);

		try {
			var returnValue	= Module._crypto_sign_sphincs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, sphincs.publicKeyBytes),
				privateKey: dataResult(privateKeyBuffer, sphincs.privateKeyBytes)
			});
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	sign: function (message, privateKey) {
		var signedBytes		= message.length + sphincs.bytes;

		var signedBuffer		= Module._malloc(signedBytes);
		var messageBuffer		= Module._malloc(message.length);
		var privateKeyBuffer	= Module._malloc(sphincs.privateKeyBytes);

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

			return dataReturn(returnValue, dataResult(signedBuffer, signedBytes));
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
			sphincs.bytes
		);
	},

	open: function (signed, publicKey) {
		var openedBytes	= signed.length - sphincs.bytes;

		var openedBuffer	= Module._malloc(openedBytes);
		var signedBuffer	= Module._malloc(signed.length);
		var publicKeyBuffer	= Module._malloc(sphincs.publicKeyBytes);

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

			return dataReturn(returnValue, dataResult(openedBuffer, openedBytes));
		}
		finally {
			dataFree(openedBuffer);
			dataFree(signedBuffer);
			dataFree(publicKeyBuffer);
		}
	},

	verifyDetached: function (signature, message, publicKey) {
		var signed	= new Uint8Array(sphincs.bytes + message.length);
		signed.set(signature);
		signed.set(message, sphincs.bytes);

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


if (typeof module !== 'undefined' && module.exports) {
	sphincs.sphincs	= sphincs;
	module.exports	= sphincs;
}
else {
	self.sphincs	= sphincs;
}
