;

function dataAllocate (n) {
	var data		= new Uint8Array(n);
	var nDataBytes	= data.length * data.BYTES_PER_ELEMENT;
	var dataHeap	= new Uint8Array(Module.HEAPU8.buffer, Module._malloc(nDataBytes), nDataBytes);
	dataHeap.set(new Uint8Array(data.buffer));
	return {data: data, dataHeap: dataHeap};
}

function dataArgument (o) {
    return o.dataHeap.byteOffset;
}

function dataReturn (returnValue, result) {
	if (returnValue === 0) {
		return result;
	}
	else {
		throw new Error('SPHINCS error: ' + returnValue);
	}
}

function dataResult (o) {
	var result	= new Uint8Array(o.dataHeap);
	Module._free(o.dataHeap.byteOffset);
	return result;
}


Module.ccall('randombytes_stir', 'void');


var keypair	= Module.cwrap('sphincsjs_keypair', 'number', ['number', 'number']);
var sign	= Module.cwrap('sphincsjs_sign', 'number', ['number', 'number', 'number', 'number', 'number']);
var open	= Module.cwrap('sphincsjs_open', 'number', ['number', 'number', 'number', 'number', 'number']);


var sphincs	= {
	publicKeyLength: Module.ccall('sphincsjs_public_key_bytes', 'number'),
	privateKeyLength: Module.ccall('sphincsjs_secret_key_bytes', 'number'),
	signatureLength: Module.ccall('sphincsjs_signature_bytes', 'number'),

	keyPair: function () {
		var pub		= dataAllocate(sphincs.publicKeyLength);
		var priv	= dataAllocate(sphincs.privateKeyLength);

		var returnValue	= keypair(
			dataArgument(pub),
			dataArgument(priv)
		);

		return dataReturn(returnValue, {
			publicKey: dataResult(pub),
			privateKey: dataResult(priv)
		});
	},
	sign: function (message, privateKey) {
		var msg		= dataAllocate(message);
		var priv	= dataAllocate(privateKey);
		var signed	= dataAllocate(msg.data.length + sphincs.signatureLength);

		var returnValue	= sign(
			dataArgument(signed),
			signed.data.length,
			dataArgument(msg),
			msg.data.length,
			dataArgument(priv)
		);

		dataResult(msg);
		dataResult(priv);

		return dataReturn(returnValue, dataResult(signed));
	},
	open: function (message, publicKey) {
		var signed	= dataAllocate(message);
		var pub		= dataAllocate(publicKey);
		var opened	= dataAllocate(signed.data.length - sphincs.signatureLength);

		var returnValue	= open(
			dataArgument(opened),
			opened.data.length,
			dataArgument(signed),
			signed.data.length,
			dataArgument(pub)
		);

		dataResult(signed);
		dataResult(pub);

		return dataReturn(returnValue, dataResult(opened));
	}
};



return sphincs;

}());

self.sphincs	= sphincs;
