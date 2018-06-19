		Module._sphincsjs_init();

		publicKeyBytes	= Module._sphincsjs_public_key_bytes();
		privateKeyBytes	= Module._sphincsjs_secret_key_bytes();
		bytes			= Module._sphincsjs_signature_bytes();

		return Module;
	});
}


var ERROR_RETRY	= {};

function dataReturn (returnValue, result) {
	if (returnValue === 0) {
		return result;
	}
	else {
		throw new Error('SPHINCS error: ' + returnValue);
	}
}

function dataResult (Module, buffer, bytes) {
	return new Uint8Array(
		new Uint8Array(Module.HEAPU8.buffer, buffer, bytes)
	);
}

function dataFree (Module, buffer) {
	try {
		Module._free(buffer);
	}
	catch (_) {
		throw ERROR_RETRY;
	}
}

function dataMalloc (Module, n) {
	try {
		return Module._malloc(n);
	}
	catch (_) {
		throw ERROR_RETRY;
	}
}


var modulePromise	= getModule();

function getModuleWrapper (f) {
	return function fWrapper () {
		var args				= arguments;
		var context				= this;
		var thisModulePromise	= modulePromise;

		return thisModulePromise.then(function (Module) {
			return f.apply(context, [Module].concat(Array.prototype.slice.apply(args)));
		}).catch(function (err) {
			if (err !== ERROR_RETRY) {
				throw err;
			}

			if (modulePromise === thisModulePromise) {
				modulePromise	= getModule();
			}

			return fWrapper.apply(context, args);
		});
	};
}


var sphincs	= {
	publicKeyBytes: modulePromise.then(function () { return publicKeyBytes; }),
	privateKeyBytes: modulePromise.then(function () { return privateKeyBytes; }),
	bytes: modulePromise.then(function () { return bytes; }),

	keyPair: getModuleWrapper(function (Module) {
		var publicKeyBuffer		= dataMalloc(Module, publicKeyBytes);
		var privateKeyBuffer	= dataMalloc(Module, privateKeyBytes);

		try {
			var returnValue	= Module._sphincsjs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(Module, publicKeyBuffer, publicKeyBytes),
				privateKey: dataResult(Module, privateKeyBuffer, privateKeyBytes)
			});
		}
		finally {
			dataFree(Module, publicKeyBuffer);
			dataFree(Module, privateKeyBuffer);
		}
	}),

	sign: getModuleWrapper(function (Module, message, privateKey) {
		var signedBytes	= message.length + bytes;

		var signedBuffer		= dataMalloc(Module, signedBytes);
		var signedLengthBuffer	= dataMalloc(Module, 8);
		var messageBuffer		= dataMalloc(Module, message.length);
		var privateKeyBuffer	= dataMalloc(Module, privateKeyBytes);

		Module.writeArrayToMemory(message, messageBuffer);
		Module.writeArrayToMemory(privateKey, privateKeyBuffer);

		try {
			var returnValue	= Module._sphincsjs_sign(
				signedBuffer,
				signedLengthBuffer,
				messageBuffer,
				message.length,
				privateKeyBuffer
			);

			return dataReturn(returnValue, dataResult(Module, signedBuffer, signedBytes));
		}
		finally {
			dataFree(Module, signedBuffer);
			dataFree(Module, signedLengthBuffer);
			dataFree(Module, messageBuffer);
			dataFree(Module, privateKeyBuffer);
		}
	}),

	signDetached: function (message, privateKey) {
		return sphincs.sign(message, privateKey).then(function (signed) {
			return new Uint8Array(signed.buffer, 0, bytes);
		});
	},

	open: getModuleWrapper(function (Module, signed, publicKey) {
		var openedBuffer		= dataMalloc(Module, signed.length + bytes);
		var openedLengthBuffer	= dataMalloc(Module, 8);
		var signedBuffer		= dataMalloc(Module, signed.length);
		var publicKeyBuffer		= dataMalloc(Module, publicKeyBytes);

		Module.writeArrayToMemory(signed, signedBuffer);
		Module.writeArrayToMemory(publicKey, publicKeyBuffer);

		try {
			var returnValue	= Module._sphincsjs_open(
				openedBuffer,
				openedLengthBuffer,
				signedBuffer,
				signed.length,
				publicKeyBuffer
			);

			return dataReturn(returnValue, dataResult(Module, openedBuffer, signed.length - bytes));
		}
		finally {
			dataFree(Module, openedBuffer);
			dataFree(Module, openedLengthBuffer);
			dataFree(Module, signedBuffer);
			dataFree(Module, publicKeyBuffer);
		}
	}),

	verifyDetached: function (signature, message, publicKey) {
		var signed	= new Uint8Array(bytes + message.length);
		signed.set(signature);
		signed.set(message, bytes);

		return sphincs.open(signed, publicKey).catch(function () {}).then(function (opened) {
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
