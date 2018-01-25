;

function writeArrayToMemory (array, buffer) {
	Module.HEAP8.set(array, buffer);
}

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


var publicKeyBytes, privateKeyBytes, bytes;

var initiated	= Module.ready.then(function () {
	Module._sphincsjs_init();

	publicKeyBytes	= Module._sphincsjs_public_key_bytes();
	privateKeyBytes	= Module._sphincsjs_secret_key_bytes();
	bytes			= Module._sphincsjs_signature_bytes();
});


var sphincs	= {
	publicKeyBytes: initiated.then(function () { return publicKeyBytes; }),
	privateKeyBytes: initiated.then(function () { return privateKeyBytes; }),
	bytes: initiated.then(function () { return bytes; }),

	keyPair: function () { return initiated.then(function () {
		var publicKeyBuffer		= Module._malloc(publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(privateKeyBytes);

		try {
			var returnValue	= Module._sphincsjs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, publicKeyBytes),
				privateKey: dataResult(privateKeyBuffer, privateKeyBytes)
			});
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	}); },

	sign: function (message, privateKey) { return initiated.then(function () {
		var signedBytes	= message.length + bytes;

		var signedBuffer		= Module._malloc(signedBytes);
		var signedLengthBuffer	= Module._malloc(8);
		var messageBuffer		= Module._malloc(message.length);
		var privateKeyBuffer	= Module._malloc(privateKeyBytes);

		writeArrayToMemory(message, messageBuffer);
		writeArrayToMemory(privateKey, privateKeyBuffer);

		try {
			var returnValue	= Module._sphincsjs_sign(
				signedBuffer,
				signedLengthBuffer,
				messageBuffer,
				message.length,
				privateKeyBuffer
			);

			return dataReturn(returnValue, dataResult(signedBuffer, signedBytes));
		}
		finally {
			dataFree(signedBuffer);
			dataFree(signedLengthBuffer);
			dataFree(messageBuffer);
			dataFree(privateKeyBuffer);
		}
	}); },

	signDetached: function (message, privateKey) {
		return sphincs.sign(message, privateKey).then(function (signed) {
			return new Uint8Array(
				signed.buffer,
				0,
				bytes
			);
		});
	},

	open: function (signed, publicKey) { return initiated.then(function () {
		var openedBytes	= signed.length - bytes;

		var openedBuffer		= Module._malloc(openedBytes);
		var openedLengthBuffer	= Module._malloc(8);
		var signedBuffer		= Module._malloc(signed.length);
		var publicKeyBuffer		= Module._malloc(publicKeyBytes);

		writeArrayToMemory(signed, signedBuffer);
		writeArrayToMemory(publicKey, publicKeyBuffer);

		try {
			var returnValue	= Module._sphincsjs_open(
				openedBuffer,
				openedLengthBuffer,
				signedBuffer,
				signed.length,
				publicKeyBuffer
			);

			return dataReturn(returnValue, dataResult(openedBuffer, openedBytes));
		}
		finally {
			dataFree(openedBuffer);
			dataFree(openedLengthBuffer);
			dataFree(signedBuffer);
			dataFree(publicKeyBuffer);
		}
	}); },

	verifyDetached: function (signature, message, publicKey) {
		return initiated.then(function () {
			var signed	= new Uint8Array(bytes + message.length);
			signed.set(signature);
			signed.set(message, bytes);

			return sphincs.open(
				signed,
				publicKey
			).catch(function () {}).then(function (opened) {
				try {
					return opened !== undefined;
				}
				finally {
					var arrs	= opened ? [signed, opened] : [signed];
					for (var i = 0 ; i < arrs.length ; ++i) {
						var arr	= arrs[i];
						for (var j = 0 ; j < arr.length ; ++j) {
							arr[j]	= 0;
						}
					}
				}
			});
		});
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
