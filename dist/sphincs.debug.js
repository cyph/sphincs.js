var sphincs = (function () { 

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  throw 'NO_DYNAMIC_EXECUTION was set, cannot eval';
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [null,null,null,null,null,null,null,null],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 1*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-1)/1] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    abort('NO_DYNAMIC_EXECUTION was set, cannot eval - ccall/cwrap are not functional');
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  // NO_DYNAMIC_EXECUTION is on, so we can't use the fast version of cwrap.
  // Fall back to returning a bound version of ccall.
  cwrap = function cwrap(ident, returnType, argTypes) {
    return function() {
      return ccall(ident, returnType, argTypes, arguments);
    }
  }
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 35000000;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [function() { { if (Module.getRandomValue === undefined) { try { var window_ = "object" === typeof window ? window : self, crypto_ = typeof window_.crypto !== "undefined" ? window_.crypto : window_.msCrypto, randomValuesStandard = function() { var buf = new Uint32Array(1); crypto_.getRandomValues(buf); return buf[0] >>> 0; }; randomValuesStandard(); Module.getRandomValue = randomValuesStandard; } catch (e) { try { var crypto = require('crypto'), randomValueNodeJS = function() { var buf = crypto.randomBytes(4); return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0; }; randomValueNodeJS(); Module.getRandomValue = randomValueNodeJS; } catch (e) { throw 'No secure random number generator found'; } } } } },
 function() { { return Module.getRandomValue(); } }];

function _emscripten_asm_const_0(code) {
 return ASM_CONSTS[code]();
}



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 2272;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([211,8,163,133,136,106,63,36,68,115,112,3,46,138,25,19,208,49,159,41,34,56,9,164,137,108,78,236,152,250,46,8,119,19,208,56,230,33,40,69,108,12,233,52,207,102,84,190,221,80,124,201,183,41,172,192,23,9,71,181,181,213,132,63,27,251,121,137,217,213,22,146,172,181,223,152,166,11,49,209,183,223,26,208,219,114,253,47,150,126,38,106,237,175,225,184,153,127,44,241,69,144,124,186,247,108,145,179,71,153,161,36,22,252,142,133,226,242,1,8,105,78,87,113,216,32,105,99,136,106,63,36,211,8,163,133,46,138,25,19,68,115,112,3,34,56,9,164,208,49,159,41,152,250,46,8,137,108,78,236,230,33,40,69,119,19,208,56,207,102,84,190,108,12,233,52,183,41,172,192,221,80,124,201,181,213,132,63,23,9,71,181,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,32,114,101,116,117,114,110,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,40,41,59,32,125,0,123,32,105,102,32,40,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,61,61,32,117,110,100,101,102,105,110,101,100,41,32,123,32,116,114,121,32,123,32,118,97,114,32,119,105,110,100,111,119,95,32,61,32,34,111,98,106,101,99,116,34,32,61,61,61,32,116,121,112,101,111,102,32,119,105,110,100,111,119,32,63,32,119,105,110,100,111,119,32,58,32,115,101,108,102,44,32,99,114,121,112,116,111,95,32,61,32,116,121,112,101,111,102,32,119,105,110,100,111,119,95,46,99,114,121,112,116,111,32,33,61,61,32,34,117,110,100,101,102,105,110,101,100,34,32,63,32,119,105,110,100,111,119,95,46,99,114,121,112,116,111,32,58,32,119,105,110,100,111,119,95,46,109,115,67,114,121,112,116,111,44,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,32,61,32,102,117,110,99,116,105,111,110,40,41,32,123,32,118,97,114,32,98,117,102,32,61,32,110,101,119,32,85,105,110,116,51,50,65,114,114,97,121,40,49,41,59,32,99,114,121,112,116,111,95,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,115,40,98,117,102,41,59,32,114,101,116,117,114,110,32,98,117,102,91,48,93,32,62,62,62,32,48,59,32,125,59,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,40,41,59,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,59,32,125,32,99,97,116,99,104,32,40,101,41,32,123,32,116,114,121,32,123,32,118,97,114,32,99,114,121,112,116,111,32,61,32,114,101,113,117,105,114,101,40,39,99,114,121,112,116,111,39,41,44,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,32,61,32,102,117,110,99,116,105,111,110,40,41,32,123,32,118,97,114,32,98,117,102,32,61,32,99,114,121,112,116,111,46,114,97,110,100,111,109,66,121,116,101,115,40,52,41,59,32,114,101,116,117,114,110,32,40,98,117,102,91,48,93,32,60,60,32,50,52,32,124,32,98,117,102,91,49,93,32,60,60,32,49,54,32,124,32,98,117,102,91,50,93,32,60,60,32,56,32,124,32,98,117,102,91,51,93,41,32,62,62,62,32,48,59,32,125,59,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,40,41,59,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,59,32,125,32,99,97,116,99,104,32,40,101,41,32,123,32,116,104,114,111,119,32,39,78,111,32,115,101,99,117,114,101,32,114,97,110,100,111,109,32,110,117,109,98,101,114,32,103,101,110,101,114,97,116,111,114,32,102,111,117,110,100,39,59,32,125,32,125,32,125,32,125,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,14,10,4,8,9,15,13,6,1,12,0,2,11,7,5,3,11,8,12,0,5,2,15,13,10,14,3,6,7,1,9,4,7,9,3,1,13,12,11,14,2,6,5,10,4,0,15,8,9,0,5,7,2,4,10,15,14,1,11,12,6,8,3,13,2,12,6,10,0,11,8,3,4,13,7,5,15,14,1,9,12,5,1,15,14,13,4,10,0,7,6,3,9,2,8,11,13,11,7,14,12,1,3,9,5,0,15,4,8,6,2,10,6,15,14,9,11,3,0,8,12,2,13,7,1,4,10,5,10,2,8,4,7,6,1,5,15,11,9,14,3,12,13,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,14,10,4,8,9,15,13,6,1,12,0,2,11,7,5,3,11,8,12,0,5,2,15,13,10,14,3,6,7,1,9,4,7,9,3,1,13,12,11,14,2,6,5,10,4,0,15,8,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,14,10,4,8,9,15,13,6,1,12,0,2,11,7,5,3,11,8,12,0,5,2,15,13,10,14,3,6,7,1,9,4,7,9,3,1,13,12,11,14,2,6,5,10,4,0,15,8,9,0,5,7,2,4,10,15,14,1,11,12,6,8,3,13,2,12,6,10,0,11,8,3,4,13,7,5,15,14,1,9,12,5,1,15,14,13,4,10,0,7,6,3,9,2,8,11,13,11,7,14,12,1,3,9,5,0,15,4,8,6,2,10,6,15,14,9,11,3,0,8,12,2,13,7,1,4,10,5,10,2,8,4,7,6,1,5,15,11,9,14,3,12,13,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,14,10,4,8,9,15,13,6,1,12,0,2,11,7,5,3,11,8,12,0,5,2,15,13,10,14,3,6,7,1,9,4,7,9,3,1,13,12,11,14,2,6,5,10,4,0,15,8,9,0,5,7,2,4,10,15,14,1,11,12,6,8,3,13,2,12,6,10,0,11,8,3,4,13,7,5,15,14,1,9,12,5,1,15,14,13,4,10,0,7,6,3,9,2,8,11,13,11,7,14,12,1,3,9,5,0,15,4,8,6,2,10,6,15,14,9,11,3,0,8,12,2,13,7,1,4,10,5,10,2,8,4,7,6,1,5,15,11,9,14,3,12,13,0,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,101,120,112,97,110,100,32,51,50,45,98,121,116,101,32,116,111,32,54,52,45,98,121,116,101,32,115,116,97,116,101,33,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


   
  Module["_i64Subtract"] = _i64Subtract;

   
  Module["_i64Add"] = _i64Add;

   
  Module["_memset"] = _memset;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  var _emscripten_asm_const=true;

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

   
  Module["_memmove"] = _memmove;

  var _emscripten_asm_const_int=true;

  
  var PATH=undefined;
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "_sysconf": _sysconf, "_pthread_self": _pthread_self, "_abort": _abort, "___setErrNo": ___setErrNo, "_sbrk": _sbrk, "_time": _time, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_emscripten_asm_const_0": _emscripten_asm_const_0, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var _sysconf=env._sysconf;
  var _pthread_self=env._pthread_self;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _emscripten_asm_const_0=env._emscripten_asm_const_0;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _randombytes_stir() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 _emscripten_asm_const_0(0); //@line 73 "libsodium/src/libsodium/randombytes/randombytes.c"
 return; //@line 101 "libsodium/src/libsodium/randombytes/randombytes.c"
}
function _blake256_compress($S,$block) {
 $S = $S|0;
 $block = $block|0;
 var $$sum5 = 0, $$sum6 = 0, $$sum7 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0;
 var $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0;
 var $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0;
 var $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0;
 var $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0;
 var $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0;
 var $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0;
 var $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0;
 var $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0;
 var $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $exitcond = 0, $exitcond11 = 0, $exitcond12 = 0, $exitcond13 = 0, $exitcond14 = 0;
 var $m = 0, $storemerge = 0, $storemerge1 = 0, $storemerge2 = 0, $storemerge3 = 0, $storemerge4 = 0, $v = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $v = sp + 64|0;
 $m = sp;
 $storemerge = 0;
 while(1) {
  $exitcond14 = ($storemerge|0)==(16); //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($exitcond14) {
   $storemerge1 = 0;
   break;
  }
  $0 = $storemerge << 2; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $1 = (($block) + ($0)|0); //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $2 = HEAP8[$1>>0]|0; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $3 = $2&255; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $4 = $3 << 24; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $$sum5 = $0 | 1; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $5 = (($block) + ($$sum5)|0); //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $6 = HEAP8[$5>>0]|0; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $7 = $6&255; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $8 = $7 << 16; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $9 = $4 | $8; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $$sum6 = $0 | 2; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $10 = (($block) + ($$sum6)|0); //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $11 = HEAP8[$10>>0]|0; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $12 = $11&255; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $13 = $12 << 8; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $14 = $9 | $13; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $$sum7 = $0 | 3; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $15 = (($block) + ($$sum7)|0); //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $16 = HEAP8[$15>>0]|0; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $17 = $16&255; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $18 = $14 | $17; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $19 = (($m) + ($storemerge<<2)|0); //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$19>>2] = $18; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $20 = (($storemerge) + 1)|0; //@line 70 "c_src/crypto_hash/blake256/ref/hash.c"
  $storemerge = $20;
 }
 while(1) {
  $exitcond13 = ($storemerge1|0)==(8); //@line 71 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($exitcond13) {
   break;
  }
  $21 = (($S) + ($storemerge1<<2)|0); //@line 71 "c_src/crypto_hash/blake256/ref/hash.c"
  $22 = HEAP32[$21>>2]|0; //@line 71 "c_src/crypto_hash/blake256/ref/hash.c"
  $23 = (($v) + ($storemerge1<<2)|0); //@line 71 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$23>>2] = $22; //@line 71 "c_src/crypto_hash/blake256/ref/hash.c"
  $24 = (($storemerge1) + 1)|0; //@line 71 "c_src/crypto_hash/blake256/ref/hash.c"
  $storemerge1 = $24;
 }
 $25 = ((($S)) + 32|0); //@line 72 "c_src/crypto_hash/blake256/ref/hash.c"
 $26 = HEAP32[$25>>2]|0; //@line 72 "c_src/crypto_hash/blake256/ref/hash.c"
 $27 = $26 ^ 608135816; //@line 72 "c_src/crypto_hash/blake256/ref/hash.c"
 $28 = ((($v)) + 32|0); //@line 72 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$28>>2] = $27; //@line 72 "c_src/crypto_hash/blake256/ref/hash.c"
 $29 = ((($S)) + 36|0); //@line 73 "c_src/crypto_hash/blake256/ref/hash.c"
 $30 = HEAP32[$29>>2]|0; //@line 73 "c_src/crypto_hash/blake256/ref/hash.c"
 $31 = $30 ^ -2052912941; //@line 73 "c_src/crypto_hash/blake256/ref/hash.c"
 $32 = ((($v)) + 36|0); //@line 73 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$32>>2] = $31; //@line 73 "c_src/crypto_hash/blake256/ref/hash.c"
 $33 = ((($S)) + 40|0); //@line 74 "c_src/crypto_hash/blake256/ref/hash.c"
 $34 = HEAP32[$33>>2]|0; //@line 74 "c_src/crypto_hash/blake256/ref/hash.c"
 $35 = $34 ^ 320440878; //@line 74 "c_src/crypto_hash/blake256/ref/hash.c"
 $36 = ((($v)) + 40|0); //@line 74 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$36>>2] = $35; //@line 74 "c_src/crypto_hash/blake256/ref/hash.c"
 $37 = ((($S)) + 44|0); //@line 75 "c_src/crypto_hash/blake256/ref/hash.c"
 $38 = HEAP32[$37>>2]|0; //@line 75 "c_src/crypto_hash/blake256/ref/hash.c"
 $39 = $38 ^ 57701188; //@line 75 "c_src/crypto_hash/blake256/ref/hash.c"
 $40 = ((($v)) + 44|0); //@line 75 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$40>>2] = $39; //@line 75 "c_src/crypto_hash/blake256/ref/hash.c"
 $41 = ((($v)) + 48|0); //@line 76 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$41>>2] = -1542899678; //@line 76 "c_src/crypto_hash/blake256/ref/hash.c"
 $42 = ((($v)) + 52|0); //@line 77 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$42>>2] = 698298832; //@line 77 "c_src/crypto_hash/blake256/ref/hash.c"
 $43 = ((($v)) + 56|0); //@line 78 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$43>>2] = 137296536; //@line 78 "c_src/crypto_hash/blake256/ref/hash.c"
 $44 = ((($v)) + 60|0); //@line 79 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$44>>2] = -330404727; //@line 79 "c_src/crypto_hash/blake256/ref/hash.c"
 $45 = ((($S)) + 60|0); //@line 80 "c_src/crypto_hash/blake256/ref/hash.c"
 $46 = HEAP32[$45>>2]|0; //@line 80 "c_src/crypto_hash/blake256/ref/hash.c"
 $47 = ($46|0)==(0); //@line 80 "c_src/crypto_hash/blake256/ref/hash.c"
 if ($47) {
  $48 = ((($S)) + 48|0); //@line 81 "c_src/crypto_hash/blake256/ref/hash.c"
  $49 = HEAP32[$48>>2]|0; //@line 81 "c_src/crypto_hash/blake256/ref/hash.c"
  $50 = $49 ^ -1542899678; //@line 81 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$41>>2] = $50; //@line 81 "c_src/crypto_hash/blake256/ref/hash.c"
  $51 = $49 ^ 698298832; //@line 82 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$42>>2] = $51; //@line 82 "c_src/crypto_hash/blake256/ref/hash.c"
  $52 = ((($S)) + 52|0); //@line 83 "c_src/crypto_hash/blake256/ref/hash.c"
  $53 = HEAP32[$52>>2]|0; //@line 83 "c_src/crypto_hash/blake256/ref/hash.c"
  $54 = $53 ^ 137296536; //@line 83 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$43>>2] = $54; //@line 83 "c_src/crypto_hash/blake256/ref/hash.c"
  $55 = $53 ^ -330404727; //@line 84 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$44>>2] = $55; //@line 84 "c_src/crypto_hash/blake256/ref/hash.c"
  $411 = $50;
 } else {
  $411 = -1542899678;
 }
 $56 = ((($v)) + 16|0); //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
 $57 = ((($v)) + 20|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
 $58 = ((($v)) + 4|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
 $59 = ((($v)) + 24|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
 $60 = ((($v)) + 8|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
 $61 = ((($v)) + 28|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
 $62 = ((($v)) + 12|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
 $79 = $411;$storemerge2 = 0;
 while(1) {
  $exitcond12 = ($storemerge2|0)==(14); //@line 87 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($exitcond12) {
   $storemerge3 = 0;
   break;
  }
  $63 = (1487 + ($storemerge2<<4)|0); //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $64 = HEAP8[$63>>0]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $65 = $64&255; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $66 = (($m) + ($65<<2)|0); //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $67 = HEAP32[$66>>2]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $68 = (((1487 + ($storemerge2<<4)|0)) + 1|0); //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $69 = HEAP8[$68>>0]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $70 = $69&255; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $71 = (136 + ($70<<2)|0); //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $72 = HEAP32[$71>>2]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $73 = $67 ^ $72; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $74 = HEAP32[$56>>2]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $75 = (($73) + ($74))|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $76 = HEAP32[$v>>2]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $77 = (($76) + ($75))|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $78 = $79 ^ $77; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $80 = $78 << 16; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $81 = $78 >>> 16; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $82 = $80 | $81; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $83 = HEAP32[$28>>2]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $84 = (($83) + ($82))|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $85 = $74 ^ $84; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $86 = $85 << 20; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $87 = $85 >>> 12; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $88 = $86 | $87; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $89 = (($m) + ($70<<2)|0); //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $90 = HEAP32[$89>>2]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $91 = (136 + ($65<<2)|0); //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $92 = HEAP32[$91>>2]|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $93 = $90 ^ $92; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $94 = (($93) + ($88))|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $95 = (($77) + ($94))|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$v>>2] = $95; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $96 = $82 ^ $95; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $97 = $96 << 24; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $98 = $96 >>> 8; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $99 = $97 | $98; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$41>>2] = $99; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $100 = (($84) + ($99))|0; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$28>>2] = $100; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $101 = $88 ^ $100; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $102 = $101 << 25; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $103 = $101 >>> 7; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $104 = $102 | $103; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$56>>2] = $104; //@line 88 "c_src/crypto_hash/blake256/ref/hash.c"
  $105 = (((1487 + ($storemerge2<<4)|0)) + 2|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $106 = HEAP8[$105>>0]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $107 = $106&255; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $108 = (($m) + ($107<<2)|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $109 = HEAP32[$108>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $110 = (((1487 + ($storemerge2<<4)|0)) + 3|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $111 = HEAP8[$110>>0]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $112 = $111&255; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $113 = (136 + ($112<<2)|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $114 = HEAP32[$113>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $115 = $109 ^ $114; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $116 = HEAP32[$57>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $117 = (($115) + ($116))|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $118 = HEAP32[$58>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $119 = (($118) + ($117))|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $120 = HEAP32[$42>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $121 = $120 ^ $119; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $122 = $121 << 16; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $123 = $121 >>> 16; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $124 = $122 | $123; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $125 = HEAP32[$32>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $126 = (($125) + ($124))|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $127 = $116 ^ $126; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $128 = $127 << 20; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $129 = $127 >>> 12; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $130 = $128 | $129; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $131 = (($m) + ($112<<2)|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $132 = HEAP32[$131>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $133 = (136 + ($107<<2)|0); //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $134 = HEAP32[$133>>2]|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $135 = $132 ^ $134; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $136 = (($135) + ($130))|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $137 = (($119) + ($136))|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$58>>2] = $137; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $138 = $124 ^ $137; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $139 = $138 << 24; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $140 = $138 >>> 8; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $141 = $139 | $140; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$42>>2] = $141; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $142 = (($126) + ($141))|0; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$32>>2] = $142; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $143 = $130 ^ $142; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $144 = $143 << 25; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $145 = $143 >>> 7; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $146 = $144 | $145; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$57>>2] = $146; //@line 89 "c_src/crypto_hash/blake256/ref/hash.c"
  $147 = (((1487 + ($storemerge2<<4)|0)) + 4|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $148 = HEAP8[$147>>0]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $149 = $148&255; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $150 = (($m) + ($149<<2)|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $151 = HEAP32[$150>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $152 = (((1487 + ($storemerge2<<4)|0)) + 5|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $153 = HEAP8[$152>>0]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $154 = $153&255; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $155 = (136 + ($154<<2)|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $156 = HEAP32[$155>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $157 = $151 ^ $156; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $158 = HEAP32[$59>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $159 = (($157) + ($158))|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $160 = HEAP32[$60>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $161 = (($160) + ($159))|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $162 = HEAP32[$43>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $163 = $162 ^ $161; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $164 = $163 << 16; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $165 = $163 >>> 16; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $166 = $164 | $165; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $167 = HEAP32[$36>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $168 = (($167) + ($166))|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $169 = $158 ^ $168; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $170 = $169 << 20; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $171 = $169 >>> 12; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $172 = $170 | $171; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $173 = (($m) + ($154<<2)|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $174 = HEAP32[$173>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $175 = (136 + ($149<<2)|0); //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $176 = HEAP32[$175>>2]|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $177 = $174 ^ $176; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $178 = (($177) + ($172))|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $179 = (($161) + ($178))|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$60>>2] = $179; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $180 = $166 ^ $179; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $181 = $180 << 24; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $182 = $180 >>> 8; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $183 = $181 | $182; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $184 = (($168) + ($183))|0; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$36>>2] = $184; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $185 = $172 ^ $184; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $186 = $185 << 25; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $187 = $185 >>> 7; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $188 = $186 | $187; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$59>>2] = $188; //@line 90 "c_src/crypto_hash/blake256/ref/hash.c"
  $189 = (((1487 + ($storemerge2<<4)|0)) + 6|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $190 = HEAP8[$189>>0]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $191 = $190&255; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $192 = (($m) + ($191<<2)|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $193 = HEAP32[$192>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $194 = (((1487 + ($storemerge2<<4)|0)) + 7|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $195 = HEAP8[$194>>0]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $196 = $195&255; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $197 = (136 + ($196<<2)|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $198 = HEAP32[$197>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $199 = $193 ^ $198; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $200 = HEAP32[$61>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $201 = (($199) + ($200))|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $202 = HEAP32[$62>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $203 = (($202) + ($201))|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $204 = HEAP32[$44>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $205 = $204 ^ $203; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $206 = $205 << 16; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $207 = $205 >>> 16; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $208 = $206 | $207; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $209 = HEAP32[$40>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $210 = (($209) + ($208))|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $211 = $200 ^ $210; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $212 = $211 << 20; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $213 = $211 >>> 12; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $214 = $212 | $213; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $215 = (($m) + ($196<<2)|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $216 = HEAP32[$215>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $217 = (136 + ($191<<2)|0); //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $218 = HEAP32[$217>>2]|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $219 = $216 ^ $218; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $220 = (($219) + ($214))|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $221 = (($203) + ($220))|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $222 = $208 ^ $221; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $223 = $222 << 24; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $224 = $222 >>> 8; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $225 = $223 | $224; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$44>>2] = $225; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $226 = (($210) + ($225))|0; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$40>>2] = $226; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $227 = $214 ^ $226; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $228 = $227 << 25; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $229 = $227 >>> 7; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $230 = $228 | $229; //@line 91 "c_src/crypto_hash/blake256/ref/hash.c"
  $231 = (((1487 + ($storemerge2<<4)|0)) + 14|0); //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $232 = HEAP8[$231>>0]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $233 = $232&255; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $234 = (($m) + ($233<<2)|0); //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $235 = HEAP32[$234>>2]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $236 = (((1487 + ($storemerge2<<4)|0)) + 15|0); //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $237 = HEAP8[$236>>0]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $238 = $237&255; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $239 = (136 + ($238<<2)|0); //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $240 = HEAP32[$239>>2]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $241 = $235 ^ $240; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $242 = HEAP32[$56>>2]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $243 = (($241) + ($242))|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $244 = (($221) + ($243))|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $245 = $183 ^ $244; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $246 = $245 << 16; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $247 = $245 >>> 16; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $248 = $246 | $247; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $249 = HEAP32[$32>>2]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $250 = (($249) + ($248))|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $251 = $242 ^ $250; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $252 = $251 << 20; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $253 = $251 >>> 12; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $254 = $252 | $253; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $255 = (($m) + ($238<<2)|0); //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $256 = HEAP32[$255>>2]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $257 = (136 + ($233<<2)|0); //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $258 = HEAP32[$257>>2]|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $259 = $256 ^ $258; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $260 = (($259) + ($254))|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $261 = (($244) + ($260))|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$62>>2] = $261; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $262 = $248 ^ $261; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $263 = $262 << 24; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $264 = $262 >>> 8; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $265 = $263 | $264; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$43>>2] = $265; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $266 = (($250) + ($265))|0; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$32>>2] = $266; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $267 = $254 ^ $266; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $268 = $267 << 25; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $269 = $267 >>> 7; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $270 = $268 | $269; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$56>>2] = $270; //@line 92 "c_src/crypto_hash/blake256/ref/hash.c"
  $271 = (((1487 + ($storemerge2<<4)|0)) + 12|0); //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $272 = HEAP8[$271>>0]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $273 = $272&255; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $274 = (($m) + ($273<<2)|0); //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $275 = HEAP32[$274>>2]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $276 = (((1487 + ($storemerge2<<4)|0)) + 13|0); //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $277 = HEAP8[$276>>0]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $278 = $277&255; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $279 = (136 + ($278<<2)|0); //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $280 = HEAP32[$279>>2]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $281 = $275 ^ $280; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $282 = (($281) + ($230))|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $283 = HEAP32[$60>>2]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $284 = (($283) + ($282))|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $285 = HEAP32[$42>>2]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $286 = $285 ^ $284; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $287 = $286 << 16; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $288 = $286 >>> 16; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $289 = $287 | $288; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $290 = HEAP32[$28>>2]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $291 = (($290) + ($289))|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $292 = $230 ^ $291; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $293 = $292 << 20; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $294 = $292 >>> 12; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $295 = $293 | $294; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $296 = (($m) + ($278<<2)|0); //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $297 = HEAP32[$296>>2]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $298 = (136 + ($273<<2)|0); //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $299 = HEAP32[$298>>2]|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $300 = $297 ^ $299; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $301 = (($300) + ($295))|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $302 = (($284) + ($301))|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$60>>2] = $302; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $303 = $289 ^ $302; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $304 = $303 << 24; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $305 = $303 >>> 8; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $306 = $304 | $305; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$42>>2] = $306; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $307 = (($291) + ($306))|0; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$28>>2] = $307; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $308 = $295 ^ $307; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $309 = $308 << 25; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $310 = $308 >>> 7; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $311 = $309 | $310; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$61>>2] = $311; //@line 93 "c_src/crypto_hash/blake256/ref/hash.c"
  $312 = (((1487 + ($storemerge2<<4)|0)) + 8|0); //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $313 = HEAP8[$312>>0]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $314 = $313&255; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $315 = (($m) + ($314<<2)|0); //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $316 = HEAP32[$315>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $317 = (((1487 + ($storemerge2<<4)|0)) + 9|0); //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $318 = HEAP8[$317>>0]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $319 = $318&255; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $320 = (136 + ($319<<2)|0); //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $321 = HEAP32[$320>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $322 = $316 ^ $321; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $323 = HEAP32[$57>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $324 = (($322) + ($323))|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $325 = HEAP32[$v>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $326 = (($325) + ($324))|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $327 = HEAP32[$44>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $328 = $327 ^ $326; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $329 = $328 << 16; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $330 = $328 >>> 16; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $331 = $329 | $330; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $332 = HEAP32[$36>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $333 = (($332) + ($331))|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $334 = $323 ^ $333; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $335 = $334 << 20; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $336 = $334 >>> 12; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $337 = $335 | $336; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $338 = (($m) + ($319<<2)|0); //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $339 = HEAP32[$338>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $340 = (136 + ($314<<2)|0); //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $341 = HEAP32[$340>>2]|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $342 = $339 ^ $341; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $343 = (($342) + ($337))|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $344 = (($326) + ($343))|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$v>>2] = $344; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $345 = $331 ^ $344; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $346 = $345 << 24; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $347 = $345 >>> 8; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $348 = $346 | $347; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$44>>2] = $348; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $349 = (($333) + ($348))|0; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$36>>2] = $349; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $350 = $337 ^ $349; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $351 = $350 << 25; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $352 = $350 >>> 7; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $353 = $351 | $352; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$57>>2] = $353; //@line 94 "c_src/crypto_hash/blake256/ref/hash.c"
  $354 = (((1487 + ($storemerge2<<4)|0)) + 10|0); //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $355 = HEAP8[$354>>0]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $356 = $355&255; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $357 = (($m) + ($356<<2)|0); //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $358 = HEAP32[$357>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $359 = (((1487 + ($storemerge2<<4)|0)) + 11|0); //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $360 = HEAP8[$359>>0]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $361 = $360&255; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $362 = (136 + ($361<<2)|0); //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $363 = HEAP32[$362>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $364 = $358 ^ $363; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $365 = HEAP32[$59>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $366 = (($364) + ($365))|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $367 = HEAP32[$58>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $368 = (($367) + ($366))|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $369 = HEAP32[$41>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $370 = $369 ^ $368; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $371 = $370 << 16; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $372 = $370 >>> 16; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $373 = $371 | $372; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $374 = HEAP32[$40>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $375 = (($374) + ($373))|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $376 = $365 ^ $375; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $377 = $376 << 20; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $378 = $376 >>> 12; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $379 = $377 | $378; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $380 = (($m) + ($361<<2)|0); //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $381 = HEAP32[$380>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $382 = (136 + ($356<<2)|0); //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $383 = HEAP32[$382>>2]|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $384 = $381 ^ $383; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $385 = (($384) + ($379))|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $386 = (($368) + ($385))|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$58>>2] = $386; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $387 = $373 ^ $386; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $388 = $387 << 24; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $389 = $387 >>> 8; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $390 = $388 | $389; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$41>>2] = $390; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $391 = (($375) + ($390))|0; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$40>>2] = $391; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $392 = $379 ^ $391; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $393 = $392 << 25; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $394 = $392 >>> 7; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $395 = $393 | $394; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$59>>2] = $395; //@line 95 "c_src/crypto_hash/blake256/ref/hash.c"
  $396 = (($storemerge2) + 1)|0; //@line 87 "c_src/crypto_hash/blake256/ref/hash.c"
  $79 = $390;$storemerge2 = $396;
 }
 while(1) {
  $exitcond11 = ($storemerge3|0)==(16); //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($exitcond11) {
   $storemerge4 = 0;
   break;
  }
  $397 = (($v) + ($storemerge3<<2)|0); //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  $398 = HEAP32[$397>>2]|0; //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  $399 = $storemerge3 & 7; //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  $400 = (($S) + ($399<<2)|0); //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  $401 = HEAP32[$400>>2]|0; //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  $402 = $401 ^ $398; //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$400>>2] = $402; //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  $403 = (($storemerge3) + 1)|0; //@line 98 "c_src/crypto_hash/blake256/ref/hash.c"
  $storemerge3 = $403;
 }
 while(1) {
  $exitcond = ($storemerge4|0)==(8); //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($exitcond) {
   break;
  }
  $404 = $storemerge4 & 3; //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  $405 = (((($S)) + 32|0) + ($404<<2)|0); //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  $406 = HEAP32[$405>>2]|0; //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  $407 = (($S) + ($storemerge4<<2)|0); //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  $408 = HEAP32[$407>>2]|0; //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  $409 = $408 ^ $406; //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$407>>2] = $409; //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  $410 = (($storemerge4) + 1)|0; //@line 99 "c_src/crypto_hash/blake256/ref/hash.c"
  $storemerge4 = $410;
 }
 STACKTOP = sp;return; //@line 100 "c_src/crypto_hash/blake256/ref/hash.c"
}
function _blake256_update($S,$data,$0,$1) {
 $S = $S|0;
 $data = $data|0;
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $$0$ph = 0, $$pre = 0, $$pre$phiZ2D = 0, $$sink = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $left$0$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ((($S)) + 56|0); //@line 120 "c_src/crypto_hash/blake256/ref/hash.c"
 $3 = HEAP32[$2>>2]|0; //@line 120 "c_src/crypto_hash/blake256/ref/hash.c"
 $4 = $3 >> 3; //@line 120 "c_src/crypto_hash/blake256/ref/hash.c"
 $5 = (64 - ($4))|0; //@line 121 "c_src/crypto_hash/blake256/ref/hash.c"
 $6 = ($4|0)==(0); //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
 if ($6) {
  label = 6;
 } else {
  $7 = (_bitshift64Lshr(($0|0),($1|0),3)|0); //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $8 = tempRet0; //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $9 = $7 & 63; //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $10 = ($5|0)<(0); //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $11 = $10 << 31 >> 31; //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $12 = (0)<($11>>>0); //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $13 = ($9>>>0)<($5>>>0); //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $14 = (0)==($11|0); //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $15 = $14 & $13; //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  $16 = $12 | $15; //@line 123 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($16) {
   label = 6;
  } else {
   $17 = (((($S)) + 64|0) + ($4)|0); //@line 124 "c_src/crypto_hash/blake256/ref/hash.c"
   _memcpy(($17|0),($data|0),($5|0))|0; //@line 124 "c_src/crypto_hash/blake256/ref/hash.c"
   $18 = ((($S)) + 48|0); //@line 125 "c_src/crypto_hash/blake256/ref/hash.c"
   $19 = HEAP32[$18>>2]|0; //@line 125 "c_src/crypto_hash/blake256/ref/hash.c"
   $20 = (($19) + 512)|0; //@line 125 "c_src/crypto_hash/blake256/ref/hash.c"
   HEAP32[$18>>2] = $20; //@line 125 "c_src/crypto_hash/blake256/ref/hash.c"
   $21 = ($20|0)==(0); //@line 126 "c_src/crypto_hash/blake256/ref/hash.c"
   if ($21) {
    $22 = ((($S)) + 52|0); //@line 126 "c_src/crypto_hash/blake256/ref/hash.c"
    $23 = HEAP32[$22>>2]|0; //@line 126 "c_src/crypto_hash/blake256/ref/hash.c"
    $24 = (($23) + 1)|0; //@line 126 "c_src/crypto_hash/blake256/ref/hash.c"
    HEAP32[$22>>2] = $24; //@line 126 "c_src/crypto_hash/blake256/ref/hash.c"
   }
   $25 = ((($S)) + 64|0); //@line 127 "c_src/crypto_hash/blake256/ref/hash.c"
   _blake256_compress($S,$25); //@line 127 "c_src/crypto_hash/blake256/ref/hash.c"
   $26 = (($data) + ($5)|0); //@line 128 "c_src/crypto_hash/blake256/ref/hash.c"
   $27 = $5 << 3; //@line 129 "c_src/crypto_hash/blake256/ref/hash.c"
   $28 = ($27|0)<(0); //@line 129 "c_src/crypto_hash/blake256/ref/hash.c"
   $29 = $28 << 31 >> 31; //@line 129 "c_src/crypto_hash/blake256/ref/hash.c"
   $30 = (_i64Subtract(($0|0),($1|0),($27|0),($29|0))|0); //@line 129 "c_src/crypto_hash/blake256/ref/hash.c"
   $31 = tempRet0; //@line 129 "c_src/crypto_hash/blake256/ref/hash.c"
   $$0$ph = $26;$$pre$phiZ2D = $18;$57 = $30;$58 = $31;$left$0$ph = 0;
  }
 }
 if ((label|0) == 6) {
  $$pre = ((($S)) + 48|0); //@line 134 "c_src/crypto_hash/blake256/ref/hash.c"
  $$0$ph = $data;$$pre$phiZ2D = $$pre;$57 = $0;$58 = $1;$left$0$ph = $4;
 }
 $32 = ((($S)) + 52|0); //@line 135 "c_src/crypto_hash/blake256/ref/hash.c"
 $$0 = $$0$ph;$34 = $58;$36 = $57;
 while(1) {
  $33 = ($34>>>0)>(0); //@line 133 "c_src/crypto_hash/blake256/ref/hash.c"
  $35 = ($36>>>0)>(511); //@line 133 "c_src/crypto_hash/blake256/ref/hash.c"
  $37 = ($34|0)==(0); //@line 133 "c_src/crypto_hash/blake256/ref/hash.c"
  $38 = $37 & $35; //@line 133 "c_src/crypto_hash/blake256/ref/hash.c"
  $39 = $33 | $38; //@line 133 "c_src/crypto_hash/blake256/ref/hash.c"
  if (!($39)) {
   break;
  }
  $40 = HEAP32[$$pre$phiZ2D>>2]|0; //@line 134 "c_src/crypto_hash/blake256/ref/hash.c"
  $41 = (($40) + 512)|0; //@line 134 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$$pre$phiZ2D>>2] = $41; //@line 134 "c_src/crypto_hash/blake256/ref/hash.c"
  $42 = ($41|0)==(0); //@line 135 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($42) {
   $43 = HEAP32[$32>>2]|0; //@line 135 "c_src/crypto_hash/blake256/ref/hash.c"
   $44 = (($43) + 1)|0; //@line 135 "c_src/crypto_hash/blake256/ref/hash.c"
   HEAP32[$32>>2] = $44; //@line 135 "c_src/crypto_hash/blake256/ref/hash.c"
  }
  _blake256_compress($S,$$0); //@line 136 "c_src/crypto_hash/blake256/ref/hash.c"
  $45 = ((($$0)) + 64|0); //@line 137 "c_src/crypto_hash/blake256/ref/hash.c"
  $46 = (_i64Add(($36|0),($34|0),-512,-1)|0); //@line 138 "c_src/crypto_hash/blake256/ref/hash.c"
  $47 = tempRet0; //@line 138 "c_src/crypto_hash/blake256/ref/hash.c"
  $$0 = $45;$34 = $47;$36 = $46;
 }
 $48 = ($36|0)==(0); //@line 141 "c_src/crypto_hash/blake256/ref/hash.c"
 $49 = ($34|0)==(0); //@line 141 "c_src/crypto_hash/blake256/ref/hash.c"
 $50 = $48 & $49; //@line 141 "c_src/crypto_hash/blake256/ref/hash.c"
 if ($50) {
  $$sink = 0;
  HEAP32[$2>>2] = $$sink; //@line 145 "c_src/crypto_hash/blake256/ref/hash.c"
  return; //@line 146 "c_src/crypto_hash/blake256/ref/hash.c"
 }
 $51 = (((($S)) + 64|0) + ($left$0$ph)|0); //@line 142 "c_src/crypto_hash/blake256/ref/hash.c"
 $52 = (_bitshift64Lshr(($36|0),($34|0),3)|0); //@line 142 "c_src/crypto_hash/blake256/ref/hash.c"
 $53 = tempRet0; //@line 142 "c_src/crypto_hash/blake256/ref/hash.c"
 _memcpy(($51|0),($$0|0),($52|0))|0; //@line 142 "c_src/crypto_hash/blake256/ref/hash.c"
 $54 = $left$0$ph << 3; //@line 143 "c_src/crypto_hash/blake256/ref/hash.c"
 $55 = (_i64Add(($54|0),0,($36|0),($34|0))|0); //@line 143 "c_src/crypto_hash/blake256/ref/hash.c"
 $56 = tempRet0; //@line 143 "c_src/crypto_hash/blake256/ref/hash.c"
 $$sink = $55;
 HEAP32[$2>>2] = $$sink; //@line 145 "c_src/crypto_hash/blake256/ref/hash.c"
 return; //@line 146 "c_src/crypto_hash/blake256/ref/hash.c"
}
function _blake512_compress($S,$block) {
 $S = $S|0;
 $block = $block|0;
 var $$sum11 = 0, $$sum13 = 0, $$sum15 = 0, $$sum6 = 0, $$sum7 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0;
 var $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0;
 var $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0;
 var $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0;
 var $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0;
 var $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0, $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0;
 var $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0, $1104 = 0, $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0, $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0;
 var $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0, $1120 = 0, $1121 = 0, $1122 = 0, $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0, $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0;
 var $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0, $1139 = 0, $114 = 0, $1140 = 0, $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0, $1148 = 0, $1149 = 0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0;
 var $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0, $1157 = 0, $1158 = 0, $1159 = 0, $116 = 0, $1160 = 0, $1161 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0;
 var $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0;
 var $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0;
 var $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0;
 var $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0;
 var $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0;
 var $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0;
 var $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0;
 var $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0;
 var $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0;
 var $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0;
 var $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0;
 var $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0;
 var $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0;
 var $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0;
 var $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0;
 var $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0;
 var $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0;
 var $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0;
 var $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0;
 var $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0;
 var $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0;
 var $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0;
 var $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0;
 var $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0;
 var $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0;
 var $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0;
 var $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0;
 var $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0;
 var $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0;
 var $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0;
 var $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0;
 var $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0;
 var $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0;
 var $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0;
 var $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0;
 var $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0;
 var $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0;
 var $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0;
 var $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0;
 var $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0;
 var $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0;
 var $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0;
 var $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0;
 var $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0;
 var $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0;
 var $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0;
 var $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0;
 var $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0;
 var $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $m = 0, $v = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0;
 $v = sp + 128|0;
 $m = sp;
 $1 = 0;$3 = 0;
 while(1) {
  $0 = ($1>>>0)<(0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $2 = ($3>>>0)<(16); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $4 = ($1|0)==(0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $5 = $4 & $2; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $6 = $0 | $5; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  if (!($6)) {
   $53 = 0;$55 = 0;
   break;
  }
  $7 = (_bitshift64Shl(($3|0),($1|0),3)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $8 = tempRet0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $9 = (($block) + ($7)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $10 = HEAP8[$9>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $11 = $10&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $12 = $11 << 24; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $$sum6 = $7 | 1; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $13 = (($block) + ($$sum6)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $14 = HEAP8[$13>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $15 = $14&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $16 = $15 << 16; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $17 = $12 | $16; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $$sum7 = $7 | 2; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $18 = (($block) + ($$sum7)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $19 = HEAP8[$18>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $20 = $19&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $21 = $20 << 8; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $22 = $17 | $21; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $$sum8 = $7 | 3; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $23 = (($block) + ($$sum8)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $24 = HEAP8[$23>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $25 = $24&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $26 = $22 | $25; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $$sum9 = $7 | 4; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $27 = (($block) + ($$sum9)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $28 = HEAP8[$27>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $29 = $28&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $30 = $29 << 24; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $$sum11 = $7 | 5; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $31 = (($block) + ($$sum11)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $32 = HEAP8[$31>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $33 = $32&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $34 = $33 << 16; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $35 = $30 | $34; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $$sum13 = $7 | 6; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $36 = (($block) + ($$sum13)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $37 = HEAP8[$36>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $38 = $37&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $39 = $38 << 8; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $40 = $35 | $39; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $$sum15 = $7 | 7; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $41 = (($block) + ($$sum15)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $42 = HEAP8[$41>>0]|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $43 = $42&255; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $44 = $40 | $43; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $45 = (($m) + ($3<<3)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $46 = $45; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $47 = $46; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$47>>2] = $44; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $48 = (($46) + 4)|0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $49 = $48; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$49>>2] = $26; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $50 = (_i64Add(($3|0),($1|0),1,0)|0); //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $51 = tempRet0; //@line 85 "c_src/crypto_hash/blake512/ref/hash.c"
  $1 = $51;$3 = $50;
 }
 while(1) {
  $52 = ($53>>>0)<(0); //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $54 = ($55>>>0)<(8); //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $56 = ($53|0)==(0); //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $57 = $56 & $54; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $58 = $52 | $57; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  if (!($58)) {
   break;
  }
  $59 = (($S) + ($55<<3)|0); //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $60 = $59; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $61 = $60; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $62 = HEAP32[$61>>2]|0; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $63 = (($60) + 4)|0; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $64 = $63; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $65 = HEAP32[$64>>2]|0; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $66 = (($v) + ($55<<3)|0); //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $67 = $66; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $68 = $67; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$68>>2] = $62; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $69 = (($67) + 4)|0; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $70 = $69; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$70>>2] = $65; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $71 = (_i64Add(($55|0),($53|0),1,0)|0); //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $72 = tempRet0; //@line 86 "c_src/crypto_hash/blake512/ref/hash.c"
  $53 = $72;$55 = $71;
 }
 $73 = ((($S)) + 64|0); //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $74 = $73; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $75 = $74; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $76 = HEAP32[$75>>2]|0; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $77 = (($74) + 4)|0; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $78 = $77; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $79 = HEAP32[$78>>2]|0; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $80 = $76 ^ -2052912941; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $81 = $79 ^ 608135816; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $82 = ((($v)) + 64|0); //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $83 = $82; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $84 = $83; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$84>>2] = $80; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $85 = (($83) + 4)|0; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $86 = $85; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$86>>2] = $81; //@line 87 "c_src/crypto_hash/blake512/ref/hash.c"
 $87 = ((($S)) + 72|0); //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $88 = $87; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $89 = $88; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $90 = HEAP32[$89>>2]|0; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $91 = (($88) + 4)|0; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $92 = $91; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $93 = HEAP32[$92>>2]|0; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $94 = $90 ^ 57701188; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $95 = $93 ^ 320440878; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $96 = ((($v)) + 72|0); //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $97 = $96; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $98 = $97; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$98>>2] = $94; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $99 = (($97) + 4)|0; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $100 = $99; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$100>>2] = $95; //@line 88 "c_src/crypto_hash/blake512/ref/hash.c"
 $101 = ((($S)) + 80|0); //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $102 = $101; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $103 = $102; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $104 = HEAP32[$103>>2]|0; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $105 = (($102) + 4)|0; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $106 = $105; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $107 = HEAP32[$106>>2]|0; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $108 = $104 ^ 698298832; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $109 = $107 ^ -1542899678; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $110 = ((($v)) + 80|0); //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $111 = $110; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $112 = $111; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$112>>2] = $108; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $113 = (($111) + 4)|0; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $114 = $113; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$114>>2] = $109; //@line 89 "c_src/crypto_hash/blake512/ref/hash.c"
 $115 = ((($S)) + 88|0); //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $116 = $115; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $117 = $116; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $118 = HEAP32[$117>>2]|0; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $119 = (($116) + 4)|0; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $120 = $119; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $121 = HEAP32[$120>>2]|0; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $122 = $118 ^ -330404727; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $123 = $121 ^ 137296536; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $124 = ((($v)) + 88|0); //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $125 = $124; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $126 = $125; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$126>>2] = $122; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $127 = (($125) + 4)|0; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $128 = $127; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$128>>2] = $123; //@line 90 "c_src/crypto_hash/blake512/ref/hash.c"
 $129 = ((($v)) + 96|0); //@line 91 "c_src/crypto_hash/blake512/ref/hash.c"
 $130 = $129; //@line 91 "c_src/crypto_hash/blake512/ref/hash.c"
 $131 = $130; //@line 91 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$131>>2] = 953160567; //@line 91 "c_src/crypto_hash/blake512/ref/hash.c"
 $132 = (($130) + 4)|0; //@line 91 "c_src/crypto_hash/blake512/ref/hash.c"
 $133 = $132; //@line 91 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$133>>2] = 1160258022; //@line 91 "c_src/crypto_hash/blake512/ref/hash.c"
 $134 = ((($v)) + 104|0); //@line 92 "c_src/crypto_hash/blake512/ref/hash.c"
 $135 = $134; //@line 92 "c_src/crypto_hash/blake512/ref/hash.c"
 $136 = $135; //@line 92 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$136>>2] = 887688300; //@line 92 "c_src/crypto_hash/blake512/ref/hash.c"
 $137 = (($135) + 4)|0; //@line 92 "c_src/crypto_hash/blake512/ref/hash.c"
 $138 = $137; //@line 92 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$138>>2] = -1101764913; //@line 92 "c_src/crypto_hash/blake512/ref/hash.c"
 $139 = ((($v)) + 112|0); //@line 93 "c_src/crypto_hash/blake512/ref/hash.c"
 $140 = $139; //@line 93 "c_src/crypto_hash/blake512/ref/hash.c"
 $141 = $140; //@line 93 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$141>>2] = -914599715; //@line 93 "c_src/crypto_hash/blake512/ref/hash.c"
 $142 = (($140) + 4)|0; //@line 93 "c_src/crypto_hash/blake512/ref/hash.c"
 $143 = $142; //@line 93 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$143>>2] = -1062458953; //@line 93 "c_src/crypto_hash/blake512/ref/hash.c"
 $144 = ((($v)) + 120|0); //@line 94 "c_src/crypto_hash/blake512/ref/hash.c"
 $145 = $144; //@line 94 "c_src/crypto_hash/blake512/ref/hash.c"
 $146 = $145; //@line 94 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$146>>2] = -1253635817; //@line 94 "c_src/crypto_hash/blake512/ref/hash.c"
 $147 = (($145) + 4)|0; //@line 94 "c_src/crypto_hash/blake512/ref/hash.c"
 $148 = $147; //@line 94 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$148>>2] = 1065670069; //@line 94 "c_src/crypto_hash/blake512/ref/hash.c"
 $149 = ((($S)) + 116|0); //@line 95 "c_src/crypto_hash/blake512/ref/hash.c"
 $150 = HEAP32[$149>>2]|0; //@line 95 "c_src/crypto_hash/blake512/ref/hash.c"
 $151 = ($150|0)==(0); //@line 95 "c_src/crypto_hash/blake512/ref/hash.c"
 if ($151) {
  $152 = ((($S)) + 96|0); //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $153 = $152; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $154 = $153; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $155 = HEAP32[$154>>2]|0; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $156 = (($153) + 4)|0; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $157 = $156; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $158 = HEAP32[$157>>2]|0; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $159 = $155 ^ 953160567; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $160 = $158 ^ 1160258022; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $161 = $129; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $162 = $161; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$162>>2] = $159; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $163 = (($161) + 4)|0; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $164 = $163; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$164>>2] = $160; //@line 96 "c_src/crypto_hash/blake512/ref/hash.c"
  $165 = $155 ^ 887688300; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  $166 = $158 ^ -1101764913; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  $167 = $134; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  $168 = $167; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$168>>2] = $165; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  $169 = (($167) + 4)|0; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  $170 = $169; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$170>>2] = $166; //@line 97 "c_src/crypto_hash/blake512/ref/hash.c"
  $171 = ((($S)) + 104|0); //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $172 = $171; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $173 = $172; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $174 = HEAP32[$173>>2]|0; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $175 = (($172) + 4)|0; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $176 = $175; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $177 = HEAP32[$176>>2]|0; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $178 = $174 ^ -914599715; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $179 = $177 ^ -1062458953; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $180 = $139; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $181 = $180; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$181>>2] = $178; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $182 = (($180) + 4)|0; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $183 = $182; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$183>>2] = $179; //@line 98 "c_src/crypto_hash/blake512/ref/hash.c"
  $184 = $174 ^ -1253635817; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  $185 = $177 ^ 1065670069; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  $186 = $144; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  $187 = $186; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$187>>2] = $184; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  $188 = (($186) + 4)|0; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  $189 = $188; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$189>>2] = $185; //@line 99 "c_src/crypto_hash/blake512/ref/hash.c"
  $1160 = $159;$1161 = $160;
 } else {
  $1160 = 953160567;$1161 = 1160258022;
 }
 $190 = ((($v)) + 32|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
 $191 = ((($v)) + 40|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
 $192 = ((($v)) + 8|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
 $193 = ((($v)) + 48|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
 $194 = ((($v)) + 16|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
 $195 = ((($v)) + 56|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
 $196 = ((($v)) + 24|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
 $198 = 0;$200 = 0;$243 = $1160;$245 = $1161;
 while(1) {
  $197 = ($198>>>0)<(0); //@line 102 "c_src/crypto_hash/blake512/ref/hash.c"
  $199 = ($200>>>0)<(16); //@line 102 "c_src/crypto_hash/blake512/ref/hash.c"
  $201 = ($198|0)==(0); //@line 102 "c_src/crypto_hash/blake512/ref/hash.c"
  $202 = $201 & $199; //@line 102 "c_src/crypto_hash/blake512/ref/hash.c"
  $203 = $197 | $202; //@line 102 "c_src/crypto_hash/blake512/ref/hash.c"
  if (!($203)) {
   $1101 = 0;$1103 = 0;
   break;
  }
  $204 = (1775 + ($200<<4)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $205 = HEAP8[$204>>0]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $206 = $205&255; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $207 = (($m) + ($206<<3)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $208 = $207; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $209 = $208; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $210 = HEAP32[$209>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $211 = (($208) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $212 = $211; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $213 = HEAP32[$212>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $214 = (((1775 + ($200<<4)|0)) + 1|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $215 = HEAP8[$214>>0]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $216 = $215&255; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $217 = (8 + ($216<<3)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $218 = $217; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $219 = $218; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $220 = HEAP32[$219>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $221 = (($218) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $222 = $221; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $223 = HEAP32[$222>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $224 = $210 ^ $220; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $225 = $213 ^ $223; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $226 = $190; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $227 = $226; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $228 = HEAP32[$227>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $229 = (($226) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $230 = $229; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $231 = HEAP32[$230>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $232 = (_i64Add(($224|0),($225|0),($228|0),($231|0))|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $233 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $234 = $v; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $235 = $234; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $236 = HEAP32[$235>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $237 = (($234) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $238 = $237; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $239 = HEAP32[$238>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $240 = (_i64Add(($236|0),($239|0),($232|0),($233|0))|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $241 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $242 = $243 ^ $240; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $244 = $245 ^ $241; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $246 = $82; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $247 = $246; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $248 = HEAP32[$247>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $249 = (($246) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $250 = $249; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $251 = HEAP32[$250>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $252 = (_i64Add(($248|0),($251|0),($244|0),($242|0))|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $253 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $254 = $228 ^ $252; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $255 = $231 ^ $253; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $256 = (_bitshift64Shl(($254|0),($255|0),39)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $257 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $258 = (_bitshift64Lshr(($254|0),($255|0),25)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $259 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $260 = $256 | $258; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $261 = $257 | $259; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $262 = (($m) + ($216<<3)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $263 = $262; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $264 = $263; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $265 = HEAP32[$264>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $266 = (($263) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $267 = $266; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $268 = HEAP32[$267>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $269 = (8 + ($206<<3)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $270 = $269; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $271 = $270; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $272 = HEAP32[$271>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $273 = (($270) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $274 = $273; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $275 = HEAP32[$274>>2]|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $276 = $265 ^ $272; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $277 = $268 ^ $275; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $278 = (_i64Add(($276|0),($277|0),($260|0),($261|0))|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $279 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $280 = (_i64Add(($240|0),($241|0),($278|0),($279|0))|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $281 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $282 = $v; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $283 = $282; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$283>>2] = $280; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $284 = (($282) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $285 = $284; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$285>>2] = $281; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $286 = $244 ^ $280; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $287 = $242 ^ $281; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $288 = (_bitshift64Shl(($286|0),($287|0),48)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $289 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $290 = (_bitshift64Lshr(($286|0),($287|0),16)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $291 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $292 = $288 | $290; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $293 = $289 | $291; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $294 = $129; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $295 = $294; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$295>>2] = $292; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $296 = (($294) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $297 = $296; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$297>>2] = $293; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $298 = (_i64Add(($252|0),($253|0),($292|0),($293|0))|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $299 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $300 = $82; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $301 = $300; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$301>>2] = $298; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $302 = (($300) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $303 = $302; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$303>>2] = $299; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $304 = $260 ^ $298; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $305 = $261 ^ $299; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $306 = (_bitshift64Shl(($304|0),($305|0),53)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $307 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $308 = (_bitshift64Lshr(($304|0),($305|0),11)|0); //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $309 = tempRet0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $310 = $306 | $308; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $311 = $307 | $309; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $312 = $190; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $313 = $312; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$313>>2] = $310; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $314 = (($312) + 4)|0; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $315 = $314; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$315>>2] = $311; //@line 103 "c_src/crypto_hash/blake512/ref/hash.c"
  $316 = (((1775 + ($200<<4)|0)) + 2|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $317 = HEAP8[$316>>0]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $318 = $317&255; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $319 = (($m) + ($318<<3)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $320 = $319; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $321 = $320; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $322 = HEAP32[$321>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $323 = (($320) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $324 = $323; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $325 = HEAP32[$324>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $326 = (((1775 + ($200<<4)|0)) + 3|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $327 = HEAP8[$326>>0]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $328 = $327&255; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $329 = (8 + ($328<<3)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $330 = $329; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $331 = $330; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $332 = HEAP32[$331>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $333 = (($330) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $334 = $333; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $335 = HEAP32[$334>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $336 = $322 ^ $332; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $337 = $325 ^ $335; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $338 = $191; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $339 = $338; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $340 = HEAP32[$339>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $341 = (($338) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $342 = $341; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $343 = HEAP32[$342>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $344 = (_i64Add(($336|0),($337|0),($340|0),($343|0))|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $345 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $346 = $192; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $347 = $346; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $348 = HEAP32[$347>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $349 = (($346) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $350 = $349; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $351 = HEAP32[$350>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $352 = (_i64Add(($348|0),($351|0),($344|0),($345|0))|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $353 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $354 = $134; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $355 = $354; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $356 = HEAP32[$355>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $357 = (($354) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $358 = $357; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $359 = HEAP32[$358>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $360 = $356 ^ $352; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $361 = $359 ^ $353; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $362 = $96; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $363 = $362; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $364 = HEAP32[$363>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $365 = (($362) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $366 = $365; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $367 = HEAP32[$366>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $368 = (_i64Add(($364|0),($367|0),($361|0),($360|0))|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $369 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $370 = $340 ^ $368; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $371 = $343 ^ $369; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $372 = (_bitshift64Shl(($370|0),($371|0),39)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $373 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $374 = (_bitshift64Lshr(($370|0),($371|0),25)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $375 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $376 = $372 | $374; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $377 = $373 | $375; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $378 = (($m) + ($328<<3)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $379 = $378; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $380 = $379; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $381 = HEAP32[$380>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $382 = (($379) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $383 = $382; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $384 = HEAP32[$383>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $385 = (8 + ($318<<3)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $386 = $385; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $387 = $386; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $388 = HEAP32[$387>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $389 = (($386) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $390 = $389; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $391 = HEAP32[$390>>2]|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $392 = $381 ^ $388; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $393 = $384 ^ $391; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $394 = (_i64Add(($392|0),($393|0),($376|0),($377|0))|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $395 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $396 = (_i64Add(($352|0),($353|0),($394|0),($395|0))|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $397 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $398 = $192; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $399 = $398; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$399>>2] = $396; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $400 = (($398) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $401 = $400; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$401>>2] = $397; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $402 = $361 ^ $396; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $403 = $360 ^ $397; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $404 = (_bitshift64Shl(($402|0),($403|0),48)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $405 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $406 = (_bitshift64Lshr(($402|0),($403|0),16)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $407 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $408 = $404 | $406; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $409 = $405 | $407; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $410 = $134; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $411 = $410; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$411>>2] = $408; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $412 = (($410) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $413 = $412; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$413>>2] = $409; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $414 = (_i64Add(($368|0),($369|0),($408|0),($409|0))|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $415 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $416 = $96; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $417 = $416; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$417>>2] = $414; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $418 = (($416) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $419 = $418; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$419>>2] = $415; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $420 = $376 ^ $414; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $421 = $377 ^ $415; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $422 = (_bitshift64Shl(($420|0),($421|0),53)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $423 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $424 = (_bitshift64Lshr(($420|0),($421|0),11)|0); //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $425 = tempRet0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $426 = $422 | $424; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $427 = $423 | $425; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $428 = $191; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $429 = $428; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$429>>2] = $426; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $430 = (($428) + 4)|0; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $431 = $430; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$431>>2] = $427; //@line 104 "c_src/crypto_hash/blake512/ref/hash.c"
  $432 = (((1775 + ($200<<4)|0)) + 4|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $433 = HEAP8[$432>>0]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $434 = $433&255; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $435 = (($m) + ($434<<3)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $436 = $435; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $437 = $436; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $438 = HEAP32[$437>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $439 = (($436) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $440 = $439; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $441 = HEAP32[$440>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $442 = (((1775 + ($200<<4)|0)) + 5|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $443 = HEAP8[$442>>0]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $444 = $443&255; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $445 = (8 + ($444<<3)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $446 = $445; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $447 = $446; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $448 = HEAP32[$447>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $449 = (($446) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $450 = $449; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $451 = HEAP32[$450>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $452 = $438 ^ $448; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $453 = $441 ^ $451; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $454 = $193; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $455 = $454; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $456 = HEAP32[$455>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $457 = (($454) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $458 = $457; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $459 = HEAP32[$458>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $460 = (_i64Add(($452|0),($453|0),($456|0),($459|0))|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $461 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $462 = $194; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $463 = $462; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $464 = HEAP32[$463>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $465 = (($462) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $466 = $465; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $467 = HEAP32[$466>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $468 = (_i64Add(($464|0),($467|0),($460|0),($461|0))|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $469 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $470 = $139; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $471 = $470; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $472 = HEAP32[$471>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $473 = (($470) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $474 = $473; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $475 = HEAP32[$474>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $476 = $472 ^ $468; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $477 = $475 ^ $469; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $478 = $110; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $479 = $478; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $480 = HEAP32[$479>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $481 = (($478) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $482 = $481; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $483 = HEAP32[$482>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $484 = (_i64Add(($480|0),($483|0),($477|0),($476|0))|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $485 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $486 = $456 ^ $484; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $487 = $459 ^ $485; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $488 = (_bitshift64Shl(($486|0),($487|0),39)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $489 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $490 = (_bitshift64Lshr(($486|0),($487|0),25)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $491 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $492 = $488 | $490; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $493 = $489 | $491; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $494 = (($m) + ($444<<3)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $495 = $494; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $496 = $495; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $497 = HEAP32[$496>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $498 = (($495) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $499 = $498; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $500 = HEAP32[$499>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $501 = (8 + ($434<<3)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $502 = $501; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $503 = $502; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $504 = HEAP32[$503>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $505 = (($502) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $506 = $505; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $507 = HEAP32[$506>>2]|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $508 = $497 ^ $504; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $509 = $500 ^ $507; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $510 = (_i64Add(($508|0),($509|0),($492|0),($493|0))|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $511 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $512 = (_i64Add(($468|0),($469|0),($510|0),($511|0))|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $513 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $514 = $194; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $515 = $514; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$515>>2] = $512; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $516 = (($514) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $517 = $516; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$517>>2] = $513; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $518 = $477 ^ $512; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $519 = $476 ^ $513; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $520 = (_bitshift64Shl(($518|0),($519|0),48)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $521 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $522 = (_bitshift64Lshr(($518|0),($519|0),16)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $523 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $524 = $520 | $522; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $525 = $521 | $523; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $526 = (_i64Add(($484|0),($485|0),($524|0),($525|0))|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $527 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $528 = $110; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $529 = $528; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$529>>2] = $526; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $530 = (($528) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $531 = $530; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$531>>2] = $527; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $532 = $492 ^ $526; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $533 = $493 ^ $527; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $534 = (_bitshift64Shl(($532|0),($533|0),53)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $535 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $536 = (_bitshift64Lshr(($532|0),($533|0),11)|0); //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $537 = tempRet0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $538 = $534 | $536; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $539 = $535 | $537; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $540 = $193; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $541 = $540; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$541>>2] = $538; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $542 = (($540) + 4)|0; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $543 = $542; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$543>>2] = $539; //@line 105 "c_src/crypto_hash/blake512/ref/hash.c"
  $544 = (((1775 + ($200<<4)|0)) + 6|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $545 = HEAP8[$544>>0]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $546 = $545&255; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $547 = (($m) + ($546<<3)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $548 = $547; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $549 = $548; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $550 = HEAP32[$549>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $551 = (($548) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $552 = $551; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $553 = HEAP32[$552>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $554 = (((1775 + ($200<<4)|0)) + 7|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $555 = HEAP8[$554>>0]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $556 = $555&255; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $557 = (8 + ($556<<3)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $558 = $557; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $559 = $558; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $560 = HEAP32[$559>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $561 = (($558) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $562 = $561; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $563 = HEAP32[$562>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $564 = $550 ^ $560; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $565 = $553 ^ $563; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $566 = $195; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $567 = $566; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $568 = HEAP32[$567>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $569 = (($566) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $570 = $569; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $571 = HEAP32[$570>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $572 = (_i64Add(($564|0),($565|0),($568|0),($571|0))|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $573 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $574 = $196; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $575 = $574; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $576 = HEAP32[$575>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $577 = (($574) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $578 = $577; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $579 = HEAP32[$578>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $580 = (_i64Add(($576|0),($579|0),($572|0),($573|0))|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $581 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $582 = $144; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $583 = $582; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $584 = HEAP32[$583>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $585 = (($582) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $586 = $585; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $587 = HEAP32[$586>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $588 = $584 ^ $580; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $589 = $587 ^ $581; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $590 = $124; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $591 = $590; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $592 = HEAP32[$591>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $593 = (($590) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $594 = $593; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $595 = HEAP32[$594>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $596 = (_i64Add(($592|0),($595|0),($589|0),($588|0))|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $597 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $598 = $568 ^ $596; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $599 = $571 ^ $597; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $600 = (_bitshift64Shl(($598|0),($599|0),39)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $601 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $602 = (_bitshift64Lshr(($598|0),($599|0),25)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $603 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $604 = $600 | $602; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $605 = $601 | $603; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $606 = (($m) + ($556<<3)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $607 = $606; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $608 = $607; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $609 = HEAP32[$608>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $610 = (($607) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $611 = $610; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $612 = HEAP32[$611>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $613 = (8 + ($546<<3)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $614 = $613; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $615 = $614; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $616 = HEAP32[$615>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $617 = (($614) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $618 = $617; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $619 = HEAP32[$618>>2]|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $620 = $609 ^ $616; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $621 = $612 ^ $619; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $622 = (_i64Add(($620|0),($621|0),($604|0),($605|0))|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $623 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $624 = (_i64Add(($580|0),($581|0),($622|0),($623|0))|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $625 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $626 = $589 ^ $624; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $627 = $588 ^ $625; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $628 = (_bitshift64Shl(($626|0),($627|0),48)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $629 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $630 = (_bitshift64Lshr(($626|0),($627|0),16)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $631 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $632 = $628 | $630; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $633 = $629 | $631; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $634 = $144; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $635 = $634; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$635>>2] = $632; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $636 = (($634) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $637 = $636; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$637>>2] = $633; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $638 = (_i64Add(($596|0),($597|0),($632|0),($633|0))|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $639 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $640 = $124; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $641 = $640; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$641>>2] = $638; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $642 = (($640) + 4)|0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $643 = $642; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$643>>2] = $639; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $644 = $604 ^ $638; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $645 = $605 ^ $639; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $646 = (_bitshift64Shl(($644|0),($645|0),53)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $647 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $648 = (_bitshift64Lshr(($644|0),($645|0),11)|0); //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $649 = tempRet0; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $650 = $646 | $648; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $651 = $647 | $649; //@line 106 "c_src/crypto_hash/blake512/ref/hash.c"
  $652 = (((1775 + ($200<<4)|0)) + 14|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $653 = HEAP8[$652>>0]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $654 = $653&255; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $655 = (($m) + ($654<<3)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $656 = $655; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $657 = $656; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $658 = HEAP32[$657>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $659 = (($656) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $660 = $659; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $661 = HEAP32[$660>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $662 = (((1775 + ($200<<4)|0)) + 15|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $663 = HEAP8[$662>>0]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $664 = $663&255; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $665 = (8 + ($664<<3)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $666 = $665; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $667 = $666; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $668 = HEAP32[$667>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $669 = (($666) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $670 = $669; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $671 = HEAP32[$670>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $672 = $658 ^ $668; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $673 = $661 ^ $671; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $674 = $190; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $675 = $674; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $676 = HEAP32[$675>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $677 = (($674) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $678 = $677; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $679 = HEAP32[$678>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $680 = (_i64Add(($672|0),($673|0),($676|0),($679|0))|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $681 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $682 = (_i64Add(($624|0),($625|0),($680|0),($681|0))|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $683 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $684 = $524 ^ $682; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $685 = $525 ^ $683; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $686 = $96; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $687 = $686; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $688 = HEAP32[$687>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $689 = (($686) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $690 = $689; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $691 = HEAP32[$690>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $692 = (_i64Add(($688|0),($691|0),($685|0),($684|0))|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $693 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $694 = $676 ^ $692; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $695 = $679 ^ $693; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $696 = (_bitshift64Shl(($694|0),($695|0),39)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $697 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $698 = (_bitshift64Lshr(($694|0),($695|0),25)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $699 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $700 = $696 | $698; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $701 = $697 | $699; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $702 = (($m) + ($664<<3)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $703 = $702; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $704 = $703; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $705 = HEAP32[$704>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $706 = (($703) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $707 = $706; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $708 = HEAP32[$707>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $709 = (8 + ($654<<3)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $710 = $709; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $711 = $710; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $712 = HEAP32[$711>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $713 = (($710) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $714 = $713; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $715 = HEAP32[$714>>2]|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $716 = $705 ^ $712; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $717 = $708 ^ $715; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $718 = (_i64Add(($716|0),($717|0),($700|0),($701|0))|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $719 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $720 = (_i64Add(($682|0),($683|0),($718|0),($719|0))|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $721 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $722 = $196; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $723 = $722; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$723>>2] = $720; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $724 = (($722) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $725 = $724; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$725>>2] = $721; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $726 = $685 ^ $720; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $727 = $684 ^ $721; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $728 = (_bitshift64Shl(($726|0),($727|0),48)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $729 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $730 = (_bitshift64Lshr(($726|0),($727|0),16)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $731 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $732 = $728 | $730; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $733 = $729 | $731; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $734 = $139; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $735 = $734; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$735>>2] = $732; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $736 = (($734) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $737 = $736; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$737>>2] = $733; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $738 = (_i64Add(($692|0),($693|0),($732|0),($733|0))|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $739 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $740 = $96; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $741 = $740; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$741>>2] = $738; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $742 = (($740) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $743 = $742; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$743>>2] = $739; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $744 = $700 ^ $738; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $745 = $701 ^ $739; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $746 = (_bitshift64Shl(($744|0),($745|0),53)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $747 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $748 = (_bitshift64Lshr(($744|0),($745|0),11)|0); //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $749 = tempRet0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $750 = $746 | $748; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $751 = $747 | $749; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $752 = $190; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $753 = $752; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$753>>2] = $750; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $754 = (($752) + 4)|0; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $755 = $754; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$755>>2] = $751; //@line 107 "c_src/crypto_hash/blake512/ref/hash.c"
  $756 = (((1775 + ($200<<4)|0)) + 12|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $757 = HEAP8[$756>>0]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $758 = $757&255; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $759 = (($m) + ($758<<3)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $760 = $759; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $761 = $760; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $762 = HEAP32[$761>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $763 = (($760) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $764 = $763; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $765 = HEAP32[$764>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $766 = (((1775 + ($200<<4)|0)) + 13|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $767 = HEAP8[$766>>0]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $768 = $767&255; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $769 = (8 + ($768<<3)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $770 = $769; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $771 = $770; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $772 = HEAP32[$771>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $773 = (($770) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $774 = $773; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $775 = HEAP32[$774>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $776 = $762 ^ $772; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $777 = $765 ^ $775; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $778 = (_i64Add(($776|0),($777|0),($650|0),($651|0))|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $779 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $780 = $194; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $781 = $780; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $782 = HEAP32[$781>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $783 = (($780) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $784 = $783; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $785 = HEAP32[$784>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $786 = (_i64Add(($782|0),($785|0),($778|0),($779|0))|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $787 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $788 = $134; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $789 = $788; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $790 = HEAP32[$789>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $791 = (($788) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $792 = $791; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $793 = HEAP32[$792>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $794 = $790 ^ $786; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $795 = $793 ^ $787; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $796 = $82; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $797 = $796; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $798 = HEAP32[$797>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $799 = (($796) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $800 = $799; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $801 = HEAP32[$800>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $802 = (_i64Add(($798|0),($801|0),($795|0),($794|0))|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $803 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $804 = $650 ^ $802; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $805 = $651 ^ $803; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $806 = (_bitshift64Shl(($804|0),($805|0),39)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $807 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $808 = (_bitshift64Lshr(($804|0),($805|0),25)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $809 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $810 = $806 | $808; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $811 = $807 | $809; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $812 = (($m) + ($768<<3)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $813 = $812; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $814 = $813; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $815 = HEAP32[$814>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $816 = (($813) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $817 = $816; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $818 = HEAP32[$817>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $819 = (8 + ($758<<3)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $820 = $819; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $821 = $820; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $822 = HEAP32[$821>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $823 = (($820) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $824 = $823; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $825 = HEAP32[$824>>2]|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $826 = $815 ^ $822; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $827 = $818 ^ $825; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $828 = (_i64Add(($826|0),($827|0),($810|0),($811|0))|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $829 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $830 = (_i64Add(($786|0),($787|0),($828|0),($829|0))|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $831 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $832 = $194; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $833 = $832; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$833>>2] = $830; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $834 = (($832) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $835 = $834; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$835>>2] = $831; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $836 = $795 ^ $830; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $837 = $794 ^ $831; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $838 = (_bitshift64Shl(($836|0),($837|0),48)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $839 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $840 = (_bitshift64Lshr(($836|0),($837|0),16)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $841 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $842 = $838 | $840; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $843 = $839 | $841; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $844 = $134; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $845 = $844; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$845>>2] = $842; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $846 = (($844) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $847 = $846; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$847>>2] = $843; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $848 = (_i64Add(($802|0),($803|0),($842|0),($843|0))|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $849 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $850 = $82; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $851 = $850; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$851>>2] = $848; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $852 = (($850) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $853 = $852; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$853>>2] = $849; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $854 = $810 ^ $848; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $855 = $811 ^ $849; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $856 = (_bitshift64Shl(($854|0),($855|0),53)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $857 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $858 = (_bitshift64Lshr(($854|0),($855|0),11)|0); //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $859 = tempRet0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $860 = $856 | $858; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $861 = $857 | $859; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $862 = $195; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $863 = $862; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$863>>2] = $860; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $864 = (($862) + 4)|0; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $865 = $864; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$865>>2] = $861; //@line 108 "c_src/crypto_hash/blake512/ref/hash.c"
  $866 = (((1775 + ($200<<4)|0)) + 8|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $867 = HEAP8[$866>>0]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $868 = $867&255; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $869 = (($m) + ($868<<3)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $870 = $869; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $871 = $870; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $872 = HEAP32[$871>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $873 = (($870) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $874 = $873; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $875 = HEAP32[$874>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $876 = (((1775 + ($200<<4)|0)) + 9|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $877 = HEAP8[$876>>0]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $878 = $877&255; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $879 = (8 + ($878<<3)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $880 = $879; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $881 = $880; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $882 = HEAP32[$881>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $883 = (($880) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $884 = $883; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $885 = HEAP32[$884>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $886 = $872 ^ $882; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $887 = $875 ^ $885; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $888 = $191; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $889 = $888; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $890 = HEAP32[$889>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $891 = (($888) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $892 = $891; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $893 = HEAP32[$892>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $894 = (_i64Add(($886|0),($887|0),($890|0),($893|0))|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $895 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $896 = $v; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $897 = $896; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $898 = HEAP32[$897>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $899 = (($896) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $900 = $899; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $901 = HEAP32[$900>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $902 = (_i64Add(($898|0),($901|0),($894|0),($895|0))|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $903 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $904 = $144; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $905 = $904; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $906 = HEAP32[$905>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $907 = (($904) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $908 = $907; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $909 = HEAP32[$908>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $910 = $906 ^ $902; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $911 = $909 ^ $903; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $912 = $110; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $913 = $912; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $914 = HEAP32[$913>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $915 = (($912) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $916 = $915; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $917 = HEAP32[$916>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $918 = (_i64Add(($914|0),($917|0),($911|0),($910|0))|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $919 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $920 = $890 ^ $918; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $921 = $893 ^ $919; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $922 = (_bitshift64Shl(($920|0),($921|0),39)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $923 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $924 = (_bitshift64Lshr(($920|0),($921|0),25)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $925 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $926 = $922 | $924; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $927 = $923 | $925; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $928 = (($m) + ($878<<3)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $929 = $928; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $930 = $929; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $931 = HEAP32[$930>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $932 = (($929) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $933 = $932; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $934 = HEAP32[$933>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $935 = (8 + ($868<<3)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $936 = $935; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $937 = $936; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $938 = HEAP32[$937>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $939 = (($936) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $940 = $939; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $941 = HEAP32[$940>>2]|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $942 = $931 ^ $938; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $943 = $934 ^ $941; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $944 = (_i64Add(($942|0),($943|0),($926|0),($927|0))|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $945 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $946 = (_i64Add(($902|0),($903|0),($944|0),($945|0))|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $947 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $948 = $v; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $949 = $948; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$949>>2] = $946; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $950 = (($948) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $951 = $950; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$951>>2] = $947; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $952 = $911 ^ $946; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $953 = $910 ^ $947; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $954 = (_bitshift64Shl(($952|0),($953|0),48)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $955 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $956 = (_bitshift64Lshr(($952|0),($953|0),16)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $957 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $958 = $954 | $956; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $959 = $955 | $957; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $960 = $144; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $961 = $960; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$961>>2] = $958; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $962 = (($960) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $963 = $962; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$963>>2] = $959; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $964 = (_i64Add(($918|0),($919|0),($958|0),($959|0))|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $965 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $966 = $110; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $967 = $966; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$967>>2] = $964; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $968 = (($966) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $969 = $968; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$969>>2] = $965; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $970 = $926 ^ $964; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $971 = $927 ^ $965; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $972 = (_bitshift64Shl(($970|0),($971|0),53)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $973 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $974 = (_bitshift64Lshr(($970|0),($971|0),11)|0); //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $975 = tempRet0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $976 = $972 | $974; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $977 = $973 | $975; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $978 = $191; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $979 = $978; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$979>>2] = $976; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $980 = (($978) + 4)|0; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $981 = $980; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$981>>2] = $977; //@line 109 "c_src/crypto_hash/blake512/ref/hash.c"
  $982 = (((1775 + ($200<<4)|0)) + 10|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $983 = HEAP8[$982>>0]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $984 = $983&255; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $985 = (($m) + ($984<<3)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $986 = $985; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $987 = $986; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $988 = HEAP32[$987>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $989 = (($986) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $990 = $989; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $991 = HEAP32[$990>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $992 = (((1775 + ($200<<4)|0)) + 11|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $993 = HEAP8[$992>>0]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $994 = $993&255; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $995 = (8 + ($994<<3)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $996 = $995; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $997 = $996; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $998 = HEAP32[$997>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $999 = (($996) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1000 = $999; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1001 = HEAP32[$1000>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1002 = $988 ^ $998; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1003 = $991 ^ $1001; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1004 = $193; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1005 = $1004; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1006 = HEAP32[$1005>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1007 = (($1004) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1008 = $1007; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1009 = HEAP32[$1008>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1010 = (_i64Add(($1002|0),($1003|0),($1006|0),($1009|0))|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1011 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1012 = $192; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1013 = $1012; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1014 = HEAP32[$1013>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1015 = (($1012) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1016 = $1015; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1017 = HEAP32[$1016>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1018 = (_i64Add(($1014|0),($1017|0),($1010|0),($1011|0))|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1019 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1020 = $129; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1021 = $1020; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1022 = HEAP32[$1021>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1023 = (($1020) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1024 = $1023; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1025 = HEAP32[$1024>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1026 = $1022 ^ $1018; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1027 = $1025 ^ $1019; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1028 = $124; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1029 = $1028; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1030 = HEAP32[$1029>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1031 = (($1028) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1032 = $1031; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1033 = HEAP32[$1032>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1034 = (_i64Add(($1030|0),($1033|0),($1027|0),($1026|0))|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1035 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1036 = $1006 ^ $1034; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1037 = $1009 ^ $1035; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1038 = (_bitshift64Shl(($1036|0),($1037|0),39)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1039 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1040 = (_bitshift64Lshr(($1036|0),($1037|0),25)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1041 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1042 = $1038 | $1040; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1043 = $1039 | $1041; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1044 = (($m) + ($994<<3)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1045 = $1044; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1046 = $1045; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1047 = HEAP32[$1046>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1048 = (($1045) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1049 = $1048; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1050 = HEAP32[$1049>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1051 = (8 + ($984<<3)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1052 = $1051; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1053 = $1052; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1054 = HEAP32[$1053>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1055 = (($1052) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1056 = $1055; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1057 = HEAP32[$1056>>2]|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1058 = $1047 ^ $1054; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1059 = $1050 ^ $1057; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1060 = (_i64Add(($1058|0),($1059|0),($1042|0),($1043|0))|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1061 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1062 = (_i64Add(($1018|0),($1019|0),($1060|0),($1061|0))|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1063 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1064 = $192; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1065 = $1064; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1065>>2] = $1062; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1066 = (($1064) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1067 = $1066; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1067>>2] = $1063; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1068 = $1027 ^ $1062; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1069 = $1026 ^ $1063; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1070 = (_bitshift64Shl(($1068|0),($1069|0),48)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1071 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1072 = (_bitshift64Lshr(($1068|0),($1069|0),16)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1073 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1074 = $1070 | $1072; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1075 = $1071 | $1073; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1076 = $129; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1077 = $1076; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1077>>2] = $1074; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1078 = (($1076) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1079 = $1078; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1079>>2] = $1075; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1080 = (_i64Add(($1034|0),($1035|0),($1074|0),($1075|0))|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1081 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1082 = $124; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1083 = $1082; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1083>>2] = $1080; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1084 = (($1082) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1085 = $1084; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1085>>2] = $1081; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1086 = $1042 ^ $1080; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1087 = $1043 ^ $1081; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1088 = (_bitshift64Shl(($1086|0),($1087|0),53)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1089 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1090 = (_bitshift64Lshr(($1086|0),($1087|0),11)|0); //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1091 = tempRet0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1092 = $1088 | $1090; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1093 = $1089 | $1091; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1094 = $193; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1095 = $1094; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1095>>2] = $1092; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1096 = (($1094) + 4)|0; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1097 = $1096; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1097>>2] = $1093; //@line 110 "c_src/crypto_hash/blake512/ref/hash.c"
  $1098 = (_i64Add(($200|0),($198|0),1,0)|0); //@line 102 "c_src/crypto_hash/blake512/ref/hash.c"
  $1099 = tempRet0; //@line 102 "c_src/crypto_hash/blake512/ref/hash.c"
  $198 = $1099;$200 = $1098;$243 = $1074;$245 = $1075;
 }
 while(1) {
  $1100 = ($1101>>>0)<(0); //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1102 = ($1103>>>0)<(16); //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1104 = ($1101|0)==(0); //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1105 = $1104 & $1102; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1106 = $1100 | $1105; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  if (!($1106)) {
   $1131 = 0;$1133 = 0;
   break;
  }
  $1107 = (($v) + ($1103<<3)|0); //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1108 = $1107; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1109 = $1108; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1110 = HEAP32[$1109>>2]|0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1111 = (($1108) + 4)|0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1112 = $1111; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1113 = HEAP32[$1112>>2]|0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1114 = $1103 & 7; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1115 = (($S) + ($1114<<3)|0); //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1116 = $1115; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1117 = $1116; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1118 = HEAP32[$1117>>2]|0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1119 = (($1116) + 4)|0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1120 = $1119; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1121 = HEAP32[$1120>>2]|0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1122 = $1118 ^ $1110; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1123 = $1121 ^ $1113; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1124 = $1115; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1125 = $1124; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1125>>2] = $1122; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1126 = (($1124) + 4)|0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1127 = $1126; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1127>>2] = $1123; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1128 = (_i64Add(($1103|0),($1101|0),1,0)|0); //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1129 = tempRet0; //@line 113 "c_src/crypto_hash/blake512/ref/hash.c"
  $1101 = $1129;$1103 = $1128;
 }
 while(1) {
  $1130 = ($1131>>>0)<(0); //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1132 = ($1133>>>0)<(8); //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1134 = ($1131|0)==(0); //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1135 = $1134 & $1132; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1136 = $1130 | $1135; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  if (!($1136)) {
   break;
  }
  $1137 = $1133 & 3; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1138 = (((($S)) + 64|0) + ($1137<<3)|0); //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1139 = $1138; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1140 = $1139; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1141 = HEAP32[$1140>>2]|0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1142 = (($1139) + 4)|0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1143 = $1142; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1144 = HEAP32[$1143>>2]|0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1145 = (($S) + ($1133<<3)|0); //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1146 = $1145; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1147 = $1146; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1148 = HEAP32[$1147>>2]|0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1149 = (($1146) + 4)|0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1150 = $1149; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1151 = HEAP32[$1150>>2]|0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1152 = $1148 ^ $1141; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1153 = $1151 ^ $1144; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1154 = $1145; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1155 = $1154; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1155>>2] = $1152; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1156 = (($1154) + 4)|0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1157 = $1156; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$1157>>2] = $1153; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1158 = (_i64Add(($1133|0),($1131|0),1,0)|0); //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1159 = tempRet0; //@line 114 "c_src/crypto_hash/blake512/ref/hash.c"
  $1131 = $1159;$1133 = $1158;
 }
 STACKTOP = sp;return; //@line 115 "c_src/crypto_hash/blake512/ref/hash.c"
}
function _blake512_update($S,$data,$0,$1) {
 $S = $S|0;
 $data = $data|0;
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $$0$ph = 0, $$pre = 0, $$pre$phiZ2D = 0, $$sink = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $8 = 0, $9 = 0, $left$0$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ((($S)) + 112|0); //@line 137 "c_src/crypto_hash/blake512/ref/hash.c"
 $3 = HEAP32[$2>>2]|0; //@line 137 "c_src/crypto_hash/blake512/ref/hash.c"
 $4 = $3 >> 3; //@line 137 "c_src/crypto_hash/blake512/ref/hash.c"
 $5 = (128 - ($4))|0; //@line 138 "c_src/crypto_hash/blake512/ref/hash.c"
 $6 = ($4|0)==(0); //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
 if ($6) {
  label = 4;
 } else {
  $7 = (_bitshift64Lshr(($0|0),($1|0),3)|0); //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $8 = tempRet0; //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $9 = $7 & 127; //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $10 = ($5|0)<(0); //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $11 = $10 << 31 >> 31; //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $12 = (0)<($11>>>0); //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $13 = ($9>>>0)<($5>>>0); //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $14 = (0)==($11|0); //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $15 = $14 & $13; //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  $16 = $12 | $15; //@line 140 "c_src/crypto_hash/blake512/ref/hash.c"
  if ($16) {
   label = 4;
  } else {
   $17 = (((($S)) + 120|0) + ($4)|0); //@line 141 "c_src/crypto_hash/blake512/ref/hash.c"
   _memcpy(($17|0),($data|0),($5|0))|0; //@line 141 "c_src/crypto_hash/blake512/ref/hash.c"
   $18 = ((($S)) + 96|0); //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $19 = $18; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $20 = $19; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $21 = HEAP32[$20>>2]|0; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $22 = (($19) + 4)|0; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $23 = $22; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $24 = HEAP32[$23>>2]|0; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $25 = (_i64Add(($21|0),($24|0),1024,0)|0); //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $26 = tempRet0; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $27 = $18; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $28 = $27; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$28>>2] = $25; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $29 = (($27) + 4)|0; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $30 = $29; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$30>>2] = $26; //@line 142 "c_src/crypto_hash/blake512/ref/hash.c"
   $31 = ((($S)) + 120|0); //@line 143 "c_src/crypto_hash/blake512/ref/hash.c"
   _blake512_compress($S,$31); //@line 143 "c_src/crypto_hash/blake512/ref/hash.c"
   $32 = (($data) + ($5)|0); //@line 144 "c_src/crypto_hash/blake512/ref/hash.c"
   $33 = $5 << 3; //@line 145 "c_src/crypto_hash/blake512/ref/hash.c"
   $34 = ($33|0)<(0); //@line 145 "c_src/crypto_hash/blake512/ref/hash.c"
   $35 = $34 << 31 >> 31; //@line 145 "c_src/crypto_hash/blake512/ref/hash.c"
   $36 = (_i64Subtract(($0|0),($1|0),($33|0),($35|0))|0); //@line 145 "c_src/crypto_hash/blake512/ref/hash.c"
   $37 = tempRet0; //@line 145 "c_src/crypto_hash/blake512/ref/hash.c"
   $$0$ph = $32;$$pre$phiZ2D = $18;$70 = $36;$71 = $37;$left$0$ph = 0;
  }
 }
 if ((label|0) == 4) {
  $$pre = ((($S)) + 96|0); //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $$0$ph = $data;$$pre$phiZ2D = $$pre;$70 = $0;$71 = $1;$left$0$ph = $4;
 }
 $$0 = $$0$ph;$39 = $71;$41 = $70;
 while(1) {
  $38 = ($39>>>0)>(0); //@line 149 "c_src/crypto_hash/blake512/ref/hash.c"
  $40 = ($41>>>0)>(1023); //@line 149 "c_src/crypto_hash/blake512/ref/hash.c"
  $42 = ($39|0)==(0); //@line 149 "c_src/crypto_hash/blake512/ref/hash.c"
  $43 = $42 & $40; //@line 149 "c_src/crypto_hash/blake512/ref/hash.c"
  $44 = $38 | $43; //@line 149 "c_src/crypto_hash/blake512/ref/hash.c"
  if (!($44)) {
   break;
  }
  $45 = $$pre$phiZ2D; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $46 = $45; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $47 = HEAP32[$46>>2]|0; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $48 = (($45) + 4)|0; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $49 = $48; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $50 = HEAP32[$49>>2]|0; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $51 = (_i64Add(($47|0),($50|0),1024,0)|0); //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $52 = tempRet0; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $53 = $$pre$phiZ2D; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $54 = $53; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$54>>2] = $51; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $55 = (($53) + 4)|0; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  $56 = $55; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$56>>2] = $52; //@line 150 "c_src/crypto_hash/blake512/ref/hash.c"
  _blake512_compress($S,$$0); //@line 151 "c_src/crypto_hash/blake512/ref/hash.c"
  $57 = ((($$0)) + 128|0); //@line 152 "c_src/crypto_hash/blake512/ref/hash.c"
  $58 = (_i64Add(($41|0),($39|0),-1024,-1)|0); //@line 153 "c_src/crypto_hash/blake512/ref/hash.c"
  $59 = tempRet0; //@line 153 "c_src/crypto_hash/blake512/ref/hash.c"
  $$0 = $57;$39 = $59;$41 = $58;
 }
 $60 = ($41|0)==(0); //@line 156 "c_src/crypto_hash/blake512/ref/hash.c"
 $61 = ($39|0)==(0); //@line 156 "c_src/crypto_hash/blake512/ref/hash.c"
 $62 = $60 & $61; //@line 156 "c_src/crypto_hash/blake512/ref/hash.c"
 if ($62) {
  $$sink = 0;
  HEAP32[$2>>2] = $$sink; //@line 160 "c_src/crypto_hash/blake512/ref/hash.c"
  return; //@line 161 "c_src/crypto_hash/blake512/ref/hash.c"
 }
 $63 = (((($S)) + 120|0) + ($left$0$ph)|0); //@line 157 "c_src/crypto_hash/blake512/ref/hash.c"
 $64 = (_bitshift64Lshr(($41|0),($39|0),3)|0); //@line 157 "c_src/crypto_hash/blake512/ref/hash.c"
 $65 = tempRet0; //@line 157 "c_src/crypto_hash/blake512/ref/hash.c"
 $66 = $64 & 127; //@line 157 "c_src/crypto_hash/blake512/ref/hash.c"
 _memcpy(($63|0),($$0|0),($66|0))|0; //@line 157 "c_src/crypto_hash/blake512/ref/hash.c"
 $67 = $left$0$ph << 3; //@line 158 "c_src/crypto_hash/blake512/ref/hash.c"
 $68 = (_i64Add(($67|0),0,($41|0),($39|0))|0); //@line 158 "c_src/crypto_hash/blake512/ref/hash.c"
 $69 = tempRet0; //@line 158 "c_src/crypto_hash/blake512/ref/hash.c"
 $$sink = $68;
 HEAP32[$2>>2] = $$sink; //@line 160 "c_src/crypto_hash/blake512/ref/hash.c"
 return; //@line 161 "c_src/crypto_hash/blake512/ref/hash.c"
}
function _crypto_hash_blake512_ref($out,$in,$0,$1) {
 $out = $out|0;
 $in = $in|0;
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0;
 var $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0;
 var $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0;
 var $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0;
 var $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0;
 var $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0;
 var $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0;
 var $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0;
 var $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0;
 var $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0;
 var $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0;
 var $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0;
 var $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0;
 var $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0;
 var $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0;
 var $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0;
 var $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0;
 var $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0;
 var $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0;
 var $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0;
 var $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0;
 var $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0;
 var $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0;
 var $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0;
 var $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0;
 var $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0;
 var $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0;
 var $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0;
 var $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0;
 var $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0;
 var $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0;
 var $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $S = 0, $hi$i$0$off0 = 0;
 var $hi$i$0$off03 = 0, $hi$i$0$off32 = 0, $hi$i$0$off40 = 0, $hi$i$0$off48 = 0, $hi$i$0$off56 = 0, $msglen$i = 0, $oo$i = 0, $zo$i = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 272|0;
 $msglen$i = sp + 256|0;
 $zo$i = sp + 249|0;
 $oo$i = sp + 248|0;
 $S = sp;
 $2 = $S; //@line 120 "c_src/crypto_hash/blake512/ref/hash.c"
 $3 = $2; //@line 120 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$3>>2] = -205731576; //@line 120 "c_src/crypto_hash/blake512/ref/hash.c"
 $4 = (($2) + 4)|0; //@line 120 "c_src/crypto_hash/blake512/ref/hash.c"
 $5 = $4; //@line 120 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$5>>2] = 1779033703; //@line 120 "c_src/crypto_hash/blake512/ref/hash.c"
 $6 = ((($S)) + 8|0); //@line 121 "c_src/crypto_hash/blake512/ref/hash.c"
 $7 = $6; //@line 121 "c_src/crypto_hash/blake512/ref/hash.c"
 $8 = $7; //@line 121 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$8>>2] = -2067093701; //@line 121 "c_src/crypto_hash/blake512/ref/hash.c"
 $9 = (($7) + 4)|0; //@line 121 "c_src/crypto_hash/blake512/ref/hash.c"
 $10 = $9; //@line 121 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$10>>2] = -1150833019; //@line 121 "c_src/crypto_hash/blake512/ref/hash.c"
 $11 = ((($S)) + 16|0); //@line 122 "c_src/crypto_hash/blake512/ref/hash.c"
 $12 = $11; //@line 122 "c_src/crypto_hash/blake512/ref/hash.c"
 $13 = $12; //@line 122 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$13>>2] = -23791573; //@line 122 "c_src/crypto_hash/blake512/ref/hash.c"
 $14 = (($12) + 4)|0; //@line 122 "c_src/crypto_hash/blake512/ref/hash.c"
 $15 = $14; //@line 122 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$15>>2] = 1013904242; //@line 122 "c_src/crypto_hash/blake512/ref/hash.c"
 $16 = ((($S)) + 24|0); //@line 123 "c_src/crypto_hash/blake512/ref/hash.c"
 $17 = $16; //@line 123 "c_src/crypto_hash/blake512/ref/hash.c"
 $18 = $17; //@line 123 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$18>>2] = 1595750129; //@line 123 "c_src/crypto_hash/blake512/ref/hash.c"
 $19 = (($17) + 4)|0; //@line 123 "c_src/crypto_hash/blake512/ref/hash.c"
 $20 = $19; //@line 123 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$20>>2] = -1521486534; //@line 123 "c_src/crypto_hash/blake512/ref/hash.c"
 $21 = ((($S)) + 32|0); //@line 124 "c_src/crypto_hash/blake512/ref/hash.c"
 $22 = $21; //@line 124 "c_src/crypto_hash/blake512/ref/hash.c"
 $23 = $22; //@line 124 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$23>>2] = -1377402159; //@line 124 "c_src/crypto_hash/blake512/ref/hash.c"
 $24 = (($22) + 4)|0; //@line 124 "c_src/crypto_hash/blake512/ref/hash.c"
 $25 = $24; //@line 124 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$25>>2] = 1359893119; //@line 124 "c_src/crypto_hash/blake512/ref/hash.c"
 $26 = ((($S)) + 40|0); //@line 125 "c_src/crypto_hash/blake512/ref/hash.c"
 $27 = $26; //@line 125 "c_src/crypto_hash/blake512/ref/hash.c"
 $28 = $27; //@line 125 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$28>>2] = 725511199; //@line 125 "c_src/crypto_hash/blake512/ref/hash.c"
 $29 = (($27) + 4)|0; //@line 125 "c_src/crypto_hash/blake512/ref/hash.c"
 $30 = $29; //@line 125 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$30>>2] = -1694144372; //@line 125 "c_src/crypto_hash/blake512/ref/hash.c"
 $31 = ((($S)) + 48|0); //@line 126 "c_src/crypto_hash/blake512/ref/hash.c"
 $32 = $31; //@line 126 "c_src/crypto_hash/blake512/ref/hash.c"
 $33 = $32; //@line 126 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$33>>2] = -79577749; //@line 126 "c_src/crypto_hash/blake512/ref/hash.c"
 $34 = (($32) + 4)|0; //@line 126 "c_src/crypto_hash/blake512/ref/hash.c"
 $35 = $34; //@line 126 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$35>>2] = 528734635; //@line 126 "c_src/crypto_hash/blake512/ref/hash.c"
 $36 = ((($S)) + 56|0); //@line 127 "c_src/crypto_hash/blake512/ref/hash.c"
 $37 = $36; //@line 127 "c_src/crypto_hash/blake512/ref/hash.c"
 $38 = $37; //@line 127 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$38>>2] = 327033209; //@line 127 "c_src/crypto_hash/blake512/ref/hash.c"
 $39 = (($37) + 4)|0; //@line 127 "c_src/crypto_hash/blake512/ref/hash.c"
 $40 = $39; //@line 127 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$40>>2] = 1541459225; //@line 127 "c_src/crypto_hash/blake512/ref/hash.c"
 $41 = ((($S)) + 116|0); //@line 128 "c_src/crypto_hash/blake512/ref/hash.c"
 $42 = ((($S)) + 112|0); //@line 128 "c_src/crypto_hash/blake512/ref/hash.c"
 $43 = ((($S)) + 104|0); //@line 128 "c_src/crypto_hash/blake512/ref/hash.c"
 $44 = ((($S)) + 96|0); //@line 128 "c_src/crypto_hash/blake512/ref/hash.c"
 $45 = ((($S)) + 64|0); //@line 129 "c_src/crypto_hash/blake512/ref/hash.c"
 $46 = (_bitshift64Shl(($0|0),($1|0),3)|0); //@line 210 "c_src/crypto_hash/blake512/ref/hash.c"
 $47 = tempRet0; //@line 210 "c_src/crypto_hash/blake512/ref/hash.c"
 dest=$45; stop=dest+56|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 128 "c_src/crypto_hash/blake512/ref/hash.c"
 _blake512_update($S,$in,$46,$47); //@line 210 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$zo$i>>0] = 1; //@line 166 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$oo$i>>0] = -127; //@line 166 "c_src/crypto_hash/blake512/ref/hash.c"
 $48 = $44; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $49 = $48; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $50 = HEAP32[$49>>2]|0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $51 = (($48) + 4)|0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $52 = $51; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $53 = HEAP32[$52>>2]|0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $54 = HEAP32[$42>>2]|0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $55 = ($54|0)<(0); //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $56 = $55 << 31 >> 31; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $57 = (_i64Add(($50|0),($53|0),($54|0),($56|0))|0); //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $58 = tempRet0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $59 = $43; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $60 = $59; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $61 = HEAP32[$60>>2]|0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $62 = (($59) + 4)|0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $63 = $62; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $64 = HEAP32[$63>>2]|0; //@line 167 "c_src/crypto_hash/blake512/ref/hash.c"
 $65 = ($58>>>0)<($56>>>0); //@line 168 "c_src/crypto_hash/blake512/ref/hash.c"
 $66 = ($57>>>0)<($54>>>0); //@line 168 "c_src/crypto_hash/blake512/ref/hash.c"
 $67 = ($58|0)==($56|0); //@line 168 "c_src/crypto_hash/blake512/ref/hash.c"
 $68 = $67 & $66; //@line 168 "c_src/crypto_hash/blake512/ref/hash.c"
 $69 = $65 | $68; //@line 168 "c_src/crypto_hash/blake512/ref/hash.c"
 $70 = $61&255;
 $71 = $64&255;
 $72 = (_bitshift64Lshr(($61|0),($64|0),40)|0);
 $73 = tempRet0;
 $74 = $72&255;
 $75 = (_bitshift64Lshr(($61|0),($64|0),48)|0);
 $76 = tempRet0;
 $77 = $75&255;
 $78 = (_bitshift64Lshr(($61|0),($64|0),56)|0);
 $79 = tempRet0;
 $80 = $78&255;
 if ($69) {
  $81 = (_i64Add(($61|0),($64|0),1,0)|0); //@line 168 "c_src/crypto_hash/blake512/ref/hash.c"
  $82 = tempRet0; //@line 168 "c_src/crypto_hash/blake512/ref/hash.c"
  $83 = $81&255;
  $84 = $82&255;
  $85 = (_bitshift64Lshr(($81|0),($82|0),40)|0);
  $86 = tempRet0;
  $87 = $85&255;
  $88 = (_bitshift64Lshr(($81|0),($82|0),48)|0);
  $89 = tempRet0;
  $90 = $88&255;
  $91 = (_bitshift64Lshr(($81|0),($82|0),56)|0);
  $92 = tempRet0;
  $93 = $91&255;
  $hi$i$0$off0 = $83;$hi$i$0$off03 = $81;$hi$i$0$off32 = $84;$hi$i$0$off40 = $87;$hi$i$0$off48 = $90;$hi$i$0$off56 = $93;
 } else {
  $hi$i$0$off0 = $70;$hi$i$0$off03 = $61;$hi$i$0$off32 = $71;$hi$i$0$off40 = $74;$hi$i$0$off48 = $77;$hi$i$0$off56 = $80;
 }
 HEAP8[$msglen$i>>0] = $hi$i$0$off56; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $94 = ((($msglen$i)) + 1|0); //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$94>>0] = $hi$i$0$off48; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $95 = ((($msglen$i)) + 2|0); //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$95>>0] = $hi$i$0$off40; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $96 = ((($msglen$i)) + 3|0); //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$96>>0] = $hi$i$0$off32; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $97 = $hi$i$0$off03 >>> 24; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $98 = $97&255; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $99 = ((($msglen$i)) + 4|0); //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$99>>0] = $98; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $100 = $hi$i$0$off03 >>> 16; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $101 = $100&255; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $102 = ((($msglen$i)) + 5|0); //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$102>>0] = $101; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $103 = $hi$i$0$off03 >>> 8; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $104 = $103&255; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $105 = ((($msglen$i)) + 6|0); //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$105>>0] = $104; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $106 = ((($msglen$i)) + 7|0); //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$106>>0] = $hi$i$0$off0; //@line 169 "c_src/crypto_hash/blake512/ref/hash.c"
 $107 = (_bitshift64Lshr(($57|0),($58|0),56)|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $108 = tempRet0; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $109 = $107&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $110 = ((($msglen$i)) + 8|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$110>>0] = $109; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $111 = (_bitshift64Lshr(($57|0),($58|0),48)|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $112 = tempRet0; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $113 = $111&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $114 = ((($msglen$i)) + 9|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$114>>0] = $113; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $115 = (_bitshift64Lshr(($57|0),($58|0),40)|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $116 = tempRet0; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $117 = $115&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $118 = ((($msglen$i)) + 10|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$118>>0] = $117; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $119 = $58&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $120 = ((($msglen$i)) + 11|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$120>>0] = $119; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $121 = $57 >>> 24; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $122 = $121&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $123 = ((($msglen$i)) + 12|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$123>>0] = $122; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $124 = $57 >>> 16; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $125 = $124&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $126 = ((($msglen$i)) + 13|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$126>>0] = $125; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $127 = $57 >>> 8; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $128 = $127&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $129 = ((($msglen$i)) + 14|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$129>>0] = $128; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $130 = $57&255; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $131 = ((($msglen$i)) + 15|0); //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$131>>0] = $130; //@line 170 "c_src/crypto_hash/blake512/ref/hash.c"
 $132 = ($54|0)==(888); //@line 172 "c_src/crypto_hash/blake512/ref/hash.c"
 if ($132) {
  $133 = (_i64Add(($50|0),($53|0),-8,-1)|0); //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  $134 = tempRet0; //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  $135 = $44; //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  $136 = $135; //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$136>>2] = $133; //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  $137 = (($135) + 4)|0; //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  $138 = $137; //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$138>>2] = $134; //@line 173 "c_src/crypto_hash/blake512/ref/hash.c"
  _blake512_update($S,$oo$i,8,0); //@line 174 "c_src/crypto_hash/blake512/ref/hash.c"
  $139 = $44; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
  $140 = $139; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
  $141 = HEAP32[$140>>2]|0; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
  $142 = (($139) + 4)|0; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
  $143 = $142; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
  $144 = HEAP32[$143>>2]|0; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
  $189 = $141;$190 = $144;
 } else {
  $145 = ($54|0)<(888); //@line 177 "c_src/crypto_hash/blake512/ref/hash.c"
  if ($145) {
   $146 = ($54|0)==(0); //@line 178 "c_src/crypto_hash/blake512/ref/hash.c"
   if ($146) {
    HEAP32[$41>>2] = 1; //@line 178 "c_src/crypto_hash/blake512/ref/hash.c"
   }
   $147 = (888 - ($54))|0; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $148 = ($147|0)<(0); //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $149 = $148 << 31 >> 31; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $150 = (_i64Subtract(($50|0),($53|0),($147|0),($149|0))|0); //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $151 = tempRet0; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $152 = $44; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $153 = $152; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$153>>2] = $150; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $154 = (($152) + 4)|0; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   $155 = $154; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$155>>2] = $151; //@line 179 "c_src/crypto_hash/blake512/ref/hash.c"
   _blake512_update($S,2095,$147,$149); //@line 180 "c_src/crypto_hash/blake512/ref/hash.c"
  } else {
   $156 = (1024 - ($54))|0; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $157 = ($156|0)<(0); //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $158 = $157 << 31 >> 31; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $159 = (_i64Subtract(($50|0),($53|0),($156|0),($158|0))|0); //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $160 = tempRet0; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $161 = $44; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $162 = $161; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$162>>2] = $159; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $163 = (($161) + 4)|0; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   $164 = $163; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$164>>2] = $160; //@line 183 "c_src/crypto_hash/blake512/ref/hash.c"
   _blake512_update($S,2095,$156,$158); //@line 184 "c_src/crypto_hash/blake512/ref/hash.c"
   $165 = $44; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $166 = $165; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $167 = HEAP32[$166>>2]|0; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $168 = (($165) + 4)|0; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $169 = $168; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $170 = HEAP32[$169>>2]|0; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $171 = (_i64Add(($167|0),($170|0),-888,-1)|0); //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $172 = tempRet0; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $173 = $44; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $174 = $173; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$174>>2] = $171; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $175 = (($173) + 4)|0; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   $176 = $175; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$176>>2] = $172; //@line 185 "c_src/crypto_hash/blake512/ref/hash.c"
   _blake512_update($S,(2096),888,0); //@line 186 "c_src/crypto_hash/blake512/ref/hash.c"
   HEAP32[$41>>2] = 1; //@line 187 "c_src/crypto_hash/blake512/ref/hash.c"
  }
  _blake512_update($S,$zo$i,8,0); //@line 189 "c_src/crypto_hash/blake512/ref/hash.c"
  $177 = $44; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $178 = $177; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $179 = HEAP32[$178>>2]|0; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $180 = (($177) + 4)|0; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $181 = $180; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $182 = HEAP32[$181>>2]|0; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $183 = (_i64Add(($179|0),($182|0),-8,-1)|0); //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $184 = tempRet0; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $185 = $44; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $186 = $185; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$186>>2] = $183; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $187 = (($185) + 4)|0; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $188 = $187; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  HEAP32[$188>>2] = $184; //@line 190 "c_src/crypto_hash/blake512/ref/hash.c"
  $189 = $183;$190 = $184;
 }
 $191 = (_i64Add(($189|0),($190|0),-128,-1)|0); //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 $192 = tempRet0; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 $193 = $44; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 $194 = $193; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$194>>2] = $191; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 $195 = (($193) + 4)|0; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 $196 = $195; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP32[$196>>2] = $192; //@line 192 "c_src/crypto_hash/blake512/ref/hash.c"
 _blake512_update($S,$msglen$i,128,0); //@line 193 "c_src/crypto_hash/blake512/ref/hash.c"
 $197 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $198 = $197; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $199 = HEAP32[$198>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $200 = (($197) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $201 = $200; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $202 = HEAP32[$201>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $203 = (_bitshift64Lshr(($199|0),($202|0),56)|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $204 = tempRet0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $205 = $203&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$out>>0] = $205; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $206 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $207 = $206; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $208 = HEAP32[$207>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $209 = (($206) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $210 = $209; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $211 = HEAP32[$210>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $212 = (_bitshift64Lshr(($208|0),($211|0),48)|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $213 = tempRet0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $214 = $212&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $215 = ((($out)) + 1|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$215>>0] = $214; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $216 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $217 = $216; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $218 = HEAP32[$217>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $219 = (($216) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $220 = $219; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $221 = HEAP32[$220>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $222 = (_bitshift64Lshr(($218|0),($221|0),40)|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $223 = tempRet0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $224 = $222&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $225 = ((($out)) + 2|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$225>>0] = $224; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $226 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $227 = $226; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $228 = HEAP32[$227>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $229 = (($226) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $230 = $229; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $231 = HEAP32[$230>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $232 = $231&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $233 = ((($out)) + 3|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$233>>0] = $232; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $234 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $235 = $234; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $236 = HEAP32[$235>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $237 = (($234) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $238 = $237; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $239 = HEAP32[$238>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $240 = $236 >>> 24; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $241 = $240&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $242 = ((($out)) + 4|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$242>>0] = $241; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $243 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $244 = $243; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $245 = HEAP32[$244>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $246 = (($243) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $247 = $246; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $248 = HEAP32[$247>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $249 = $245 >>> 16; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $250 = $249&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $251 = ((($out)) + 5|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$251>>0] = $250; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $252 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $253 = $252; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $254 = HEAP32[$253>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $255 = (($252) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $256 = $255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $257 = HEAP32[$256>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $258 = $254 >>> 8; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $259 = $258&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $260 = ((($out)) + 6|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$260>>0] = $259; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $261 = $S; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $262 = $261; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $263 = HEAP32[$262>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $264 = (($261) + 4)|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $265 = $264; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $266 = HEAP32[$265>>2]|0; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $267 = $263&255; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $268 = ((($out)) + 7|0); //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$268>>0] = $267; //@line 195 "c_src/crypto_hash/blake512/ref/hash.c"
 $269 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $270 = $269; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $271 = HEAP32[$270>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $272 = (($269) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $273 = $272; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $274 = HEAP32[$273>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $275 = (_bitshift64Lshr(($271|0),($274|0),56)|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $276 = tempRet0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $277 = $275&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $278 = ((($out)) + 8|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$278>>0] = $277; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $279 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $280 = $279; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $281 = HEAP32[$280>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $282 = (($279) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $283 = $282; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $284 = HEAP32[$283>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $285 = (_bitshift64Lshr(($281|0),($284|0),48)|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $286 = tempRet0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $287 = $285&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $288 = ((($out)) + 9|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$288>>0] = $287; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $289 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $290 = $289; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $291 = HEAP32[$290>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $292 = (($289) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $293 = $292; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $294 = HEAP32[$293>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $295 = (_bitshift64Lshr(($291|0),($294|0),40)|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $296 = tempRet0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $297 = $295&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $298 = ((($out)) + 10|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$298>>0] = $297; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $299 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $300 = $299; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $301 = HEAP32[$300>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $302 = (($299) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $303 = $302; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $304 = HEAP32[$303>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $305 = $304&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $306 = ((($out)) + 11|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$306>>0] = $305; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $307 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $308 = $307; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $309 = HEAP32[$308>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $310 = (($307) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $311 = $310; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $312 = HEAP32[$311>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $313 = $309 >>> 24; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $314 = $313&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $315 = ((($out)) + 12|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$315>>0] = $314; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $316 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $317 = $316; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $318 = HEAP32[$317>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $319 = (($316) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $320 = $319; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $321 = HEAP32[$320>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $322 = $318 >>> 16; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $323 = $322&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $324 = ((($out)) + 13|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$324>>0] = $323; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $325 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $326 = $325; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $327 = HEAP32[$326>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $328 = (($325) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $329 = $328; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $330 = HEAP32[$329>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $331 = $327 >>> 8; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $332 = $331&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $333 = ((($out)) + 14|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$333>>0] = $332; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $334 = $6; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $335 = $334; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $336 = HEAP32[$335>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $337 = (($334) + 4)|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $338 = $337; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $339 = HEAP32[$338>>2]|0; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $340 = $336&255; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $341 = ((($out)) + 15|0); //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$341>>0] = $340; //@line 196 "c_src/crypto_hash/blake512/ref/hash.c"
 $342 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $343 = $342; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $344 = HEAP32[$343>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $345 = (($342) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $346 = $345; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $347 = HEAP32[$346>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $348 = (_bitshift64Lshr(($344|0),($347|0),56)|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $349 = tempRet0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $350 = $348&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $351 = ((($out)) + 16|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$351>>0] = $350; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $352 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $353 = $352; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $354 = HEAP32[$353>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $355 = (($352) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $356 = $355; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $357 = HEAP32[$356>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $358 = (_bitshift64Lshr(($354|0),($357|0),48)|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $359 = tempRet0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $360 = $358&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $361 = ((($out)) + 17|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$361>>0] = $360; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $362 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $363 = $362; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $364 = HEAP32[$363>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $365 = (($362) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $366 = $365; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $367 = HEAP32[$366>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $368 = (_bitshift64Lshr(($364|0),($367|0),40)|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $369 = tempRet0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $370 = $368&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $371 = ((($out)) + 18|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$371>>0] = $370; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $372 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $373 = $372; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $374 = HEAP32[$373>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $375 = (($372) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $376 = $375; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $377 = HEAP32[$376>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $378 = $377&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $379 = ((($out)) + 19|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$379>>0] = $378; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $380 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $381 = $380; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $382 = HEAP32[$381>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $383 = (($380) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $384 = $383; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $385 = HEAP32[$384>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $386 = $382 >>> 24; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $387 = $386&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $388 = ((($out)) + 20|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$388>>0] = $387; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $389 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $390 = $389; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $391 = HEAP32[$390>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $392 = (($389) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $393 = $392; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $394 = HEAP32[$393>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $395 = $391 >>> 16; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $396 = $395&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $397 = ((($out)) + 21|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$397>>0] = $396; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $398 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $399 = $398; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $400 = HEAP32[$399>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $401 = (($398) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $402 = $401; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $403 = HEAP32[$402>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $404 = $400 >>> 8; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $405 = $404&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $406 = ((($out)) + 22|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$406>>0] = $405; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $407 = $11; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $408 = $407; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $409 = HEAP32[$408>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $410 = (($407) + 4)|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $411 = $410; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $412 = HEAP32[$411>>2]|0; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $413 = $409&255; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $414 = ((($out)) + 23|0); //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$414>>0] = $413; //@line 197 "c_src/crypto_hash/blake512/ref/hash.c"
 $415 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $416 = $415; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $417 = HEAP32[$416>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $418 = (($415) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $419 = $418; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $420 = HEAP32[$419>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $421 = (_bitshift64Lshr(($417|0),($420|0),56)|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $422 = tempRet0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $423 = $421&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $424 = ((($out)) + 24|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$424>>0] = $423; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $425 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $426 = $425; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $427 = HEAP32[$426>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $428 = (($425) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $429 = $428; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $430 = HEAP32[$429>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $431 = (_bitshift64Lshr(($427|0),($430|0),48)|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $432 = tempRet0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $433 = $431&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $434 = ((($out)) + 25|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$434>>0] = $433; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $435 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $436 = $435; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $437 = HEAP32[$436>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $438 = (($435) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $439 = $438; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $440 = HEAP32[$439>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $441 = (_bitshift64Lshr(($437|0),($440|0),40)|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $442 = tempRet0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $443 = $441&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $444 = ((($out)) + 26|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$444>>0] = $443; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $445 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $446 = $445; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $447 = HEAP32[$446>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $448 = (($445) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $449 = $448; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $450 = HEAP32[$449>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $451 = $450&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $452 = ((($out)) + 27|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$452>>0] = $451; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $453 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $454 = $453; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $455 = HEAP32[$454>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $456 = (($453) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $457 = $456; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $458 = HEAP32[$457>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $459 = $455 >>> 24; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $460 = $459&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $461 = ((($out)) + 28|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$461>>0] = $460; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $462 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $463 = $462; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $464 = HEAP32[$463>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $465 = (($462) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $466 = $465; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $467 = HEAP32[$466>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $468 = $464 >>> 16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $469 = $468&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $470 = ((($out)) + 29|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$470>>0] = $469; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $471 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $472 = $471; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $473 = HEAP32[$472>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $474 = (($471) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $475 = $474; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $476 = HEAP32[$475>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $477 = $473 >>> 8; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $478 = $477&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $479 = ((($out)) + 30|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$479>>0] = $478; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $480 = $16; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $481 = $480; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $482 = HEAP32[$481>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $483 = (($480) + 4)|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $484 = $483; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $485 = HEAP32[$484>>2]|0; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $486 = $482&255; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $487 = ((($out)) + 31|0); //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$487>>0] = $486; //@line 198 "c_src/crypto_hash/blake512/ref/hash.c"
 $488 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $489 = $488; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $490 = HEAP32[$489>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $491 = (($488) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $492 = $491; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $493 = HEAP32[$492>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $494 = (_bitshift64Lshr(($490|0),($493|0),56)|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $495 = tempRet0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $496 = $494&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $497 = ((($out)) + 32|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$497>>0] = $496; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $498 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $499 = $498; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $500 = HEAP32[$499>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $501 = (($498) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $502 = $501; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $503 = HEAP32[$502>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $504 = (_bitshift64Lshr(($500|0),($503|0),48)|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $505 = tempRet0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $506 = $504&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $507 = ((($out)) + 33|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$507>>0] = $506; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $508 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $509 = $508; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $510 = HEAP32[$509>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $511 = (($508) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $512 = $511; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $513 = HEAP32[$512>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $514 = (_bitshift64Lshr(($510|0),($513|0),40)|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $515 = tempRet0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $516 = $514&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $517 = ((($out)) + 34|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$517>>0] = $516; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $518 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $519 = $518; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $520 = HEAP32[$519>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $521 = (($518) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $522 = $521; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $523 = HEAP32[$522>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $524 = $523&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $525 = ((($out)) + 35|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$525>>0] = $524; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $526 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $527 = $526; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $528 = HEAP32[$527>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $529 = (($526) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $530 = $529; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $531 = HEAP32[$530>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $532 = $528 >>> 24; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $533 = $532&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $534 = ((($out)) + 36|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$534>>0] = $533; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $535 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $536 = $535; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $537 = HEAP32[$536>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $538 = (($535) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $539 = $538; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $540 = HEAP32[$539>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $541 = $537 >>> 16; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $542 = $541&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $543 = ((($out)) + 37|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$543>>0] = $542; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $544 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $545 = $544; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $546 = HEAP32[$545>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $547 = (($544) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $548 = $547; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $549 = HEAP32[$548>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $550 = $546 >>> 8; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $551 = $550&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $552 = ((($out)) + 38|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$552>>0] = $551; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $553 = $21; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $554 = $553; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $555 = HEAP32[$554>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $556 = (($553) + 4)|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $557 = $556; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $558 = HEAP32[$557>>2]|0; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $559 = $555&255; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $560 = ((($out)) + 39|0); //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$560>>0] = $559; //@line 199 "c_src/crypto_hash/blake512/ref/hash.c"
 $561 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $562 = $561; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $563 = HEAP32[$562>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $564 = (($561) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $565 = $564; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $566 = HEAP32[$565>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $567 = (_bitshift64Lshr(($563|0),($566|0),56)|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $568 = tempRet0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $569 = $567&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $570 = ((($out)) + 40|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$570>>0] = $569; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $571 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $572 = $571; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $573 = HEAP32[$572>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $574 = (($571) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $575 = $574; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $576 = HEAP32[$575>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $577 = (_bitshift64Lshr(($573|0),($576|0),48)|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $578 = tempRet0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $579 = $577&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $580 = ((($out)) + 41|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$580>>0] = $579; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $581 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $582 = $581; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $583 = HEAP32[$582>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $584 = (($581) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $585 = $584; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $586 = HEAP32[$585>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $587 = (_bitshift64Lshr(($583|0),($586|0),40)|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $588 = tempRet0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $589 = $587&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $590 = ((($out)) + 42|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$590>>0] = $589; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $591 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $592 = $591; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $593 = HEAP32[$592>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $594 = (($591) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $595 = $594; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $596 = HEAP32[$595>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $597 = $596&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $598 = ((($out)) + 43|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$598>>0] = $597; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $599 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $600 = $599; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $601 = HEAP32[$600>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $602 = (($599) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $603 = $602; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $604 = HEAP32[$603>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $605 = $601 >>> 24; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $606 = $605&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $607 = ((($out)) + 44|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$607>>0] = $606; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $608 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $609 = $608; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $610 = HEAP32[$609>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $611 = (($608) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $612 = $611; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $613 = HEAP32[$612>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $614 = $610 >>> 16; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $615 = $614&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $616 = ((($out)) + 45|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$616>>0] = $615; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $617 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $618 = $617; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $619 = HEAP32[$618>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $620 = (($617) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $621 = $620; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $622 = HEAP32[$621>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $623 = $619 >>> 8; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $624 = $623&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $625 = ((($out)) + 46|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$625>>0] = $624; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $626 = $26; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $627 = $626; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $628 = HEAP32[$627>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $629 = (($626) + 4)|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $630 = $629; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $631 = HEAP32[$630>>2]|0; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $632 = $628&255; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $633 = ((($out)) + 47|0); //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$633>>0] = $632; //@line 200 "c_src/crypto_hash/blake512/ref/hash.c"
 $634 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $635 = $634; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $636 = HEAP32[$635>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $637 = (($634) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $638 = $637; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $639 = HEAP32[$638>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $640 = (_bitshift64Lshr(($636|0),($639|0),56)|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $641 = tempRet0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $642 = $640&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $643 = ((($out)) + 48|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$643>>0] = $642; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $644 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $645 = $644; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $646 = HEAP32[$645>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $647 = (($644) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $648 = $647; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $649 = HEAP32[$648>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $650 = (_bitshift64Lshr(($646|0),($649|0),48)|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $651 = tempRet0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $652 = $650&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $653 = ((($out)) + 49|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$653>>0] = $652; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $654 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $655 = $654; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $656 = HEAP32[$655>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $657 = (($654) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $658 = $657; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $659 = HEAP32[$658>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $660 = (_bitshift64Lshr(($656|0),($659|0),40)|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $661 = tempRet0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $662 = $660&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $663 = ((($out)) + 50|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$663>>0] = $662; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $664 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $665 = $664; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $666 = HEAP32[$665>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $667 = (($664) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $668 = $667; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $669 = HEAP32[$668>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $670 = $669&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $671 = ((($out)) + 51|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$671>>0] = $670; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $672 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $673 = $672; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $674 = HEAP32[$673>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $675 = (($672) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $676 = $675; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $677 = HEAP32[$676>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $678 = $674 >>> 24; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $679 = $678&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $680 = ((($out)) + 52|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$680>>0] = $679; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $681 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $682 = $681; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $683 = HEAP32[$682>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $684 = (($681) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $685 = $684; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $686 = HEAP32[$685>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $687 = $683 >>> 16; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $688 = $687&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $689 = ((($out)) + 53|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$689>>0] = $688; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $690 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $691 = $690; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $692 = HEAP32[$691>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $693 = (($690) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $694 = $693; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $695 = HEAP32[$694>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $696 = $692 >>> 8; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $697 = $696&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $698 = ((($out)) + 54|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$698>>0] = $697; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $699 = $31; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $700 = $699; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $701 = HEAP32[$700>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $702 = (($699) + 4)|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $703 = $702; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $704 = HEAP32[$703>>2]|0; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $705 = $701&255; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $706 = ((($out)) + 55|0); //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$706>>0] = $705; //@line 201 "c_src/crypto_hash/blake512/ref/hash.c"
 $707 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $708 = $707; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $709 = HEAP32[$708>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $710 = (($707) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $711 = $710; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $712 = HEAP32[$711>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $713 = (_bitshift64Lshr(($709|0),($712|0),56)|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $714 = tempRet0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $715 = $713&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $716 = ((($out)) + 56|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$716>>0] = $715; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $717 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $718 = $717; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $719 = HEAP32[$718>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $720 = (($717) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $721 = $720; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $722 = HEAP32[$721>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $723 = (_bitshift64Lshr(($719|0),($722|0),48)|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $724 = tempRet0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $725 = $723&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $726 = ((($out)) + 57|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$726>>0] = $725; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $727 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $728 = $727; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $729 = HEAP32[$728>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $730 = (($727) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $731 = $730; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $732 = HEAP32[$731>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $733 = (_bitshift64Lshr(($729|0),($732|0),40)|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $734 = tempRet0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $735 = $733&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $736 = ((($out)) + 58|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$736>>0] = $735; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $737 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $738 = $737; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $739 = HEAP32[$738>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $740 = (($737) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $741 = $740; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $742 = HEAP32[$741>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $743 = $742&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $744 = ((($out)) + 59|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$744>>0] = $743; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $745 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $746 = $745; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $747 = HEAP32[$746>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $748 = (($745) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $749 = $748; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $750 = HEAP32[$749>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $751 = $747 >>> 24; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $752 = $751&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $753 = ((($out)) + 60|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$753>>0] = $752; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $754 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $755 = $754; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $756 = HEAP32[$755>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $757 = (($754) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $758 = $757; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $759 = HEAP32[$758>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $760 = $756 >>> 16; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $761 = $760&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $762 = ((($out)) + 61|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$762>>0] = $761; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $763 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $764 = $763; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $765 = HEAP32[$764>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $766 = (($763) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $767 = $766; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $768 = HEAP32[$767>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $769 = $765 >>> 8; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $770 = $769&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $771 = ((($out)) + 62|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$771>>0] = $770; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $772 = $36; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $773 = $772; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $774 = HEAP32[$773>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $775 = (($772) + 4)|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $776 = $775; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $777 = HEAP32[$776>>2]|0; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $778 = $774&255; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 $779 = ((($out)) + 63|0); //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 HEAP8[$779>>0] = $778; //@line 202 "c_src/crypto_hash/blake512/ref/hash.c"
 STACKTOP = sp;return;
}
function _hash_2n_n_mask($out,$in,$mask) {
 $out = $out|0;
 $in = $in|0;
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $buf = 0, $exitcond = 0, $exitcond2 = 0, $exitcond3 = 0, $exitcond4 = 0, $storemerge = 0, $storemerge$i = 0, $storemerge1$i = 0, $storemerge2$i = 0, $x$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $x$i = sp + 64|0;
 $buf = sp;
 $storemerge = 0;
 while(1) {
  $exitcond4 = ($storemerge|0)==(64); //@line 54 "c_src/crypto_sign/sphincs256/ref/hash.c"
  if ($exitcond4) {
   break;
  }
  $0 = (($in) + ($storemerge)|0); //@line 55 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $1 = HEAP8[$0>>0]|0; //@line 55 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $2 = (($mask) + ($storemerge)|0); //@line 55 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $3 = HEAP8[$2>>0]|0; //@line 55 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $4 = $1 ^ $3; //@line 55 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $5 = (($buf) + ($storemerge)|0); //@line 55 "c_src/crypto_sign/sphincs256/ref/hash.c"
  HEAP8[$5>>0] = $4; //@line 55 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $6 = (($storemerge) + 1)|0; //@line 54 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $storemerge = $6;
 }
 $storemerge$i = 0;
 while(1) {
  $exitcond3 = ($storemerge$i|0)==(32); //@line 35 "c_src/crypto_sign/sphincs256/ref/hash.c"
  if ($exitcond3) {
   break;
  }
  $7 = (($buf) + ($storemerge$i)|0); //@line 37 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $8 = HEAP8[$7>>0]|0; //@line 37 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $9 = (($x$i) + ($storemerge$i)|0); //@line 37 "c_src/crypto_sign/sphincs256/ref/hash.c"
  HEAP8[$9>>0] = $8; //@line 37 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $10 = (2224 + ($storemerge$i)|0); //@line 38 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $11 = HEAP8[$10>>0]|0; //@line 38 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $12 = (($storemerge$i) + 32)|0; //@line 38 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $13 = (($x$i) + ($12)|0); //@line 38 "c_src/crypto_sign/sphincs256/ref/hash.c"
  HEAP8[$13>>0] = $11; //@line 38 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $14 = (($storemerge$i) + 1)|0; //@line 35 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $storemerge$i = $14;
 }
 _chacha_permute($x$i,$x$i); //@line 40 "c_src/crypto_sign/sphincs256/ref/hash.c"
 $storemerge1$i = 0;
 while(1) {
  $exitcond2 = ($storemerge1$i|0)==(32); //@line 41 "c_src/crypto_sign/sphincs256/ref/hash.c"
  if ($exitcond2) {
   break;
  }
  $15 = (($x$i) + ($storemerge1$i)|0); //@line 42 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $16 = HEAP8[$15>>0]|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $17 = (($storemerge1$i) + 32)|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $18 = (($buf) + ($17)|0); //@line 42 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $19 = HEAP8[$18>>0]|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $20 = $16 ^ $19; //@line 42 "c_src/crypto_sign/sphincs256/ref/hash.c"
  HEAP8[$15>>0] = $20; //@line 42 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $21 = (($storemerge1$i) + 1)|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $storemerge1$i = $21;
 }
 _chacha_permute($x$i,$x$i); //@line 43 "c_src/crypto_sign/sphincs256/ref/hash.c"
 $storemerge2$i = 0;
 while(1) {
  $exitcond = ($storemerge2$i|0)==(32); //@line 44 "c_src/crypto_sign/sphincs256/ref/hash.c"
  if ($exitcond) {
   break;
  }
  $22 = (($x$i) + ($storemerge2$i)|0); //@line 45 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $23 = HEAP8[$22>>0]|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $24 = (($out) + ($storemerge2$i)|0); //@line 45 "c_src/crypto_sign/sphincs256/ref/hash.c"
  HEAP8[$24>>0] = $23; //@line 45 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $25 = (($storemerge2$i) + 1)|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $storemerge2$i = $25;
 }
 STACKTOP = sp;return;
}
function _chacha_permute($out,$in) {
 $out = $out|0;
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0;
 var $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $exitcond = 0, $exitcond4 = 0, $storemerge = 0, $storemerge1 = 0, $storemerge2 = 0, $x = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0;
 $x = sp;
 $storemerge = 0;
 while(1) {
  $exitcond4 = ($storemerge|0)==(16); //@line 28 "c_src/crypto_sign/sphincs256/ref/permute.c"
  if ($exitcond4) {
   break;
  }
  $15 = $storemerge << 2; //@line 30 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $16 = $15 | 3; //@line 30 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $17 = (($in) + ($16)|0); //@line 30 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $18 = HEAP8[$17>>0]|0; //@line 30 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $19 = $18&255; //@line 30 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $20 = (($x) + ($storemerge<<2)|0); //@line 30 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $21 = $19 << 8; //@line 31 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $22 = $15 | 2; //@line 32 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $23 = (($in) + ($22)|0); //@line 32 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $24 = HEAP8[$23>>0]|0; //@line 32 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $25 = $24&255; //@line 32 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $26 = $21 | $25; //@line 32 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $27 = $26 << 8; //@line 33 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $28 = $15 | 1; //@line 34 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $29 = (($in) + ($28)|0); //@line 34 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $30 = HEAP8[$29>>0]|0; //@line 34 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $31 = $30&255; //@line 34 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $32 = $27 | $31; //@line 34 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $33 = $32 << 8; //@line 35 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $34 = (($in) + ($15)|0); //@line 36 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $35 = HEAP8[$34>>0]|0; //@line 36 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $36 = $35&255; //@line 36 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $37 = $33 | $36; //@line 36 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$20>>2] = $37; //@line 36 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $38 = (($storemerge) + 1)|0; //@line 28 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $storemerge = $38;
 }
 $0 = ((($x)) + 16|0); //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $1 = ((($x)) + 48|0); //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $2 = ((($x)) + 32|0); //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $3 = ((($x)) + 4|0); //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $4 = ((($x)) + 20|0); //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $5 = ((($x)) + 52|0); //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $6 = ((($x)) + 36|0); //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $7 = ((($x)) + 8|0); //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $8 = ((($x)) + 24|0); //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $9 = ((($x)) + 56|0); //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $10 = ((($x)) + 40|0); //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $11 = ((($x)) + 12|0); //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $12 = ((($x)) + 28|0); //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $13 = ((($x)) + 60|0); //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $14 = ((($x)) + 44|0); //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
 $storemerge1 = 12;
 while(1) {
  $39 = ($storemerge1|0)>(0); //@line 39 "c_src/crypto_sign/sphincs256/ref/permute.c"
  if (!($39)) {
   $storemerge2 = 0;
   break;
  }
  $40 = HEAP32[$x>>2]|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $41 = HEAP32[$0>>2]|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $42 = (($40) + ($41))|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $43 = HEAP32[$1>>2]|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $44 = $43 ^ $42; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $45 = $44 << 16; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $46 = $44 >>> 16; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $47 = $45 | $46; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $48 = HEAP32[$2>>2]|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $49 = (($48) + ($47))|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $50 = $41 ^ $49; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $51 = $50 << 12; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $52 = $50 >>> 20; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $53 = $51 | $52; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $54 = (($42) + ($53))|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$x>>2] = $54; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $55 = $47 ^ $54; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $56 = $55 << 8; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $57 = $55 >>> 24; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $58 = $56 | $57; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$1>>2] = $58; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $59 = (($49) + ($58))|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$2>>2] = $59; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $60 = $53 ^ $59; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $61 = $60 << 7; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $62 = $60 >>> 25; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $63 = $61 | $62; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$0>>2] = $63; //@line 41 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $64 = HEAP32[$3>>2]|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $65 = HEAP32[$4>>2]|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $66 = (($64) + ($65))|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $67 = HEAP32[$5>>2]|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $68 = $67 ^ $66; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $69 = $68 << 16; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $70 = $68 >>> 16; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $71 = $69 | $70; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $72 = HEAP32[$6>>2]|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $73 = (($72) + ($71))|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $74 = $65 ^ $73; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $75 = $74 << 12; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $76 = $74 >>> 20; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $77 = $75 | $76; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $78 = (($66) + ($77))|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$3>>2] = $78; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $79 = $71 ^ $78; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $80 = $79 << 8; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $81 = $79 >>> 24; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $82 = $80 | $81; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$5>>2] = $82; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $83 = (($73) + ($82))|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$6>>2] = $83; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $84 = $77 ^ $83; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $85 = $84 << 7; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $86 = $84 >>> 25; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $87 = $85 | $86; //@line 42 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $88 = HEAP32[$7>>2]|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $89 = HEAP32[$8>>2]|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $90 = (($88) + ($89))|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $91 = HEAP32[$9>>2]|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $92 = $91 ^ $90; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $93 = $92 << 16; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $94 = $92 >>> 16; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $95 = $93 | $94; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $96 = HEAP32[$10>>2]|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $97 = (($96) + ($95))|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $98 = $89 ^ $97; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $99 = $98 << 12; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $100 = $98 >>> 20; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $101 = $99 | $100; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $102 = (($90) + ($101))|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$7>>2] = $102; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $103 = $95 ^ $102; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $104 = $103 << 8; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $105 = $103 >>> 24; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $106 = $104 | $105; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$9>>2] = $106; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $107 = (($97) + ($106))|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $108 = $101 ^ $107; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $109 = $108 << 7; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $110 = $108 >>> 25; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $111 = $109 | $110; //@line 43 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $112 = HEAP32[$11>>2]|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $113 = HEAP32[$12>>2]|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $114 = (($112) + ($113))|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $115 = HEAP32[$13>>2]|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $116 = $115 ^ $114; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $117 = $116 << 16; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $118 = $116 >>> 16; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $119 = $117 | $118; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $120 = HEAP32[$14>>2]|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $121 = (($120) + ($119))|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $122 = $113 ^ $121; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $123 = $122 << 12; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $124 = $122 >>> 20; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $125 = $123 | $124; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $126 = (($114) + ($125))|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$11>>2] = $126; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $127 = $119 ^ $126; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $128 = $127 << 8; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $129 = $127 >>> 24; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $130 = $128 | $129; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $131 = (($121) + ($130))|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $132 = $125 ^ $131; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $133 = $132 << 7; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $134 = $132 >>> 25; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $135 = $133 | $134; //@line 44 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $136 = HEAP32[$x>>2]|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $137 = (($136) + ($87))|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $138 = $130 ^ $137; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $139 = $138 << 16; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $140 = $138 >>> 16; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $141 = $139 | $140; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $142 = (($107) + ($141))|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $143 = $87 ^ $142; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $144 = $143 << 12; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $145 = $143 >>> 20; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $146 = $144 | $145; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $147 = (($137) + ($146))|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$x>>2] = $147; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $148 = $141 ^ $147; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $149 = $148 << 8; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $150 = $148 >>> 24; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $151 = $149 | $150; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$13>>2] = $151; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $152 = (($142) + ($151))|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$10>>2] = $152; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $153 = $146 ^ $152; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $154 = $153 << 7; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $155 = $153 >>> 25; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $156 = $154 | $155; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$4>>2] = $156; //@line 45 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $157 = HEAP32[$3>>2]|0; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $158 = (($157) + ($111))|0; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $159 = HEAP32[$1>>2]|0; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $160 = $159 ^ $158; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $161 = $160 << 16; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $162 = $160 >>> 16; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $163 = $161 | $162; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $164 = (($131) + ($163))|0; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $165 = $111 ^ $164; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $166 = $165 << 12; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $167 = $165 >>> 20; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $168 = $166 | $167; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $169 = (($158) + ($168))|0; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$3>>2] = $169; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $170 = $163 ^ $169; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $171 = $170 << 8; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $172 = $170 >>> 24; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $173 = $171 | $172; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$1>>2] = $173; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $174 = (($164) + ($173))|0; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$14>>2] = $174; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $175 = $168 ^ $174; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $176 = $175 << 7; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $177 = $175 >>> 25; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $178 = $176 | $177; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$8>>2] = $178; //@line 46 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $179 = HEAP32[$7>>2]|0; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $180 = (($179) + ($135))|0; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $181 = HEAP32[$5>>2]|0; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $182 = $181 ^ $180; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $183 = $182 << 16; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $184 = $182 >>> 16; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $185 = $183 | $184; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $186 = HEAP32[$2>>2]|0; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $187 = (($186) + ($185))|0; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $188 = $135 ^ $187; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $189 = $188 << 12; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $190 = $188 >>> 20; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $191 = $189 | $190; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $192 = (($180) + ($191))|0; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$7>>2] = $192; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $193 = $185 ^ $192; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $194 = $193 << 8; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $195 = $193 >>> 24; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $196 = $194 | $195; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$5>>2] = $196; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $197 = (($187) + ($196))|0; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$2>>2] = $197; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $198 = $191 ^ $197; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $199 = $198 << 7; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $200 = $198 >>> 25; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $201 = $199 | $200; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$12>>2] = $201; //@line 47 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $202 = HEAP32[$11>>2]|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $203 = HEAP32[$0>>2]|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $204 = (($202) + ($203))|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $205 = HEAP32[$9>>2]|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $206 = $205 ^ $204; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $207 = $206 << 16; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $208 = $206 >>> 16; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $209 = $207 | $208; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $210 = HEAP32[$6>>2]|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $211 = (($210) + ($209))|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $212 = $203 ^ $211; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $213 = $212 << 12; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $214 = $212 >>> 20; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $215 = $213 | $214; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $216 = (($204) + ($215))|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$11>>2] = $216; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $217 = $209 ^ $216; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $218 = $217 << 8; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $219 = $217 >>> 24; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $220 = $218 | $219; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$9>>2] = $220; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $221 = (($211) + ($220))|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$6>>2] = $221; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $222 = $215 ^ $221; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $223 = $222 << 7; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $224 = $222 >>> 25; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $225 = $223 | $224; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP32[$0>>2] = $225; //@line 48 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $226 = (($storemerge1) + -2)|0; //@line 39 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $storemerge1 = $226;
 }
 while(1) {
  $exitcond = ($storemerge2|0)==(16); //@line 52 "c_src/crypto_sign/sphincs256/ref/permute.c"
  if ($exitcond) {
   break;
  }
  $227 = (($x) + ($storemerge2<<2)|0); //@line 54 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $228 = HEAP32[$227>>2]|0; //@line 54 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $229 = $228&255; //@line 54 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $230 = $storemerge2 << 2; //@line 54 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $231 = (($out) + ($230)|0); //@line 54 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP8[$231>>0] = $229; //@line 54 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $232 = $228 >>> 8; //@line 55 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $233 = $232&255; //@line 55 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $234 = $230 | 1; //@line 55 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $235 = (($out) + ($234)|0); //@line 55 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP8[$235>>0] = $233; //@line 55 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $236 = $228 >>> 16; //@line 56 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $237 = $236&255; //@line 56 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $238 = $230 | 2; //@line 56 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $239 = (($out) + ($238)|0); //@line 56 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP8[$239>>0] = $237; //@line 56 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $240 = $228 >>> 24; //@line 57 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $241 = $240&255; //@line 57 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $242 = $230 | 3; //@line 57 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $243 = (($out) + ($242)|0); //@line 57 "c_src/crypto_sign/sphincs256/ref/permute.c"
  HEAP8[$243>>0] = $241; //@line 57 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $244 = (($storemerge2) + 1)|0; //@line 52 "c_src/crypto_sign/sphincs256/ref/permute.c"
  $storemerge2 = $244;
 }
 STACKTOP = sp;return; //@line 59 "c_src/crypto_sign/sphincs256/ref/permute.c"
}
function _prg($r,$0,$1,$key) {
 $r = $r|0;
 $0 = $0|0;
 $1 = $1|0;
 $key = $key|0;
 var $$0 = 0, $$sroa$02$0 = 0, $$sroa$03$0 = 0, $$sum4$i$i$i = 0, $$sum5$i$i$i = 0, $$sum6$i$i$i = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0;
 var $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0;
 var $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0;
 var $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0;
 var $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0;
 var $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0;
 var $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0;
 var $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0;
 var $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0;
 var $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0;
 var $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0;
 var $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0;
 var $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0;
 var $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0;
 var $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0;
 var $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0;
 var $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0;
 var $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0;
 var $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0;
 var $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $ctx$i = 0;
 var $exitcond = 0, $exitcond11 = 0, $exitcond12 = 0, $exitcond13 = 0, $exitcond14 = 0, $output$i$i = 0, $storemerge$i$i$i = 0, $storemerge$i1$i = 0, $storemerge1$i$i = 0, $storemerge1$i$i$i = 0, $storemerge2$i$i$i = 0, $storemerge3$i$i$i = 0, $x$i$i$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 192|0;
 $x$i$i$i = sp + 64|0;
 $output$i$i = sp + 128|0;
 $ctx$i = sp;
 $2 = $r; //@line 13 "c_src/crypto_sign/sphincs256/ref/prg.c"
 $3 = HEAP8[$key>>0]|0; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $4 = $3&255; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $5 = ((($key)) + 1|0); //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $6 = HEAP8[$5>>0]|0; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $7 = $6&255; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $8 = $7 << 8; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $9 = $4 | $8; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $10 = ((($key)) + 2|0); //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $11 = HEAP8[$10>>0]|0; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $12 = $11&255; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $13 = $12 << 16; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $14 = $9 | $13; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $15 = ((($key)) + 3|0); //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $16 = HEAP8[$15>>0]|0; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $17 = $16&255; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $18 = $17 << 24; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $19 = $14 | $18; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $20 = ((($ctx$i)) + 16|0); //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$20>>2] = $19; //@line 52 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $21 = ((($key)) + 4|0); //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $22 = HEAP8[$21>>0]|0; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $23 = $22&255; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $24 = ((($key)) + 5|0); //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $25 = HEAP8[$24>>0]|0; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $26 = $25&255; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $27 = $26 << 8; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $28 = $23 | $27; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $29 = ((($key)) + 6|0); //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $30 = HEAP8[$29>>0]|0; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $31 = $30&255; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $32 = $31 << 16; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $33 = $28 | $32; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $34 = ((($key)) + 7|0); //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $35 = HEAP8[$34>>0]|0; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $36 = $35&255; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $37 = $36 << 24; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $38 = $33 | $37; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $39 = ((($ctx$i)) + 20|0); //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$39>>2] = $38; //@line 53 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $40 = ((($key)) + 8|0); //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $41 = HEAP8[$40>>0]|0; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $42 = $41&255; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $43 = ((($key)) + 9|0); //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $44 = HEAP8[$43>>0]|0; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $45 = $44&255; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $46 = $45 << 8; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $47 = $42 | $46; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $48 = ((($key)) + 10|0); //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $49 = HEAP8[$48>>0]|0; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $50 = $49&255; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $51 = $50 << 16; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $52 = $47 | $51; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $53 = ((($key)) + 11|0); //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $54 = HEAP8[$53>>0]|0; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $55 = $54&255; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $56 = $55 << 24; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $57 = $52 | $56; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $58 = ((($ctx$i)) + 24|0); //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$58>>2] = $57; //@line 54 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $59 = ((($key)) + 12|0); //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $60 = HEAP8[$59>>0]|0; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $61 = $60&255; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $62 = ((($key)) + 13|0); //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $63 = HEAP8[$62>>0]|0; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $64 = $63&255; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $65 = $64 << 8; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $66 = $61 | $65; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $67 = ((($key)) + 14|0); //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $68 = HEAP8[$67>>0]|0; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $69 = $68&255; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $70 = $69 << 16; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $71 = $66 | $70; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $72 = ((($key)) + 15|0); //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $73 = HEAP8[$72>>0]|0; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $74 = $73&255; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $75 = $74 << 24; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $76 = $71 | $75; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $77 = ((($ctx$i)) + 28|0); //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$77>>2] = $76; //@line 55 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $78 = ((($key)) + 16|0); //@line 57 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $79 = HEAP8[$78>>0]|0; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $80 = $79&255; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $81 = ((($78)) + 1|0); //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $82 = HEAP8[$81>>0]|0; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $83 = $82&255; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $84 = $83 << 8; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $85 = $80 | $84; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $86 = ((($78)) + 2|0); //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $87 = HEAP8[$86>>0]|0; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $88 = $87&255; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $89 = $88 << 16; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $90 = $85 | $89; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $91 = ((($78)) + 3|0); //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $92 = HEAP8[$91>>0]|0; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $93 = $92&255; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $94 = $93 << 24; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $95 = $90 | $94; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $96 = ((($ctx$i)) + 32|0); //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$96>>2] = $95; //@line 62 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $97 = ((($78)) + 4|0); //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $98 = HEAP8[$97>>0]|0; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $99 = $98&255; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $100 = ((($78)) + 5|0); //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $101 = HEAP8[$100>>0]|0; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $102 = $101&255; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $103 = $102 << 8; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $104 = $99 | $103; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $105 = ((($78)) + 6|0); //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $106 = HEAP8[$105>>0]|0; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $107 = $106&255; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $108 = $107 << 16; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $109 = $104 | $108; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $110 = ((($78)) + 7|0); //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $111 = HEAP8[$110>>0]|0; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $112 = $111&255; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $113 = $112 << 24; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $114 = $109 | $113; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $115 = ((($ctx$i)) + 36|0); //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$115>>2] = $114; //@line 63 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $116 = ((($78)) + 8|0); //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $117 = HEAP8[$116>>0]|0; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $118 = $117&255; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $119 = ((($78)) + 9|0); //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $120 = HEAP8[$119>>0]|0; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $121 = $120&255; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $122 = $121 << 8; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $123 = $118 | $122; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $124 = ((($78)) + 10|0); //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $125 = HEAP8[$124>>0]|0; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $126 = $125&255; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $127 = $126 << 16; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $128 = $123 | $127; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $129 = ((($78)) + 11|0); //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $130 = HEAP8[$129>>0]|0; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $131 = $130&255; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $132 = $131 << 24; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $133 = $128 | $132; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $134 = ((($ctx$i)) + 40|0); //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$134>>2] = $133; //@line 64 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $135 = ((($78)) + 12|0); //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $136 = HEAP8[$135>>0]|0; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $137 = $136&255; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $138 = ((($78)) + 13|0); //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $139 = HEAP8[$138>>0]|0; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $140 = $139&255; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $141 = $140 << 8; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $142 = $137 | $141; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $143 = ((($78)) + 14|0); //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $144 = HEAP8[$143>>0]|0; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $145 = $144&255; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $146 = $145 << 16; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $147 = $142 | $146; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $148 = ((($78)) + 15|0); //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $149 = HEAP8[$148>>0]|0; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $150 = $149&255; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $151 = $150 << 24; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $152 = $147 | $151; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $153 = ((($ctx$i)) + 44|0); //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$153>>2] = $152; //@line 65 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$ctx$i>>2] = 1634760805; //@line 66 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $154 = ((($ctx$i)) + 4|0); //@line 67 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$154>>2] = 857760878; //@line 67 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $155 = ((($ctx$i)) + 8|0); //@line 68 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$155>>2] = 2036477234; //@line 68 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $156 = ((($ctx$i)) + 12|0); //@line 69 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$156>>2] = 1797285236; //@line 69 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $157 = ((($ctx$i)) + 48|0); //@line 74 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$157>>2] = 0; //@line 74 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $158 = ((($ctx$i)) + 52|0); //@line 75 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$158>>2] = 0; //@line 75 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $159 = HEAP8[2257>>0]|0; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $160 = $159&255; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $161 = HEAP8[(2258)>>0]|0; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $162 = $161&255; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $163 = $162 << 8; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $164 = $160 | $163; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $165 = HEAP8[(2259)>>0]|0; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $166 = $165&255; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $167 = $166 << 16; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $168 = $164 | $167; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $169 = HEAP8[(2260)>>0]|0; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $170 = $169&255; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $171 = $170 << 24; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $172 = $168 | $171; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $173 = ((($ctx$i)) + 56|0); //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$173>>2] = $172; //@line 76 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $174 = HEAP8[(2261)>>0]|0; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $175 = $174&255; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $176 = HEAP8[(2262)>>0]|0; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $177 = $176&255; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $178 = $177 << 8; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $179 = $175 | $178; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $180 = HEAP8[(2263)>>0]|0; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $181 = $180&255; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $182 = $181 << 16; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $183 = $179 | $182; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $184 = HEAP8[(2264)>>0]|0; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $185 = $184&255; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $186 = $185 << 24; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $187 = $183 | $186; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $188 = ((($ctx$i)) + 60|0); //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 HEAP32[$188>>2] = $187; //@line 77 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $190 = 0;$192 = 0;
 while(1) {
  $189 = ($190>>>0)<($1>>>0); //@line 21 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  $191 = ($192>>>0)<($0>>>0); //@line 21 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  $193 = ($190|0)==($1|0); //@line 21 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  $194 = $193 & $191; //@line 21 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  $195 = $189 | $194; //@line 21 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  if (!($195)) {
   break;
  }
  $196 = (($r) + ($192)|0); //@line 22 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  HEAP8[$196>>0] = 0; //@line 22 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  $197 = (_i64Add(($192|0),($190|0),1,0)|0); //@line 21 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  $198 = tempRet0; //@line 21 "c_src/crypto_stream/chacha12/e/ref/stream.c"
  $190 = $198;$192 = $197;
 }
 $199 = ($0|0)==(0); //@line 85 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 if ($199) {
  STACKTOP = sp;return; //@line 14 "c_src/crypto_sign/sphincs256/ref/prg.c"
 }
 $200 = ((($x$i$i$i)) + 16|0); //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $201 = ((($x$i$i$i)) + 48|0); //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $202 = ((($x$i$i$i)) + 32|0); //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $203 = ((($x$i$i$i)) + 4|0); //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $204 = ((($x$i$i$i)) + 20|0); //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $205 = ((($x$i$i$i)) + 52|0); //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $206 = ((($x$i$i$i)) + 36|0); //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $207 = ((($x$i$i$i)) + 8|0); //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $208 = ((($x$i$i$i)) + 24|0); //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $209 = ((($x$i$i$i)) + 56|0); //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $210 = ((($x$i$i$i)) + 40|0); //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $211 = ((($x$i$i$i)) + 12|0); //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $212 = ((($x$i$i$i)) + 28|0); //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $213 = ((($x$i$i$i)) + 60|0); //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $214 = ((($x$i$i$i)) + 44|0); //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
 $$0 = $0;$$sroa$02$0 = $2;$$sroa$03$0 = $2;
 while(1) {
  $storemerge$i$i$i = 0;
  while(1) {
   $exitcond11 = ($storemerge$i$i$i|0)==(16); //@line 25 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   if ($exitcond11) {
    $storemerge1$i$i$i = 12;
    break;
   }
   $215 = (($ctx$i) + ($storemerge$i$i$i<<2)|0); //@line 25 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $216 = HEAP32[$215>>2]|0; //@line 25 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $217 = (($x$i$i$i) + ($storemerge$i$i$i<<2)|0); //@line 25 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$217>>2] = $216; //@line 25 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $218 = (($storemerge$i$i$i) + 1)|0; //@line 25 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $storemerge$i$i$i = $218;
  }
  while(1) {
   $219 = ($storemerge1$i$i$i|0)>(0); //@line 26 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   if (!($219)) {
    $storemerge2$i$i$i = 0;
    break;
   }
   $220 = HEAP32[$x$i$i$i>>2]|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $221 = HEAP32[$200>>2]|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $222 = (($220) + ($221))|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $223 = HEAP32[$201>>2]|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $224 = $223 ^ $222; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $225 = $224 << 16; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $226 = $224 >>> 16; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $227 = $225 | $226; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $228 = HEAP32[$202>>2]|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $229 = (($228) + ($227))|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $230 = $221 ^ $229; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $231 = $230 << 12; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $232 = $230 >>> 20; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $233 = $231 | $232; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $234 = (($222) + ($233))|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$x$i$i$i>>2] = $234; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $235 = $227 ^ $234; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $236 = $235 << 8; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $237 = $235 >>> 24; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $238 = $236 | $237; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$201>>2] = $238; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $239 = (($229) + ($238))|0; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$202>>2] = $239; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $240 = $233 ^ $239; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $241 = $240 << 7; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $242 = $240 >>> 25; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $243 = $241 | $242; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$200>>2] = $243; //@line 27 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $244 = HEAP32[$203>>2]|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $245 = HEAP32[$204>>2]|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $246 = (($244) + ($245))|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $247 = HEAP32[$205>>2]|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $248 = $247 ^ $246; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $249 = $248 << 16; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $250 = $248 >>> 16; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $251 = $249 | $250; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $252 = HEAP32[$206>>2]|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $253 = (($252) + ($251))|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $254 = $245 ^ $253; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $255 = $254 << 12; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $256 = $254 >>> 20; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $257 = $255 | $256; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $258 = (($246) + ($257))|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$203>>2] = $258; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $259 = $251 ^ $258; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $260 = $259 << 8; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $261 = $259 >>> 24; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $262 = $260 | $261; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$205>>2] = $262; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $263 = (($253) + ($262))|0; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$206>>2] = $263; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $264 = $257 ^ $263; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $265 = $264 << 7; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $266 = $264 >>> 25; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $267 = $265 | $266; //@line 28 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $268 = HEAP32[$207>>2]|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $269 = HEAP32[$208>>2]|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $270 = (($268) + ($269))|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $271 = HEAP32[$209>>2]|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $272 = $271 ^ $270; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $273 = $272 << 16; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $274 = $272 >>> 16; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $275 = $273 | $274; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $276 = HEAP32[$210>>2]|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $277 = (($276) + ($275))|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $278 = $269 ^ $277; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $279 = $278 << 12; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $280 = $278 >>> 20; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $281 = $279 | $280; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $282 = (($270) + ($281))|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$207>>2] = $282; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $283 = $275 ^ $282; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $284 = $283 << 8; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $285 = $283 >>> 24; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $286 = $284 | $285; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$209>>2] = $286; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $287 = (($277) + ($286))|0; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $288 = $281 ^ $287; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $289 = $288 << 7; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $290 = $288 >>> 25; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $291 = $289 | $290; //@line 29 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $292 = HEAP32[$211>>2]|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $293 = HEAP32[$212>>2]|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $294 = (($292) + ($293))|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $295 = HEAP32[$213>>2]|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $296 = $295 ^ $294; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $297 = $296 << 16; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $298 = $296 >>> 16; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $299 = $297 | $298; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $300 = HEAP32[$214>>2]|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $301 = (($300) + ($299))|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $302 = $293 ^ $301; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $303 = $302 << 12; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $304 = $302 >>> 20; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $305 = $303 | $304; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $306 = (($294) + ($305))|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$211>>2] = $306; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $307 = $299 ^ $306; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $308 = $307 << 8; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $309 = $307 >>> 24; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $310 = $308 | $309; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $311 = (($301) + ($310))|0; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $312 = $305 ^ $311; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $313 = $312 << 7; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $314 = $312 >>> 25; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $315 = $313 | $314; //@line 30 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $316 = HEAP32[$x$i$i$i>>2]|0; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $317 = (($316) + ($267))|0; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $318 = $310 ^ $317; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $319 = $318 << 16; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $320 = $318 >>> 16; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $321 = $319 | $320; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $322 = (($287) + ($321))|0; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $323 = $267 ^ $322; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $324 = $323 << 12; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $325 = $323 >>> 20; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $326 = $324 | $325; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $327 = (($317) + ($326))|0; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$x$i$i$i>>2] = $327; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $328 = $321 ^ $327; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $329 = $328 << 8; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $330 = $328 >>> 24; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $331 = $329 | $330; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$213>>2] = $331; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $332 = (($322) + ($331))|0; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$210>>2] = $332; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $333 = $326 ^ $332; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $334 = $333 << 7; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $335 = $333 >>> 25; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $336 = $334 | $335; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$204>>2] = $336; //@line 31 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $337 = HEAP32[$203>>2]|0; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $338 = (($337) + ($291))|0; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $339 = HEAP32[$201>>2]|0; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $340 = $339 ^ $338; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $341 = $340 << 16; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $342 = $340 >>> 16; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $343 = $341 | $342; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $344 = (($311) + ($343))|0; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $345 = $291 ^ $344; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $346 = $345 << 12; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $347 = $345 >>> 20; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $348 = $346 | $347; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $349 = (($338) + ($348))|0; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$203>>2] = $349; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $350 = $343 ^ $349; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $351 = $350 << 8; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $352 = $350 >>> 24; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $353 = $351 | $352; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$201>>2] = $353; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $354 = (($344) + ($353))|0; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$214>>2] = $354; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $355 = $348 ^ $354; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $356 = $355 << 7; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $357 = $355 >>> 25; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $358 = $356 | $357; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$208>>2] = $358; //@line 32 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $359 = HEAP32[$207>>2]|0; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $360 = (($359) + ($315))|0; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $361 = HEAP32[$205>>2]|0; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $362 = $361 ^ $360; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $363 = $362 << 16; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $364 = $362 >>> 16; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $365 = $363 | $364; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $366 = HEAP32[$202>>2]|0; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $367 = (($366) + ($365))|0; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $368 = $315 ^ $367; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $369 = $368 << 12; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $370 = $368 >>> 20; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $371 = $369 | $370; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $372 = (($360) + ($371))|0; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$207>>2] = $372; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $373 = $365 ^ $372; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $374 = $373 << 8; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $375 = $373 >>> 24; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $376 = $374 | $375; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$205>>2] = $376; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $377 = (($367) + ($376))|0; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$202>>2] = $377; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $378 = $371 ^ $377; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $379 = $378 << 7; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $380 = $378 >>> 25; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $381 = $379 | $380; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$212>>2] = $381; //@line 33 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $382 = HEAP32[$211>>2]|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $383 = HEAP32[$200>>2]|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $384 = (($382) + ($383))|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $385 = HEAP32[$209>>2]|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $386 = $385 ^ $384; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $387 = $386 << 16; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $388 = $386 >>> 16; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $389 = $387 | $388; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $390 = HEAP32[$206>>2]|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $391 = (($390) + ($389))|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $392 = $383 ^ $391; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $393 = $392 << 12; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $394 = $392 >>> 20; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $395 = $393 | $394; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $396 = (($384) + ($395))|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$211>>2] = $396; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $397 = $389 ^ $396; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $398 = $397 << 8; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $399 = $397 >>> 24; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $400 = $398 | $399; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$209>>2] = $400; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $401 = (($391) + ($400))|0; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$206>>2] = $401; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $402 = $395 ^ $401; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $403 = $402 << 7; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $404 = $402 >>> 25; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $405 = $403 | $404; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$200>>2] = $405; //@line 34 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $406 = (($storemerge1$i$i$i) + -2)|0; //@line 26 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $storemerge1$i$i$i = $406;
  }
  while(1) {
   $exitcond12 = ($storemerge2$i$i$i|0)==(16); //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   if ($exitcond12) {
    $storemerge3$i$i$i = 0;
    break;
   }
   $407 = (($x$i$i$i) + ($storemerge2$i$i$i<<2)|0); //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $408 = HEAP32[$407>>2]|0; //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $409 = (($ctx$i) + ($storemerge2$i$i$i<<2)|0); //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $410 = HEAP32[$409>>2]|0; //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $411 = (($408) + ($410))|0; //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$407>>2] = $411; //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $412 = (($storemerge2$i$i$i) + 1)|0; //@line 36 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $storemerge2$i$i$i = $412;
  }
  while(1) {
   $exitcond13 = ($storemerge3$i$i$i|0)==(16); //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   if ($exitcond13) {
    break;
   }
   $413 = (($x$i$i$i) + ($storemerge3$i$i$i<<2)|0); //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $414 = HEAP32[$413>>2]|0; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $415 = $414&255; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $416 = $storemerge3$i$i$i << 2; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $417 = (($output$i$i) + ($416)|0); //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP8[$417>>0] = $415; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $418 = $414 >>> 8; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $419 = $418&255; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $$sum4$i$i$i = $416 | 1; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $420 = (($output$i$i) + ($$sum4$i$i$i)|0); //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP8[$420>>0] = $419; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $421 = $414 >>> 16; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $422 = $421&255; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $$sum5$i$i$i = $416 | 2; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $423 = (($output$i$i) + ($$sum5$i$i$i)|0); //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP8[$423>>0] = $422; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $424 = $414 >>> 24; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $425 = $424&255; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $$sum6$i$i$i = $416 | 3; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $426 = (($output$i$i) + ($$sum6$i$i$i)|0); //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP8[$426>>0] = $425; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $427 = (($storemerge3$i$i$i) + 1)|0; //@line 37 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $storemerge3$i$i$i = $427;
  }
  $428 = HEAP32[$157>>2]|0; //@line 88 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $429 = (($428) + 1)|0; //@line 88 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  HEAP32[$157>>2] = $429; //@line 88 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $430 = ($429|0)==(0); //@line 89 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  if ($430) {
   $431 = HEAP32[$158>>2]|0; //@line 90 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $432 = (($431) + 1)|0; //@line 90 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP32[$158>>2] = $432; //@line 90 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  }
  $433 = ($$0>>>0)<(65); //@line 93 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $434 = $$sroa$03$0; //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $435 = $$sroa$02$0; //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  if ($433) {
   $storemerge1$i$i = 0;
   break;
  } else {
   $storemerge$i1$i = 0;
  }
  while(1) {
   $exitcond14 = ($storemerge$i1$i|0)==(64); //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   if ($exitcond14) {
    break;
   }
   $443 = (($434) + ($storemerge$i1$i)|0); //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $444 = HEAP8[$443>>0]|0; //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $445 = (($output$i$i) + ($storemerge$i1$i)|0); //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $446 = HEAP8[$445>>0]|0; //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $447 = $444 ^ $446; //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $448 = (($435) + ($storemerge$i1$i)|0); //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   HEAP8[$448>>0] = $447; //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $449 = (($storemerge$i1$i) + 1)|0; //@line 97 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
   $storemerge$i1$i = $449;
  }
  $450 = (($$0) + -64)|0; //@line 98 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $451 = ((($435)) + 64|0); //@line 99 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $452 = $451; //@line 99 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $453 = ((($434)) + 64|0); //@line 100 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $454 = $453; //@line 100 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $$0 = $450;$$sroa$02$0 = $452;$$sroa$03$0 = $454;
 }
 while(1) {
  $exitcond = ($storemerge1$i$i|0)==($$0|0); //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  if ($exitcond) {
   break;
  }
  $436 = (($434) + ($storemerge1$i$i)|0); //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $437 = HEAP8[$436>>0]|0; //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $438 = (($output$i$i) + ($storemerge1$i$i)|0); //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $439 = HEAP8[$438>>0]|0; //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $440 = $437 ^ $439; //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $441 = (($435) + ($storemerge1$i$i)|0); //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  HEAP8[$441>>0] = $440; //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $442 = (($storemerge1$i$i) + 1)|0; //@line 94 "c_src/crypto_stream/chacha12/e/ref/e/chacha.c"
  $storemerge1$i$i = $442;
 }
 STACKTOP = sp;return; //@line 14 "c_src/crypto_sign/sphincs256/ref/prg.c"
}
function _crypto_sign_sphincs_keypair($pk,$sk) {
 $pk = $pk|0;
 $sk = $sk|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $a = 0, $exitcond = 0, $storemerge$i$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $a = sp;
 $storemerge$i$i = 0;
 while(1) {
  $exitcond = ($storemerge$i$i|0)==(1088); //@line 144 "libsodium/src/libsodium/randombytes/randombytes.c"
  if ($exitcond) {
   break;
  }
  $0 = _emscripten_asm_const_0(1)|0; //@line 59 "libsodium/src/libsodium/randombytes/randombytes.c"
  $1 = $0&255; //@line 145 "libsodium/src/libsodium/randombytes/randombytes.c"
  $2 = (($sk) + ($storemerge$i$i)|0); //@line 145 "libsodium/src/libsodium/randombytes/randombytes.c"
  HEAP8[$2>>0] = $1; //@line 145 "libsodium/src/libsodium/randombytes/randombytes.c"
  $3 = (($storemerge$i$i) + 1)|0; //@line 144 "libsodium/src/libsodium/randombytes/randombytes.c"
  $storemerge$i$i = $3;
 }
 $4 = ((($sk)) + 32|0); //@line 224 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _memcpy(($pk|0),($4|0),1024)|0; //@line 224 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$a>>2] = 11; //@line 227 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $5 = ((($a)) + 8|0); //@line 228 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $6 = $5; //@line 228 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $7 = $6; //@line 228 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$7>>2] = 0; //@line 228 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $8 = (($6) + 4)|0; //@line 228 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $9 = $8; //@line 228 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$9>>2] = 0; //@line 228 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $10 = ((($a)) + 16|0); //@line 229 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$10>>2] = 0; //@line 229 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $11 = ((($pk)) + 1024|0); //@line 232 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _treehash($11,$sk,$a,$pk); //@line 232 "c_src/crypto_sign/sphincs256/ref/sign.c"
 STACKTOP = sp;return 0; //@line 233 "c_src/crypto_sign/sphincs256/ref/sign.c"
}
function _crypto_sign_sphincs($sm,$smlen,$m,$0,$1,$sk) {
 $sm = $sm|0;
 $smlen = $smlen|0;
 $m = $m|0;
 $0 = $0|0;
 $1 = $1|0;
 $sk = $sk|0;
 var $$cast$i7 = 0, $$sroa$0$0$in = 0, $$sum = 0, $$sum$i = 0, $$sum3$i = 0, $$sum4$i = 0, $$sum5$i = 0, $$sum53 = 0, $$sum54 = 0, $$sum55 = 0, $$sum56 = 0, $$sum57 = 0, $$sum58 = 0, $$sum59 = 0, $$sum60 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0;
 var $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0;
 var $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0;
 var $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0;
 var $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0;
 var $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0;
 var $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0;
 var $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0;
 var $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0;
 var $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0;
 var $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0;
 var $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0;
 var $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0;
 var $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0;
 var $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $R = 0, $a = 0, $a1 = 0, $basew$i = 0, $c$i$0 = 0, $c$i$1 = 0, $exitcond = 0, $exitcond33 = 0, $exitcond34 = 0, $exitcond35 = 0, $exitcond36 = 0, $exitcond37 = 0, $exitcond38 = 0, $exitcond39 = 0, $exitcond40 = 0, $exitcond41 = 0, $exitcond42 = 0, $exitcond43 = 0, $exitcond44 = 0;
 var $exitcond45 = 0, $exitcond46 = 0, $exitcond47 = 0, $exitcond48 = 0, $exitcond49 = 0, $i$i19$0 = 0, $idx$i11$0 = 0, $level$i$0 = 0, $m_h = 0, $masks = 0, $p$i$sroa$0$0$in = 0, $p$i6$sroa$0$0 = 0, $pk$i = 0, $rnd = 0, $root = 0, $seed = 0, $seed$i = 0, $sigpos$i$0 = 0, $sigpos$i$1 = 0, $sigpos$i$2 = 0;
 var $sigpos$i$3 = 0, $sigpos$i$3$in = 0, $sigpos$i$4 = 0, $sk$i = 0, $storemerge$i = 0, $storemerge$i$i = 0, $storemerge$i$i16 = 0, $storemerge$i15 = 0, $storemerge$i20 = 0, $storemerge1$i = 0, $storemerge1$i$i = 0, $storemerge1$i17 = 0, $storemerge1$i21 = 0, $storemerge2$i = 0, $storemerge2$i18 = 0, $storemerge3$i = 0, $storemerge4$i = 0, $storemerge5$i = 0, $storemerge50 = 0, $storemerge51 = 0;
 var $storemerge52 = 0, $storemerge6$i = 0, $storemerge7$i = 0, $storemerge8$i = 0, $ta$i = 0, $tree$i = 0, $tree$i14 = 0, $tsk = 0, $x$i$i = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 6365856|0;
 $basew$i = sp + 136|0;
 $x$i$i = sp + 6365784|0;
 $sk$i = sp + 4268632|0;
 $tree$i14 = sp + 74360|0;
 $ta$i = sp + 112|0;
 $tree$i = sp + 72312|0;
 $seed$i = sp + 71288|0;
 $pk$i = sp + 2680|0;
 $a = sp + 88|0;
 $R = sp + 2648|0;
 $m_h = sp + 2584|0;
 $rnd = sp + 24|0;
 $root = sp + 2552|0;
 $seed = sp + 2520|0;
 $masks = sp + 1496|0;
 $tsk = sp + 408|0;
 $a1 = sp;
 $3 = 0;$5 = 0;
 while(1) {
  $2 = ($3>>>0)<(0); //@line 252 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $4 = ($5>>>0)<(1088); //@line 252 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $6 = ($3|0)==(0); //@line 252 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $7 = $6 & $4; //@line 252 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $8 = $2 | $7; //@line 252 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($8)) {
   break;
  }
  $9 = (($sk) + ($5)|0); //@line 253 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $10 = HEAP8[$9>>0]|0; //@line 253 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $11 = (($tsk) + ($5)|0); //@line 253 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$11>>0] = $10; //@line 253 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $12 = (_i64Add(($5|0),($3|0),1,0)|0); //@line 252 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $13 = tempRet0; //@line 252 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $3 = $13;$5 = $12;
 }
 $14 = ((($sm)) + 40968|0); //@line 258 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $16 = $0;$18 = $1;
 while(1) {
  $15 = ($16|0)==(0); //@line 261 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $17 = ($18|0)==(0); //@line 261 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $19 = $15 & $17; //@line 261 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if ($19) {
   break;
  }
  $20 = (_i64Add(($16|0),($18|0),-1,0)|0); //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $21 = tempRet0; //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $22 = (($m) + ($20)|0); //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $23 = HEAP8[$22>>0]|0; //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $24 = (_i64Add(($16|0),($18|0),31,0)|0); //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $25 = tempRet0; //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $$sum = (($24) + 40968)|0; //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $26 = (($sm) + ($$sum)|0); //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$26>>0] = $23; //@line 262 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $27 = (_i64Add(($16|0),($18|0),-1,-1)|0); //@line 261 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $28 = tempRet0; //@line 261 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $16 = $27;$18 = $28;
 }
 $29 = ((($tsk)) + 1056|0); //@line 264 "c_src/crypto_sign/sphincs256/ref/sign.c"
 dest=$14; src=$29; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0)); //@line 264 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $30 = (_i64Add(($0|0),($1|0),32,0)|0); //@line 266 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $31 = tempRet0; //@line 266 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _crypto_hash_blake512_ref($rnd,$14,$30,$31); //@line 266 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $33 = 32;$35 = 0;$p$i$sroa$0$0$in = $14;
 while(1) {
  $32 = ($33|0)==(0); //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $34 = ($35|0)==(0); //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $36 = $32 & $34; //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  if ($36) {
   break;
  }
  $37 = (_i64Add(($33|0),($35|0),-1,-1)|0); //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $38 = tempRet0; //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $39 = ((($p$i$sroa$0$0$in)) + 1|0); //@line 7 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  HEAP8[$p$i$sroa$0$0$in>>0] = 0; //@line 7 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $33 = $37;$35 = $38;$p$i$sroa$0$0$in = $39;
 }
 $40 = $rnd; //@line 275 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $41 = $40; //@line 275 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $42 = HEAP32[$41>>2]|0; //@line 275 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $43 = (($40) + 4)|0; //@line 275 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $44 = $43; //@line 275 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $45 = HEAP32[$44>>2]|0; //@line 275 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $46 = $45 & 268435455; //@line 275 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $47 = ((($rnd)) + 16|0); //@line 280 "c_src/crypto_sign/sphincs256/ref/sign.c"
 dest=$R; src=$47; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0)); //@line 280 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $48 = ((($sm)) + 39912|0); //@line 283 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _memmove(($48|0),($47|0),32)|0; //@line 286 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$a1>>2] = 11; //@line 290 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $49 = ((($a1)) + 8|0); //@line 291 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $50 = $49; //@line 291 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $51 = $50; //@line 291 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$51>>2] = 0; //@line 291 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $52 = (($50) + 4)|0; //@line 291 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $53 = $52; //@line 291 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$53>>2] = 0; //@line 291 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $54 = ((($a1)) + 16|0); //@line 292 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$54>>2] = 0; //@line 292 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $55 = ((($sm)) + 39944|0); //@line 294 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $56 = ((($tsk)) + 32|0); //@line 296 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _memcpy(($55|0),($56|0),1024)|0; //@line 296 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $57 = ((($sm)) + 40968|0); //@line 298 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _treehash($57,$tsk,$a1,$55); //@line 298 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $58 = (_i64Add(($0|0),($1|0),1088,0)|0); //@line 302 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $59 = tempRet0; //@line 302 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _crypto_hash_blake512_ref($m_h,$48,$58,$59); //@line 20 "c_src/crypto_sign/sphincs256/ref/hash.c"
 HEAP32[$a>>2] = 12; //@line 305 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $60 = $42 & 31; //@line 306 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $61 = ((($a)) + 16|0); //@line 306 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$61>>2] = $60; //@line 306 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $62 = (_bitshift64Lshr(($42|0),($46|0),5)|0); //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $63 = tempRet0; //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $64 = ((($a)) + 8|0); //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $65 = $64; //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $66 = $65; //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$66>>2] = $62; //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $67 = (($65) + 4)|0; //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $68 = $67; //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$68>>2] = $63; //@line 307 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $69 = $smlen; //@line 309 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $70 = $69; //@line 309 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$70>>2] = 0; //@line 309 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $71 = (($69) + 4)|0; //@line 309 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $72 = $71; //@line 309 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$72>>2] = 0; //@line 309 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $74 = 0;$76 = 0;
 while(1) {
  $73 = ($74>>>0)<(0); //@line 311 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $75 = ($76>>>0)<(32); //@line 311 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $77 = ($74|0)==(0); //@line 311 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $78 = $77 & $75; //@line 311 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $79 = $73 | $78; //@line 311 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($79)) {
   break;
  }
  $80 = (($R) + ($76)|0); //@line 312 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $81 = HEAP8[$80>>0]|0; //@line 312 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $82 = (($sm) + ($76)|0); //@line 312 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$82>>0] = $81; //@line 312 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $83 = (_i64Add(($76|0),($74|0),1,0)|0); //@line 311 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $84 = tempRet0; //@line 311 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $74 = $84;$76 = $83;
 }
 $85 = $smlen; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $86 = $85; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $87 = HEAP32[$86>>2]|0; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $88 = (($85) + 4)|0; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $89 = $88; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $90 = HEAP32[$89>>2]|0; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $91 = (_i64Add(($87|0),($90|0),32,0)|0); //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $92 = tempRet0; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $93 = $smlen; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $94 = $93; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$94>>2] = $91; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $95 = (($93) + 4)|0; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $96 = $95; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$96>>2] = $92; //@line 315 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _memcpy(($masks|0),($56|0),1024)|0; //@line 317 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $100 = 0;$98 = 0;
 while(1) {
  $97 = ($98>>>0)<(0); //@line 318 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $99 = ($100>>>0)<(8); //@line 318 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $101 = ($98|0)==(0); //@line 318 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $102 = $101 & $99; //@line 318 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $103 = $97 | $102; //@line 318 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($103)) {
   break;
  }
  $104 = (_bitshift64Shl(($100|0),($98|0),3)|0); //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $105 = tempRet0; //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $106 = (_bitshift64Lshr(($42|0),($46|0),($104|0))|0); //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $107 = tempRet0; //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $108 = $106&255; //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $$sum60 = (($100) + 32)|0; //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $109 = (($sm) + ($$sum60)|0); //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$109>>0] = $108; //@line 319 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $110 = (_i64Add(($100|0),($98|0),1,0)|0); //@line 318 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $111 = tempRet0; //@line 318 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $100 = $110;$98 = $111;
 }
 $112 = $smlen; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $113 = $112; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $114 = HEAP32[$113>>2]|0; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $115 = (($112) + 4)|0; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $116 = $115; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $117 = HEAP32[$116>>2]|0; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $118 = (_i64Add(($114|0),($117|0),8,0)|0); //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $119 = tempRet0; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $120 = $smlen; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $121 = $120; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$121>>2] = $118; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $122 = (($120) + 4)|0; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $123 = $122; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$123>>2] = $119; //@line 322 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _get_seed($seed,$tsk,$a); //@line 324 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _prg($sk$i,2097152,0,$seed); //@line 10 "c_src/crypto_sign/sphincs256/ref/horst.c"
 $storemerge$i15 = 0;
 while(1) {
  $exitcond49 = ($storemerge$i15|0)==(65536); //@line 34 "c_src/crypto_sign/sphincs256/ref/horst.c"
  if ($exitcond49) {
   break;
  }
  $124 = $storemerge$i15 << 5; //@line 35 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $125 = (($124) + 2097120)|0; //@line 35 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge$i$i16 = 0;
  while(1) {
   $exitcond47 = ($storemerge$i$i16|0)==(32); //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
   if ($exitcond47) {
    break;
   }
   $$sum59 = (($124) + ($storemerge$i$i16))|0; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $126 = (($sk$i) + ($$sum59)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $127 = HEAP8[$126>>0]|0; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $128 = (($x$i$i) + ($storemerge$i$i16)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   HEAP8[$128>>0] = $127; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $129 = (2224 + ($storemerge$i$i16)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $130 = HEAP8[$129>>0]|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $131 = (($storemerge$i$i16) + 32)|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $132 = (($x$i$i) + ($131)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   HEAP8[$132>>0] = $130; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $133 = (($storemerge$i$i16) + 1)|0; //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $storemerge$i$i16 = $133;
  }
  _chacha_permute($x$i$i,$x$i$i); //@line 73 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $storemerge1$i$i = 0;
  while(1) {
   $exitcond48 = ($storemerge1$i$i|0)==(32); //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
   if ($exitcond48) {
    break;
   }
   $134 = (($x$i$i) + ($storemerge1$i$i)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $135 = HEAP8[$134>>0]|0; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $$sum58 = (($125) + ($storemerge1$i$i))|0; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $136 = (($tree$i14) + ($$sum58)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   HEAP8[$136>>0] = $135; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $137 = (($storemerge1$i$i) + 1)|0; //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $storemerge1$i$i = $137;
  }
  $138 = (($storemerge$i15) + 1)|0; //@line 34 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge$i15 = $138;
 }
 $storemerge1$i17 = 0;
 while(1) {
  $exitcond46 = ($storemerge1$i17|0)==(16); //@line 38 "c_src/crypto_sign/sphincs256/ref/horst.c"
  if ($exitcond46) {
   $sigpos$i$0 = 0;$storemerge2$i18 = 2016;
   break;
  }
  $139 = (16 - ($storemerge1$i17))|0; //@line 40 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $140 = 1 << $139; //@line 40 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $141 = (($140) + 134217727)|0; //@line 40 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $142 = (($139) + -1)|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $143 = 1 << $142; //@line 41 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $144 = (($143) + 134217727)|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $145 = $storemerge1$i17 << 6; //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $146 = (($masks) + ($145)|0); //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge8$i = 0;
  while(1) {
   $147 = ($storemerge8$i|0)<($143|0); //@line 42 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if (!($147)) {
    break;
   }
   $148 = (($144) + ($storemerge8$i))|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $149 = $148 << 5; //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $150 = (($tree$i14) + ($149)|0); //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $151 = $storemerge8$i << 1; //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $152 = (($141) + ($151))|0; //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $153 = $152 << 5; //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $154 = (($tree$i14) + ($153)|0); //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   _hash_2n_n_mask($150,$154,$146); //@line 43 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $155 = (($storemerge8$i) + 1)|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge8$i = $155;
  }
  $156 = (($storemerge1$i17) + 1)|0; //@line 38 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge1$i17 = $156;
 }
 while(1) {
  $exitcond45 = ($sigpos$i$0|0)==(2048); //@line 51 "c_src/crypto_sign/sphincs256/ref/horst.c"
  if ($exitcond45) {
   $sigpos$i$1 = 2048;$storemerge3$i = 0;
   break;
  }
  $157 = (($tree$i14) + ($storemerge2$i18)|0); //@line 52 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $158 = HEAP8[$157>>0]|0; //@line 52 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $159 = (($sigpos$i$0) + 1)|0; //@line 52 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $$sum57 = (($sigpos$i$0) + 40)|0; //@line 52 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $160 = (($sm) + ($$sum57)|0); //@line 52 "c_src/crypto_sign/sphincs256/ref/horst.c"
  HEAP8[$160>>0] = $158; //@line 52 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $161 = (($storemerge2$i18) + 1)|0; //@line 51 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $sigpos$i$0 = $159;$storemerge2$i18 = $161;
 }
 while(1) {
  $exitcond44 = ($storemerge3$i|0)==(32); //@line 55 "c_src/crypto_sign/sphincs256/ref/horst.c"
  if ($exitcond44) {
   $storemerge4$i = 0;
   break;
  }
  $162 = $storemerge3$i << 1; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $163 = (($m_h) + ($162)|0); //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $164 = HEAP8[$163>>0]|0; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $165 = $164&255; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $166 = $162 | 1; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $167 = (($m_h) + ($166)|0); //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $168 = HEAP8[$167>>0]|0; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $169 = $168&255; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $170 = $169 << 8; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $171 = $165 | $170; //@line 57 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $172 = $171 << 5; //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $sigpos$i$2 = $sigpos$i$1;$storemerge5$i = 0;
  while(1) {
   $exitcond41 = ($storemerge5$i|0)==(32); //@line 59 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond41) {
    break;
   }
   $173 = (($172) + ($storemerge5$i))|0; //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $174 = (($sk$i) + ($173)|0); //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $175 = HEAP8[$174>>0]|0; //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $176 = (($sigpos$i$2) + 1)|0; //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $$sum56 = (($sigpos$i$2) + 40)|0; //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $177 = (($sm) + ($$sum56)|0); //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
   HEAP8[$177>>0] = $175; //@line 60 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $178 = (($storemerge5$i) + 1)|0; //@line 59 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $sigpos$i$2 = $176;$storemerge5$i = $178;
  }
  $179 = (($171) + 65535)|0; //@line 62 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $idx$i11$0 = $179;$sigpos$i$3$in = $sigpos$i$1;$storemerge6$i = 0;
  while(1) {
   $sigpos$i$3 = (($sigpos$i$3$in) + 32)|0; //@line 59 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $exitcond43 = ($storemerge6$i|0)==(10); //@line 63 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond43) {
    break;
   }
   $180 = $idx$i11$0 & 1; //@line 65 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $181 = ($180|0)==(0); //@line 65 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $182 = (($idx$i11$0) + 1)|0; //@line 65 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $183 = (($idx$i11$0) + -1)|0; //@line 65 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $184 = $181 ? $183 : $182; //@line 65 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $185 = $184 << 5; //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $sigpos$i$4 = $sigpos$i$3;$storemerge7$i = 0;
   while(1) {
    $exitcond42 = ($storemerge7$i|0)==(32); //@line 66 "c_src/crypto_sign/sphincs256/ref/horst.c"
    if ($exitcond42) {
     break;
    }
    $186 = (($185) + ($storemerge7$i))|0; //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
    $187 = (($tree$i14) + ($186)|0); //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
    $188 = HEAP8[$187>>0]|0; //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
    $189 = (($sigpos$i$4) + 1)|0; //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
    $$sum55 = (($sigpos$i$4) + 40)|0; //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
    $190 = (($sm) + ($$sum55)|0); //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
    HEAP8[$190>>0] = $188; //@line 67 "c_src/crypto_sign/sphincs256/ref/horst.c"
    $191 = (($storemerge7$i) + 1)|0; //@line 66 "c_src/crypto_sign/sphincs256/ref/horst.c"
    $sigpos$i$4 = $189;$storemerge7$i = $191;
   }
   $192 = (($184) + -1)|0; //@line 68 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $193 = $192 >>> 1; //@line 68 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $194 = (($storemerge6$i) + 1)|0; //@line 63 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $idx$i11$0 = $193;$sigpos$i$3$in = $sigpos$i$3;$storemerge6$i = $194;
  }
  $195 = (($sigpos$i$1) + 352)|0; //@line 63 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $196 = (($storemerge3$i) + 1)|0; //@line 55 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $sigpos$i$1 = $195;$storemerge3$i = $196;
 }
 while(1) {
  $exitcond40 = ($storemerge4$i|0)==(32); //@line 72 "c_src/crypto_sign/sphincs256/ref/horst.c"
  if ($exitcond40) {
   break;
  }
  $197 = (($tree$i14) + ($storemerge4$i)|0); //@line 73 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $198 = HEAP8[$197>>0]|0; //@line 73 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $199 = (($root) + ($storemerge4$i)|0); //@line 73 "c_src/crypto_sign/sphincs256/ref/horst.c"
  HEAP8[$199>>0] = $198; //@line 73 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $200 = (($storemerge4$i) + 1)|0; //@line 72 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge4$i = $200;
 }
 $201 = ((($sm)) + 13352|0); //@line 327 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $202 = $smlen; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $203 = $202; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $204 = HEAP32[$203>>2]|0; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $205 = (($202) + 4)|0; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $206 = $205; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $207 = HEAP32[$206>>2]|0; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $208 = (_i64Add(($204|0),($207|0),13312,0)|0); //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $209 = tempRet0; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $210 = $smlen; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $211 = $210; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$211>>2] = $208; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $212 = (($210) + 4)|0; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $213 = $212; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$213>>2] = $209; //@line 328 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $214 = ((($ta$i)) + 16|0); //@line 181 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $215 = ((($tree$i)) + 32|0); //@line 212 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $$sroa$0$0$in = $201;$217 = 0;$219 = 0;
 while(1) {
  $216 = ($217>>>0)<(0); //@line 330 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $218 = ($219>>>0)<(12); //@line 330 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $220 = ($217|0)==(0); //@line 330 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $221 = $220 & $218; //@line 330 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $222 = $216 | $221; //@line 330 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($222)) {
   break;
  }
  HEAP32[$a>>2] = $219; //@line 332 "c_src/crypto_sign/sphincs256/ref/sign.c"
  _get_seed($seed,$tsk,$a); //@line 334 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $c$i$0 = 0;$storemerge$i20 = 0;
  while(1) {
   $223 = ($storemerge$i20|0)<(64); //@line 37 "c_src/crypto_sign/sphincs256/ref/wots.c"
   if (!($223)) {
    $c$i$1 = $c$i$0;$i$i19$0 = 64;
    break;
   }
   $224 = (($storemerge$i20|0) / 2)&-1; //@line 39 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $225 = (($root) + ($224)|0); //@line 39 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $226 = HEAP8[$225>>0]|0; //@line 39 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $227 = $226&255; //@line 39 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $228 = $227 & 15; //@line 39 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $229 = (($basew$i) + ($storemerge$i20<<2)|0); //@line 39 "c_src/crypto_sign/sphincs256/ref/wots.c"
   HEAP32[$229>>2] = $228; //@line 39 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $230 = $227 >>> 4; //@line 40 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $231 = $storemerge$i20 | 1; //@line 40 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $232 = (($basew$i) + ($231<<2)|0); //@line 40 "c_src/crypto_sign/sphincs256/ref/wots.c"
   HEAP32[$232>>2] = $230; //@line 40 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $233 = $228 ^ 15; //@line 41 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $234 = (($c$i$0) + ($233))|0; //@line 41 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $235 = $230 ^ 15; //@line 42 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $236 = (($234) + ($235))|0; //@line 42 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $237 = (($storemerge$i20) + 2)|0; //@line 37 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $c$i$0 = $236;$storemerge$i20 = $237;
  }
  while(1) {
   $exitcond = ($i$i19$0|0)==(67); //@line 45 "c_src/crypto_sign/sphincs256/ref/wots.c"
   if ($exitcond) {
    break;
   }
   $238 = $c$i$1 & 15; //@line 47 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $239 = (($basew$i) + ($i$i19$0<<2)|0); //@line 47 "c_src/crypto_sign/sphincs256/ref/wots.c"
   HEAP32[$239>>2] = $238; //@line 47 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $240 = $c$i$1 >> 4; //@line 48 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $241 = (($i$i19$0) + 1)|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $c$i$1 = $240;$i$i19$0 = $241;
  }
  _prg($$sroa$0$0$in,2144,0,$seed); //@line 8 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $storemerge1$i21 = 0;
  while(1) {
   $exitcond33 = ($storemerge1$i21|0)==(67); //@line 52 "c_src/crypto_sign/sphincs256/ref/wots.c"
   if ($exitcond33) {
    break;
   }
   $242 = $storemerge1$i21 << 5; //@line 53 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $243 = (($$sroa$0$0$in) + ($242)|0); //@line 53 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $244 = (($basew$i) + ($storemerge1$i21<<2)|0); //@line 53 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $245 = HEAP32[$244>>2]|0; //@line 53 "c_src/crypto_sign/sphincs256/ref/wots.c"
   _gen_chain($243,$243,$masks,$245); //@line 53 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $246 = (($storemerge1$i21) + 1)|0; //@line 52 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $storemerge1$i21 = $246;
  }
  $247 = $smlen; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $248 = $247; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $249 = HEAP32[$248>>2]|0; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $250 = (($247) + 4)|0; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $251 = $250; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $252 = HEAP32[$251>>2]|0; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $253 = (_i64Add(($249|0),($252|0),2144,0)|0); //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $254 = tempRet0; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $255 = $smlen; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $256 = $255; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$256>>2] = $253; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $257 = (($255) + 4)|0; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $258 = $257; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$258>>2] = $254; //@line 337 "c_src/crypto_sign/sphincs256/ref/sign.c"
  ;HEAP32[$ta$i>>2]=HEAP32[$a>>2]|0;HEAP32[$ta$i+4>>2]=HEAP32[$a+4>>2]|0;HEAP32[$ta$i+8>>2]=HEAP32[$a+8>>2]|0;HEAP32[$ta$i+12>>2]=HEAP32[$a+12>>2]|0;HEAP32[$ta$i+16>>2]=HEAP32[$a+16>>2]|0;HEAP32[$ta$i+20>>2]=HEAP32[$a+20>>2]|0; //@line 174 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $storemerge50 = 0;
  while(1) {
   HEAP32[$214>>2] = $storemerge50; //@line 181 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $exitcond34 = ($storemerge50|0)==(32); //@line 181 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if ($exitcond34) {
    $storemerge51 = 0;
    break;
   }
   $259 = $storemerge50 << 5; //@line 182 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $260 = (($seed$i) + ($259)|0); //@line 182 "c_src/crypto_sign/sphincs256/ref/sign.c"
   _get_seed($260,$tsk,$ta$i); //@line 182 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $261 = (($storemerge50) + 1)|0; //@line 181 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $storemerge50 = $261;
  }
  while(1) {
   HEAP32[$214>>2] = $storemerge51; //@line 184 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $exitcond36 = ($storemerge51|0)==(32); //@line 184 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if ($exitcond36) {
    $storemerge52 = 0;
    break;
   }
   $262 = ($storemerge51*2144)|0; //@line 185 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $263 = (($pk$i) + ($262)|0); //@line 185 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $264 = $storemerge51 << 5; //@line 185 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $265 = (($seed$i) + ($264)|0); //@line 185 "c_src/crypto_sign/sphincs256/ref/sign.c"
   _prg($263,2144,0,$265); //@line 8 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $storemerge$i$i = 0;
   while(1) {
    $exitcond35 = ($storemerge$i$i|0)==(67); //@line 27 "c_src/crypto_sign/sphincs256/ref/wots.c"
    if ($exitcond35) {
     break;
    }
    $266 = $storemerge$i$i << 5; //@line 28 "c_src/crypto_sign/sphincs256/ref/wots.c"
    $$sum54 = (($262) + ($266))|0; //@line 28 "c_src/crypto_sign/sphincs256/ref/wots.c"
    $267 = (($pk$i) + ($$sum54)|0); //@line 28 "c_src/crypto_sign/sphincs256/ref/wots.c"
    _gen_chain($267,$267,$masks,15); //@line 28 "c_src/crypto_sign/sphincs256/ref/wots.c"
    $268 = (($storemerge$i$i) + 1)|0; //@line 27 "c_src/crypto_sign/sphincs256/ref/wots.c"
    $storemerge$i$i = $268;
   }
   $269 = (($storemerge51) + 1)|0; //@line 184 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $storemerge51 = $269;
  }
  while(1) {
   HEAP32[$214>>2] = $storemerge52; //@line 187 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $exitcond37 = ($storemerge52|0)==(32); //@line 187 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if ($exitcond37) {
    $level$i$0 = 0;$storemerge$i = 32;
    break;
   }
   $270 = $storemerge52 << 5; //@line 188 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $$sum5$i = (($270) + 1024)|0; //@line 188 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $271 = (($tree$i) + ($$sum5$i)|0); //@line 188 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $272 = ($storemerge52*2144)|0; //@line 189 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $273 = (($pk$i) + ($272)|0); //@line 189 "c_src/crypto_sign/sphincs256/ref/sign.c"
   _l_tree($271,$273,$masks); //@line 188 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $274 = (($storemerge52) + 1)|0; //@line 187 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $storemerge52 = $274;
  }
  while(1) {
   $exitcond38 = ($level$i$0|0)==(6); //@line 194 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if ($exitcond38) {
    break;
   }
   $275 = $storemerge$i >>> 1; //@line 197 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $276 = $level$i$0 << 6; //@line 199 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $277 = (($276) + 448)|0; //@line 199 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $278 = (($masks) + ($277)|0); //@line 199 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $storemerge2$i = 0;
   while(1) {
    $279 = ($storemerge2$i|0)<($storemerge$i|0); //@line 196 "c_src/crypto_sign/sphincs256/ref/sign.c"
    if (!($279)) {
     break;
    }
    $280 = $storemerge2$i >>> 1; //@line 197 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $281 = (($275) + ($280))|0; //@line 197 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $$sum3$i = $281 << 5; //@line 197 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $282 = (($tree$i) + ($$sum3$i)|0); //@line 197 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $283 = (($storemerge$i) + ($storemerge2$i))|0; //@line 198 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $$sum4$i = $283 << 5; //@line 198 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $284 = (($tree$i) + ($$sum4$i)|0); //@line 198 "c_src/crypto_sign/sphincs256/ref/sign.c"
    _hash_2n_n_mask($282,$284,$278); //@line 197 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $285 = (($storemerge2$i) + 2)|0; //@line 196 "c_src/crypto_sign/sphincs256/ref/sign.c"
    $storemerge2$i = $285;
   }
   $286 = (($level$i$0) + 1)|0; //@line 201 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $287 = $storemerge$i >> 1; //@line 194 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $level$i$0 = $286;$storemerge$i = $287;
  }
  $288 = HEAP32[$61>>2]|0; //@line 205 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $storemerge1$i = 0;
  while(1) {
   $exitcond39 = ($storemerge1$i|0)==(5); //@line 208 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if ($exitcond39) {
    break;
   }
   $289 = $storemerge1$i << 5; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $$sum53 = (($289) + 2144)|0; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $290 = (($$sroa$0$0$in) + ($$sum53)|0); //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $291 = 32 >>> $storemerge1$i; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $292 = $291 << 5; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $293 = $288 >> $storemerge1$i; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $294 = $293 << 5; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $295 = $294 ^ 32; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $$sum$i = (($292) + ($295))|0; //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $296 = (($tree$i) + ($$sum$i)|0); //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   dest=$290; src=$296; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0)); //@line 209 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $297 = (($storemerge1$i) + 1)|0; //@line 208 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $storemerge1$i = $297;
  }
  dest=$root; src=$215; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0)); //@line 212 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $298 = ((($$sroa$0$0$in)) + 2304|0); //@line 340 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $299 = $smlen; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $300 = $299; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $301 = HEAP32[$300>>2]|0; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $302 = (($299) + 4)|0; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $303 = $302; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $304 = HEAP32[$303>>2]|0; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $305 = (_i64Add(($301|0),($304|0),160,0)|0); //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $306 = tempRet0; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $307 = $smlen; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $308 = $307; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$308>>2] = $305; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $309 = (($307) + 4)|0; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $310 = $309; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$310>>2] = $306; //@line 341 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $311 = $64; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $312 = $311; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $313 = HEAP32[$312>>2]|0; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $314 = (($311) + 4)|0; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $315 = $314; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $316 = HEAP32[$315>>2]|0; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $317 = $313 & 31; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$61>>2] = $317; //@line 343 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $318 = (_bitshift64Lshr(($313|0),($316|0),5)|0); //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $319 = tempRet0; //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $320 = $64; //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $321 = $320; //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$321>>2] = $318; //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $322 = (($320) + 4)|0; //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $323 = $322; //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$323>>2] = $319; //@line 344 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $324 = (_i64Add(($219|0),($217|0),1,0)|0); //@line 330 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $325 = tempRet0; //@line 330 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $$sroa$0$0$in = $298;$217 = $325;$219 = $324;
 }
 $$cast$i7 = $tsk; //@line 5 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
 $327 = 1088;$329 = 0;$p$i6$sroa$0$0 = $$cast$i7;
 while(1) {
  $326 = ($327|0)==(0); //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $328 = ($329|0)==(0); //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $330 = $326 & $328; //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  if ($330) {
   break;
  }
  $331 = (_i64Add(($327|0),($329|0),-1,-1)|0); //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $332 = tempRet0; //@line 6 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $333 = $p$i6$sroa$0$0; //@line 7 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $334 = ((($333)) + 1|0); //@line 7 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $335 = $334; //@line 7 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  HEAP8[$333>>0] = 0; //@line 7 "c_src/crypto_sign/sphincs256/ref/zerobytes.c"
  $327 = $331;$329 = $332;$p$i6$sroa$0$0 = $335;
 }
 $336 = $smlen; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $337 = $336; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $338 = HEAP32[$337>>2]|0; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $339 = (($336) + 4)|0; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $340 = $339; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $341 = HEAP32[$340>>2]|0; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $342 = (_i64Add(($338|0),($341|0),($0|0),($1|0))|0); //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $343 = tempRet0; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $344 = $smlen; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $345 = $344; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$345>>2] = $342; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $346 = (($344) + 4)|0; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $347 = $346; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$347>>2] = $343; //@line 349 "c_src/crypto_sign/sphincs256/ref/sign.c"
 STACKTOP = sp;return 0; //@line 351 "c_src/crypto_sign/sphincs256/ref/sign.c"
}
function _crypto_sign_sphincs_open($m,$mlen,$sm,$0,$1,$pk) {
 $m = $m|0;
 $mlen = $mlen|0;
 $sm = $sm|0;
 $0 = $0|0;
 $1 = $1|0;
 $pk = $pk|0;
 var $$0 = 0, $$026 = 0, $$pre$phi51Z2D = 0, $$pre50 = 0, $$sroa$020$0$in = 0, $$sroa$020$1$in = 0, $$sroa$024$0$in = 0, $$sroa$024$0$in$sum = 0, $$sum = 0, $$sum77 = 0, $$sum78 = 0, $$sum7980 = 0, $$sum81 = 0, $$sum82 = 0, $$sum83 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0;
 var $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0;
 var $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0;
 var $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0;
 var $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0;
 var $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0;
 var $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0;
 var $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0;
 var $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0;
 var $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0;
 var $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0;
 var $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0;
 var $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0;
 var $320 = 0, $321 = 0, $322 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $R = 0, $basew$i = 0, $buffer$i = 0, $c$i$0 = 0;
 var $c$i$1 = 0, $exitcond = 0, $exitcond54 = 0, $exitcond55 = 0, $exitcond56 = 0, $exitcond57 = 0, $exitcond58 = 0, $exitcond59 = 0, $exitcond60 = 0, $exitcond61 = 0, $exitcond62 = 0, $exitcond63 = 0, $exitcond64 = 0, $exitcond65 = 0, $exitcond66 = 0, $exitcond67 = 0, $exitcond68 = 0, $exitcond69 = 0, $exitcond70 = 0, $exitcond71 = 0;
 var $exitcond72 = 0, $exitcond73 = 0, $exitcond74 = 0, $exitcond75 = 0, $exitcond76 = 0, $i$i7$0 = 0, $idx$i$0 = 0, $m_h = 0, $pkhash = 0, $root = 0, $sig = 0, $sigp$sroa$0$0$in = 0, $storemerge$i = 0, $storemerge$i$i = 0, $storemerge$i15 = 0, $storemerge$i15$i = 0, $storemerge$i8 = 0, $storemerge1$i = 0, $storemerge1$i$i = 0, $storemerge1$i16 = 0;
 var $storemerge1$i16$i = 0, $storemerge1$i9 = 0, $storemerge10$i = 0, $storemerge11$i = 0, $storemerge12$i = 0, $storemerge2$i = 0, $storemerge2$i17 = 0, $storemerge3$i = 0, $storemerge3$i19 = 0, $storemerge4$i = 0, $storemerge4$i18 = 0, $storemerge5$i = 0, $storemerge5$i13 = 0, $storemerge6$i = 0, $storemerge6$i14 = 0, $storemerge7$i = 0, $storemerge8$i = 0, $storemerge9$i = 0, $tpk = 0, $wots_pk = 0;
 var $x$i$i = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 45728|0;
 $basew$i = sp;
 $x$i$i = sp + 45656|0;
 $buffer$i = sp + 44632|0;
 $wots_pk = sp + 42488|0;
 $pkhash = sp + 42456|0;
 $root = sp + 42424|0;
 $sig = sp + 1424|0;
 $tpk = sp + 368|0;
 $m_h = sp + 304|0;
 $R = sp + 272|0;
 $2 = ($1>>>0)<(0); //@line 367 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $3 = ($0>>>0)<(41000); //@line 367 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $4 = ($1|0)==(0); //@line 367 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $5 = $4 & $3; //@line 367 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $6 = $2 | $5; //@line 367 "c_src/crypto_sign/sphincs256/ref/sign.c"
 if ($6) {
  $$026 = -1;
  STACKTOP = sp;return ($$026|0); //@line 449 "c_src/crypto_sign/sphincs256/ref/sign.c"
 } else {
  $10 = 0;$8 = 0;
 }
 while(1) {
  $7 = ($8>>>0)<(0); //@line 372 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $9 = ($10>>>0)<(1056); //@line 372 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $11 = ($8|0)==(0); //@line 372 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $12 = $11 & $9; //@line 372 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $13 = $7 | $12; //@line 372 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($13)) {
   $20 = 0;$22 = 0;
   break;
  }
  $14 = (($pk) + ($10)|0); //@line 373 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $15 = HEAP8[$14>>0]|0; //@line 373 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $16 = (($tpk) + ($10)|0); //@line 373 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$16>>0] = $15; //@line 373 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $17 = (_i64Add(($10|0),($8|0),1,0)|0); //@line 372 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $18 = tempRet0; //@line 372 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $10 = $17;$8 = $18;
 }
 while(1) {
  $19 = ($20>>>0)<(0); //@line 379 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $21 = ($22>>>0)<(32); //@line 379 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $23 = ($20|0)==(0); //@line 379 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $24 = $23 & $21; //@line 379 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $25 = $19 | $24; //@line 379 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($25)) {
   break;
  }
  $26 = (($sm) + ($22)|0); //@line 380 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $27 = HEAP8[$26>>0]|0; //@line 380 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $28 = (($R) + ($22)|0); //@line 380 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$28>>0] = $27; //@line 380 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $29 = (_i64Add(($22|0),($20|0),1,0)|0); //@line 379 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $30 = tempRet0; //@line 379 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $20 = $30;$22 = $29;
 }
 $31 = (_i64Add(($0|0),($1|0),-41000,0)|0); //@line 382 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $32 = tempRet0; //@line 382 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _memcpy(($sig|0),($sm|0),41000)|0; //@line 386 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $33 = ((($m)) + 1088|0); //@line 388 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $34 = ((($sm)) + 41000|0); //@line 388 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _memcpy(($33|0),($34|0),($31|0))|0; //@line 388 "c_src/crypto_sign/sphincs256/ref/sign.c"
 dest=$m; src=$R; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0)); //@line 391 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $35 = ((($m)) + 32|0); //@line 394 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _memcpy(($35|0),($tpk|0),1056)|0; //@line 394 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $36 = (($31) + 1088)|0; //@line 396 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $37 = ($36|0)<(0); //@line 396 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $38 = $37 << 31 >> 31; //@line 396 "c_src/crypto_sign/sphincs256/ref/sign.c"
 _crypto_hash_blake512_ref($m_h,$m,$36,$38); //@line 20 "c_src/crypto_sign/sphincs256/ref/hash.c"
 $40 = 0;$42 = 0;$54 = 0;$56 = 0;
 while(1) {
  $39 = ($40>>>0)<(0); //@line 404 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $41 = ($42>>>0)<(8); //@line 404 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $43 = ($40|0)==(0); //@line 404 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $44 = $43 & $41; //@line 404 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $45 = $39 | $44; //@line 404 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($45)) {
   break;
  }
  $$sum83 = (($42) + 32)|0; //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $46 = (($sig) + ($$sum83)|0); //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $47 = HEAP8[$46>>0]|0; //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $48 = $47&255; //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $49 = (_bitshift64Shl(($42|0),($40|0),3)|0); //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $50 = tempRet0; //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $51 = (_bitshift64Shl(($48|0),0,($49|0))|0); //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $52 = tempRet0; //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $53 = $54 ^ $51; //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $55 = $56 ^ $52; //@line 405 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $57 = (_i64Add(($42|0),($40|0),1,0)|0); //@line 404 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $58 = tempRet0; //@line 404 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $40 = $58;$42 = $57;$54 = $53;$56 = $55;
 }
 $59 = ((($sig)) + 2088|0); //@line 91 "c_src/crypto_sign/sphincs256/ref/horst.c"
 $60 = ((($buffer$i)) + 32|0); //@line 127 "c_src/crypto_sign/sphincs256/ref/horst.c"
 $61 = ((($tpk)) + 576|0); //@line 135 "c_src/crypto_sign/sphincs256/ref/horst.c"
 $$sroa$020$0$in = $59;$storemerge$i = 0;
 L14: while(1) {
  $62 = ($storemerge$i|0)<(32); //@line 93 "c_src/crypto_sign/sphincs256/ref/horst.c"
  if (!($62)) {
   label = 11;
   break;
  }
  $64 = $storemerge$i << 1; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $65 = (($m_h) + ($64)|0); //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $66 = HEAP8[$65>>0]|0; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $67 = $66&255; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $68 = $64 | 1; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $69 = (($m_h) + ($68)|0); //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $70 = HEAP8[$69>>0]|0; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $71 = $70&255; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $72 = $71 << 8; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $73 = $67 | $72; //@line 95 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $74 = $67 & 1; //@line 101 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $75 = ($74|0)==(0); //@line 101 "c_src/crypto_sign/sphincs256/ref/horst.c"
  L17: do {
   if ($75) {
    $storemerge$i$i = 0;
    while(1) {
     $exitcond71 = ($storemerge$i$i|0)==(32); //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
     if ($exitcond71) {
      break;
     }
     $76 = (($$sroa$020$0$in) + ($storemerge$i$i)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $77 = HEAP8[$76>>0]|0; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $78 = (($x$i$i) + ($storemerge$i$i)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     HEAP8[$78>>0] = $77; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $79 = (2224 + ($storemerge$i$i)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $80 = HEAP8[$79>>0]|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $81 = (($storemerge$i$i) + 32)|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $82 = (($x$i$i) + ($81)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     HEAP8[$82>>0] = $80; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $83 = (($storemerge$i$i) + 1)|0; //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $storemerge$i$i = $83;
    }
    _chacha_permute($x$i$i,$x$i$i); //@line 73 "c_src/crypto_sign/sphincs256/ref/hash.c"
    $storemerge1$i$i = 0;
    while(1) {
     $exitcond72 = ($storemerge1$i$i|0)==(32); //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
     if ($exitcond72) {
      break;
     }
     $84 = (($x$i$i) + ($storemerge1$i$i)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $85 = HEAP8[$84>>0]|0; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $86 = (($buffer$i) + ($storemerge1$i$i)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     HEAP8[$86>>0] = $85; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $87 = (($storemerge1$i$i) + 1)|0; //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $storemerge1$i$i = $87;
    }
    $storemerge6$i = 0;
    while(1) {
     $exitcond73 = ($storemerge6$i|0)==(32); //@line 104 "c_src/crypto_sign/sphincs256/ref/horst.c"
     if ($exitcond73) {
      break L17;
     }
     $88 = (($storemerge6$i) + 32)|0; //@line 105 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $89 = (($$sroa$020$0$in) + ($88)|0); //@line 105 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $90 = HEAP8[$89>>0]|0; //@line 105 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $91 = (($buffer$i) + ($88)|0); //@line 105 "c_src/crypto_sign/sphincs256/ref/horst.c"
     HEAP8[$91>>0] = $90; //@line 105 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $92 = (($storemerge6$i) + 1)|0; //@line 104 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $storemerge6$i = $92;
    }
   } else {
    $storemerge$i15$i = 0;
    while(1) {
     $exitcond68 = ($storemerge$i15$i|0)==(32); //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
     if ($exitcond68) {
      break;
     }
     $93 = (($$sroa$020$0$in) + ($storemerge$i15$i)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $94 = HEAP8[$93>>0]|0; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $95 = (($x$i$i) + ($storemerge$i15$i)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     HEAP8[$95>>0] = $94; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $96 = (2224 + ($storemerge$i15$i)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $97 = HEAP8[$96>>0]|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $98 = (($storemerge$i15$i) + 32)|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $99 = (($x$i$i) + ($98)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     HEAP8[$99>>0] = $97; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $100 = (($storemerge$i15$i) + 1)|0; //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $storemerge$i15$i = $100;
    }
    _chacha_permute($x$i$i,$x$i$i); //@line 73 "c_src/crypto_sign/sphincs256/ref/hash.c"
    $storemerge1$i16$i = 0;
    while(1) {
     $exitcond69 = ($storemerge1$i16$i|0)==(32); //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
     if ($exitcond69) {
      break;
     }
     $101 = (($x$i$i) + ($storemerge1$i16$i)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $102 = HEAP8[$101>>0]|0; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $$sum82 = (($storemerge1$i16$i) + 32)|0; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $103 = (($buffer$i) + ($$sum82)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     HEAP8[$103>>0] = $102; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $104 = (($storemerge1$i16$i) + 1)|0; //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
     $storemerge1$i16$i = $104;
    }
    $storemerge12$i = 0;
    while(1) {
     $exitcond70 = ($storemerge12$i|0)==(32); //@line 110 "c_src/crypto_sign/sphincs256/ref/horst.c"
     if ($exitcond70) {
      break L17;
     }
     $105 = (($storemerge12$i) + 32)|0; //@line 111 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $106 = (($$sroa$020$0$in) + ($105)|0); //@line 111 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $107 = HEAP8[$106>>0]|0; //@line 111 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $108 = (($buffer$i) + ($storemerge12$i)|0); //@line 111 "c_src/crypto_sign/sphincs256/ref/horst.c"
     HEAP8[$108>>0] = $107; //@line 111 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $109 = (($storemerge12$i) + 1)|0; //@line 110 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $storemerge12$i = $109;
    }
   }
  } while(0);
  $110 = ((($$sroa$020$0$in)) + 64|0); //@line 113 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $$sroa$020$1$in = $110;$idx$i$0 = $73;$storemerge7$i = 1;
  while(1) {
   $exitcond76 = ($storemerge7$i|0)==(10); //@line 115 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $111 = $idx$i$0 >>> 1; //@line 134 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond76) {
    break;
   }
   $112 = $111 & 1; //@line 119 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $113 = ($112|0)==(0); //@line 119 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $114 = $storemerge7$i << 6; //@line 121 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $115 = (($114) + -64)|0; //@line 121 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $116 = (($tpk) + ($115)|0); //@line 121 "c_src/crypto_sign/sphincs256/ref/horst.c"
   L44: do {
    if ($113) {
     _hash_2n_n_mask($buffer$i,$buffer$i,$116); //@line 121 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $storemerge10$i = 0;
     while(1) {
      $exitcond75 = ($storemerge10$i|0)==(32); //@line 122 "c_src/crypto_sign/sphincs256/ref/horst.c"
      if ($exitcond75) {
       break L44;
      }
      $117 = (($$sroa$020$1$in) + ($storemerge10$i)|0); //@line 123 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $118 = HEAP8[$117>>0]|0; //@line 123 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $119 = (($storemerge10$i) + 32)|0; //@line 123 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $120 = (($buffer$i) + ($119)|0); //@line 123 "c_src/crypto_sign/sphincs256/ref/horst.c"
      HEAP8[$120>>0] = $118; //@line 123 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $121 = (($storemerge10$i) + 1)|0; //@line 122 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $storemerge10$i = $121;
     }
    } else {
     _hash_2n_n_mask($60,$buffer$i,$116); //@line 127 "c_src/crypto_sign/sphincs256/ref/horst.c"
     $storemerge11$i = 0;
     while(1) {
      $exitcond74 = ($storemerge11$i|0)==(32); //@line 128 "c_src/crypto_sign/sphincs256/ref/horst.c"
      if ($exitcond74) {
       break L44;
      }
      $122 = (($$sroa$020$1$in) + ($storemerge11$i)|0); //@line 129 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $123 = HEAP8[$122>>0]|0; //@line 129 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $124 = (($buffer$i) + ($storemerge11$i)|0); //@line 129 "c_src/crypto_sign/sphincs256/ref/horst.c"
      HEAP8[$124>>0] = $123; //@line 129 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $125 = (($storemerge11$i) + 1)|0; //@line 128 "c_src/crypto_sign/sphincs256/ref/horst.c"
      $storemerge11$i = $125;
     }
    }
   } while(0);
   $126 = ((($$sroa$020$1$in)) + 32|0); //@line 131 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $127 = (($storemerge7$i) + 1)|0; //@line 115 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $$sroa$020$1$in = $126;$idx$i$0 = $111;$storemerge7$i = $127;
  }
  _hash_2n_n_mask($buffer$i,$buffer$i,$61); //@line 135 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $128 = $111 << 5; //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge8$i = 0;
  while(1) {
   $129 = ($storemerge8$i|0)<(32); //@line 137 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if (!($129)) {
    break;
   }
   $130 = (($128) + ($storemerge8$i))|0; //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $$sum81 = (($130) + 40)|0; //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $131 = (($sig) + ($$sum81)|0); //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $132 = HEAP8[$131>>0]|0; //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $133 = (($buffer$i) + ($storemerge8$i)|0); //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $134 = HEAP8[$133>>0]|0; //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $135 = ($132<<24>>24)==($134<<24>>24); //@line 138 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if (!($135)) {
    $storemerge9$i = 0;
    label = 59;
    break L14;
   }
   $136 = (($storemerge8$i) + 1)|0; //@line 137 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge8$i = $136;
  }
  $137 = (($storemerge$i) + 1)|0; //@line 93 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $$sroa$020$0$in = $$sroa$020$1$in;$storemerge$i = $137;
 }
 if ((label|0) == 11) {
  $63 = ((($tpk)) + 640|0); //@line 144 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge1$i = 0;
  while(1) {
   $exitcond67 = ($storemerge1$i|0)==(32); //@line 143 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond67) {
    break;
   }
   $139 = $storemerge1$i << 5; //@line 144 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $140 = (($buffer$i) + ($139)|0); //@line 144 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $141 = $storemerge1$i << 6; //@line 144 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $$sum7980 = $141 | 40; //@line 144 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $142 = (($sig) + ($$sum7980)|0); //@line 144 "c_src/crypto_sign/sphincs256/ref/horst.c"
   _hash_2n_n_mask($140,$142,$63); //@line 144 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $143 = (($storemerge1$i) + 1)|0; //@line 143 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge1$i = $143;
  }
  $138 = ((($tpk)) + 704|0); //@line 147 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge2$i = 0;
  while(1) {
   $exitcond66 = ($storemerge2$i|0)==(16); //@line 146 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond66) {
    break;
   }
   $145 = $storemerge2$i << 5; //@line 147 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $146 = (($buffer$i) + ($145)|0); //@line 147 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $147 = $storemerge2$i << 6; //@line 147 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $148 = (($buffer$i) + ($147)|0); //@line 147 "c_src/crypto_sign/sphincs256/ref/horst.c"
   _hash_2n_n_mask($146,$148,$138); //@line 147 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $149 = (($storemerge2$i) + 1)|0; //@line 146 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge2$i = $149;
  }
  $144 = ((($tpk)) + 768|0); //@line 150 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge3$i = 0;
  while(1) {
   $exitcond65 = ($storemerge3$i|0)==(8); //@line 149 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond65) {
    break;
   }
   $151 = $storemerge3$i << 5; //@line 150 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $152 = (($buffer$i) + ($151)|0); //@line 150 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $153 = $storemerge3$i << 6; //@line 150 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $154 = (($buffer$i) + ($153)|0); //@line 150 "c_src/crypto_sign/sphincs256/ref/horst.c"
   _hash_2n_n_mask($152,$154,$144); //@line 150 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $155 = (($storemerge3$i) + 1)|0; //@line 149 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge3$i = $155;
  }
  $150 = ((($tpk)) + 832|0); //@line 153 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge4$i = 0;
  while(1) {
   $exitcond64 = ($storemerge4$i|0)==(4); //@line 152 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond64) {
    break;
   }
   $157 = $storemerge4$i << 5; //@line 153 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $158 = (($buffer$i) + ($157)|0); //@line 153 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $159 = $storemerge4$i << 6; //@line 153 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $160 = (($buffer$i) + ($159)|0); //@line 153 "c_src/crypto_sign/sphincs256/ref/horst.c"
   _hash_2n_n_mask($158,$160,$150); //@line 153 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $161 = (($storemerge4$i) + 1)|0; //@line 152 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge4$i = $161;
  }
  $156 = ((($tpk)) + 896|0); //@line 156 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $storemerge5$i = 0;
  while(1) {
   $exitcond63 = ($storemerge5$i|0)==(2); //@line 155 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond63) {
    break;
   }
   $162 = $storemerge5$i << 5; //@line 156 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $163 = (($buffer$i) + ($162)|0); //@line 156 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $164 = $storemerge5$i << 6; //@line 156 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $165 = (($buffer$i) + ($164)|0); //@line 156 "c_src/crypto_sign/sphincs256/ref/horst.c"
   _hash_2n_n_mask($163,$165,$156); //@line 156 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $166 = (($storemerge5$i) + 1)|0; //@line 155 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge5$i = $166;
  }
  $167 = ((($tpk)) + 960|0); //@line 158 "c_src/crypto_sign/sphincs256/ref/horst.c"
  _hash_2n_n_mask($root,$buffer$i,$167); //@line 158 "c_src/crypto_sign/sphincs256/ref/horst.c"
  $$pre$phi51Z2D = $138;
 }
 else if ((label|0) == 59) {
  while(1) {
   label = 0;
   $exitcond62 = ($storemerge9$i|0)==(32); //@line 164 "c_src/crypto_sign/sphincs256/ref/horst.c"
   if ($exitcond62) {
    break;
   }
   $168 = (($root) + ($storemerge9$i)|0); //@line 165 "c_src/crypto_sign/sphincs256/ref/horst.c"
   HEAP8[$168>>0] = 0; //@line 165 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $169 = (($storemerge9$i) + 1)|0; //@line 164 "c_src/crypto_sign/sphincs256/ref/horst.c"
   $storemerge9$i = $169;
   label = 59;
  }
  $$pre50 = ((($tpk)) + 704|0); //@line 167 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $$pre$phi51Z2D = $$pre50;
 }
 $170 = ((($sig)) + 13352|0); //@line 414 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $171 = ((($x$i$i)) + 32|0); //@line 155 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $173 = 0;$175 = 0;$211 = $54;$249 = $56;$sigp$sroa$0$0$in = $170;
 while(1) {
  $172 = ($173>>>0)<(0); //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $174 = ($175>>>0)<(12); //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $176 = ($173|0)==(0); //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $177 = $176 & $174; //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $178 = $172 | $177; //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($178)) {
   break;
  }
  $c$i$0 = 0;$storemerge$i8 = 0;
  while(1) {
   $181 = ($storemerge$i8|0)<(64); //@line 88 "c_src/crypto_sign/sphincs256/ref/wots.c"
   if (!($181)) {
    $c$i$1 = $c$i$0;$i$i7$0 = 64;
    break;
   }
   $182 = (($storemerge$i8|0) / 2)&-1; //@line 90 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $183 = (($root) + ($182)|0); //@line 90 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $184 = HEAP8[$183>>0]|0; //@line 90 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $185 = $184&255; //@line 90 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $186 = $185 & 15; //@line 90 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $187 = (($basew$i) + ($storemerge$i8<<2)|0); //@line 90 "c_src/crypto_sign/sphincs256/ref/wots.c"
   HEAP32[$187>>2] = $186; //@line 90 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $188 = $185 >>> 4; //@line 91 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $189 = $storemerge$i8 | 1; //@line 91 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $190 = (($basew$i) + ($189<<2)|0); //@line 91 "c_src/crypto_sign/sphincs256/ref/wots.c"
   HEAP32[$190>>2] = $188; //@line 91 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $191 = $186 ^ 15; //@line 92 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $192 = (($c$i$0) + ($191))|0; //@line 92 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $193 = $188 ^ 15; //@line 93 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $194 = (($192) + ($193))|0; //@line 93 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $195 = (($storemerge$i8) + 2)|0; //@line 88 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $c$i$0 = $194;$storemerge$i8 = $195;
  }
  while(1) {
   $exitcond = ($i$i7$0|0)==(67); //@line 96 "c_src/crypto_sign/sphincs256/ref/wots.c"
   if ($exitcond) {
    $storemerge1$i9 = 0;
    break;
   }
   $196 = $c$i$1 & 15; //@line 98 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $197 = (($basew$i) + ($i$i7$0<<2)|0); //@line 98 "c_src/crypto_sign/sphincs256/ref/wots.c"
   HEAP32[$197>>2] = $196; //@line 98 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $198 = $c$i$1 >> 4; //@line 99 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $199 = (($i$i7$0) + 1)|0; //@line 96 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $c$i$1 = $198;$i$i7$0 = $199;
  }
  while(1) {
   $exitcond54 = ($storemerge1$i9|0)==(67); //@line 102 "c_src/crypto_sign/sphincs256/ref/wots.c"
   if ($exitcond54) {
    break;
   }
   $200 = $storemerge1$i9 << 5; //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $201 = (($wots_pk) + ($200)|0); //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $202 = (($sigp$sroa$0$0$in) + ($200)|0); //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $203 = (($basew$i) + ($storemerge1$i9<<2)|0); //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $204 = HEAP32[$203>>2]|0; //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $205 = $204 << 5; //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $206 = (($tpk) + ($205)|0); //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $207 = (15 - ($204))|0; //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   _gen_chain($201,$202,$206,$207); //@line 103 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $208 = (($storemerge1$i9) + 1)|0; //@line 102 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $storemerge1$i9 = $208;
  }
  $209 = ((($sigp$sroa$0$0$in)) + 2144|0); //@line 421 "c_src/crypto_sign/sphincs256/ref/sign.c"
  _l_tree($pkhash,$wots_pk,$tpk); //@line 424 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $210 = $211 & 31; //@line 425 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $212 = $211 & 1; //@line 134 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $213 = ($212|0)==(0); //@line 134 "c_src/crypto_sign/sphincs256/ref/sign.c"
  L100: do {
   if ($213) {
    $storemerge$i15 = 0;
    while(1) {
     $exitcond57 = ($storemerge$i15|0)==(32); //@line 143 "c_src/crypto_sign/sphincs256/ref/sign.c"
     if ($exitcond57) {
      $storemerge1$i16 = 0;
      break;
     }
     $223 = (($pkhash) + ($storemerge$i15)|0); //@line 144 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $224 = HEAP8[$223>>0]|0; //@line 144 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $225 = (($x$i$i) + ($storemerge$i15)|0); //@line 144 "c_src/crypto_sign/sphincs256/ref/sign.c"
     HEAP8[$225>>0] = $224; //@line 144 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $226 = (($storemerge$i15) + 1)|0; //@line 143 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $storemerge$i15 = $226;
    }
    while(1) {
     $exitcond58 = ($storemerge1$i16|0)==(32); //@line 145 "c_src/crypto_sign/sphincs256/ref/sign.c"
     if ($exitcond58) {
      $$0 = $210;$232 = $209;$storemerge2$i17 = 0;
      break L100;
     }
     $$sum78 = (($storemerge1$i16) + 2144)|0; //@line 146 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $227 = (($sigp$sroa$0$0$in) + ($$sum78)|0); //@line 146 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $228 = HEAP8[$227>>0]|0; //@line 146 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $229 = (($storemerge1$i16) + 32)|0; //@line 146 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $230 = (($x$i$i) + ($229)|0); //@line 146 "c_src/crypto_sign/sphincs256/ref/sign.c"
     HEAP8[$230>>0] = $228; //@line 146 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $231 = (($storemerge1$i16) + 1)|0; //@line 145 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $storemerge1$i16 = $231;
    }
   } else {
    $storemerge5$i13 = 0;
    while(1) {
     $exitcond55 = ($storemerge5$i13|0)==(32); //@line 136 "c_src/crypto_sign/sphincs256/ref/sign.c"
     if ($exitcond55) {
      $storemerge6$i14 = 0;
      break;
     }
     $214 = (($pkhash) + ($storemerge5$i13)|0); //@line 137 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $215 = HEAP8[$214>>0]|0; //@line 137 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $216 = (($storemerge5$i13) + 32)|0; //@line 137 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $217 = (($x$i$i) + ($216)|0); //@line 137 "c_src/crypto_sign/sphincs256/ref/sign.c"
     HEAP8[$217>>0] = $215; //@line 137 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $218 = (($storemerge5$i13) + 1)|0; //@line 136 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $storemerge5$i13 = $218;
    }
    while(1) {
     $exitcond56 = ($storemerge6$i14|0)==(32); //@line 138 "c_src/crypto_sign/sphincs256/ref/sign.c"
     if ($exitcond56) {
      $$0 = $210;$232 = $209;$storemerge2$i17 = 0;
      break L100;
     }
     $$sum77 = (($storemerge6$i14) + 2144)|0; //@line 139 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $219 = (($sigp$sroa$0$0$in) + ($$sum77)|0); //@line 139 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $220 = HEAP8[$219>>0]|0; //@line 139 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $221 = (($x$i$i) + ($storemerge6$i14)|0); //@line 139 "c_src/crypto_sign/sphincs256/ref/sign.c"
     HEAP8[$221>>0] = $220; //@line 139 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $222 = (($storemerge6$i14) + 1)|0; //@line 138 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $storemerge6$i14 = $222;
    }
   }
  } while(0);
  while(1) {
   $$sroa$024$0$in = ((($232)) + 32|0); //@line 148 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $exitcond61 = ($storemerge2$i17|0)==(4); //@line 150 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if ($exitcond61) {
    break;
   }
   $233 = $$0 >>> 1; //@line 152 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $234 = $233 & 1; //@line 153 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $235 = ($234|0)==(0); //@line 153 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $236 = $storemerge2$i17 << 6; //@line 161 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $237 = (($236) + 448)|0; //@line 161 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $238 = (($tpk) + ($237)|0); //@line 161 "c_src/crypto_sign/sphincs256/ref/sign.c"
   L116: do {
    if ($235) {
     _hash_2n_n_mask($x$i$i,$x$i$i,$238); //@line 161 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $storemerge3$i19 = 0;
     while(1) {
      $exitcond60 = ($storemerge3$i19|0)==(32); //@line 162 "c_src/crypto_sign/sphincs256/ref/sign.c"
      if ($exitcond60) {
       break L116;
      }
      $$sroa$024$0$in$sum = (($storemerge3$i19) + 32)|0; //@line 163 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $243 = (($232) + ($$sroa$024$0$in$sum)|0); //@line 163 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $244 = HEAP8[$243>>0]|0; //@line 163 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $245 = (($storemerge3$i19) + 32)|0; //@line 163 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $246 = (($x$i$i) + ($245)|0); //@line 163 "c_src/crypto_sign/sphincs256/ref/sign.c"
      HEAP8[$246>>0] = $244; //@line 163 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $247 = (($storemerge3$i19) + 1)|0; //@line 162 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $storemerge3$i19 = $247;
     }
    } else {
     _hash_2n_n_mask($171,$x$i$i,$238); //@line 155 "c_src/crypto_sign/sphincs256/ref/sign.c"
     $storemerge4$i18 = 0;
     while(1) {
      $exitcond59 = ($storemerge4$i18|0)==(32); //@line 156 "c_src/crypto_sign/sphincs256/ref/sign.c"
      if ($exitcond59) {
       break L116;
      }
      $$sum = (($storemerge4$i18) + 32)|0; //@line 157 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $239 = (($232) + ($$sum)|0); //@line 157 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $240 = HEAP8[$239>>0]|0; //@line 157 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $241 = (($x$i$i) + ($storemerge4$i18)|0); //@line 157 "c_src/crypto_sign/sphincs256/ref/sign.c"
      HEAP8[$241>>0] = $240; //@line 157 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $242 = (($storemerge4$i18) + 1)|0; //@line 156 "c_src/crypto_sign/sphincs256/ref/sign.c"
      $storemerge4$i18 = $242;
     }
    }
   } while(0);
   $248 = (($storemerge2$i17) + 1)|0; //@line 150 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $$0 = $233;$232 = $$sroa$024$0$in;$storemerge2$i17 = $248;
  }
  _hash_2n_n_mask($root,$x$i$i,$$pre$phi51Z2D); //@line 167 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $250 = (_bitshift64Lshr(($211|0),($249|0),5)|0); //@line 426 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $251 = tempRet0; //@line 426 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $252 = ((($sigp$sroa$0$0$in)) + 2304|0); //@line 428 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $253 = (_i64Add(($175|0),($173|0),1,0)|0); //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $254 = tempRet0; //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $173 = $254;$175 = $253;$211 = $250;$249 = $251;$sigp$sroa$0$0$in = $252;
 }
 $179 = (_i64Add(($0|0),($1|0),-41000,-1)|0); //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $180 = tempRet0; //@line 417 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $256 = 0;$258 = 0;
 while(1) {
  $255 = ($256>>>0)<(0); //@line 432 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $257 = ($258>>>0)<(32); //@line 432 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $259 = ($256|0)==(0); //@line 432 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $260 = $259 & $257; //@line 432 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $261 = $255 | $260; //@line 432 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($261)) {
   label = 94;
   break;
  }
  $262 = (($root) + ($258)|0); //@line 433 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $263 = HEAP8[$262>>0]|0; //@line 433 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $264 = (_i64Add(($258|0),($256|0),1024,0)|0); //@line 433 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $265 = tempRet0; //@line 433 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $266 = (($tpk) + ($264)|0); //@line 433 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $267 = HEAP8[$266>>0]|0; //@line 433 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $268 = ($263<<24>>24)==($267<<24>>24); //@line 433 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($268)) {
   break;
  }
  $269 = (_i64Add(($258|0),($256|0),1,0)|0); //@line 432 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $270 = tempRet0; //@line 432 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $256 = $270;$258 = $269;
 }
 if ((label|0) == 94) {
  $271 = $mlen; //@line 436 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $272 = $271; //@line 436 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$272>>2] = $179; //@line 436 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $273 = (($271) + 4)|0; //@line 436 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $274 = $273; //@line 436 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$274>>2] = $180; //@line 436 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $276 = 0;$277 = $180;$279 = 0;$280 = $179;
  while(1) {
   $275 = ($276>>>0)<($277>>>0); //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $278 = ($279>>>0)<($280>>>0); //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $281 = ($276|0)==($277|0); //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $282 = $281 & $278; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $283 = $275 | $282; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if (!($283)) {
    $$026 = 0;
    break;
   }
   $284 = (_i64Add(($279|0),($276|0),1088,0)|0); //@line 438 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $285 = tempRet0; //@line 438 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $286 = (($m) + ($284)|0); //@line 438 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $287 = HEAP8[$286>>0]|0; //@line 438 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $288 = (($m) + ($279)|0); //@line 438 "c_src/crypto_sign/sphincs256/ref/sign.c"
   HEAP8[$288>>0] = $287; //@line 438 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $289 = (_i64Add(($279|0),($276|0),1,0)|0); //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $290 = tempRet0; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $291 = $mlen; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $292 = $291; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $293 = HEAP32[$292>>2]|0; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $294 = (($291) + 4)|0; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $295 = $294; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $296 = HEAP32[$295>>2]|0; //@line 437 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $276 = $290;$277 = $296;$279 = $289;$280 = $293;
  }
  STACKTOP = sp;return ($$026|0); //@line 449 "c_src/crypto_sign/sphincs256/ref/sign.c"
 }
 $297 = $mlen; //@line 444 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $298 = $297; //@line 444 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$298>>2] = $179; //@line 444 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $299 = (($297) + 4)|0; //@line 444 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $300 = $299; //@line 444 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$300>>2] = $180; //@line 444 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $302 = 0;$303 = $180;$305 = 0;$306 = $179;
 while(1) {
  $301 = ($302>>>0)<($303>>>0); //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $304 = ($305>>>0)<($306>>>0); //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $307 = ($302|0)==($303|0); //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $308 = $307 & $304; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $309 = $301 | $308; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($309)) {
   break;
  }
  $310 = (($m) + ($305)|0); //@line 446 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$310>>0] = 0; //@line 446 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $311 = (_i64Add(($305|0),($302|0),1,0)|0); //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $312 = tempRet0; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $313 = $mlen; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $314 = $313; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $315 = HEAP32[$314>>2]|0; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $316 = (($313) + 4)|0; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $317 = $316; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $318 = HEAP32[$317>>2]|0; //@line 445 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $302 = $312;$303 = $318;$305 = $311;$306 = $315;
 }
 $319 = $mlen; //@line 447 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $320 = $319; //@line 447 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$320>>2] = -1; //@line 447 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $321 = (($319) + 4)|0; //@line 447 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $322 = $321; //@line 447 "c_src/crypto_sign/sphincs256/ref/sign.c"
 HEAP32[$322>>2] = -1; //@line 447 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $$026 = -1;
 STACKTOP = sp;return ($$026|0); //@line 449 "c_src/crypto_sign/sphincs256/ref/sign.c"
}
function _treehash($node,$sk,$leaf,$masks) {
 $node = $node|0;
 $sk = $sk|0;
 $leaf = $leaf|0;
 $masks = $masks|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $a = 0, $exitcond = 0, $exitcond4 = 0, $pk$i = 0, $seed$i = 0, $stackoffset$0 = 0, $storemerge = 0;
 var $storemerge$i$i = 0, $storemerge1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 2416|0;
 $seed$i = sp + 2384|0;
 $pk$i = sp + 240|0;
 $a = sp;
 ;HEAP32[$a>>2]=HEAP32[$leaf>>2]|0;HEAP32[$a+4>>2]=HEAP32[$leaf+4>>2]|0;HEAP32[$a+8>>2]=HEAP32[$leaf+8>>2]|0;HEAP32[$a+12>>2]=HEAP32[$leaf+12>>2]|0;HEAP32[$a+16>>2]=HEAP32[$leaf+16>>2]|0;HEAP32[$a+20>>2]=HEAP32[$leaf+20>>2]|0; //@line 100 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $0 = sp + 48|0; //@line 102 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $1 = sp + 24|0; //@line 103 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $2 = ((($a)) + 16|0); //@line 107 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $3 = HEAP32[$2>>2]|0; //@line 107 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $4 = (($3) + 32)|0; //@line 107 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $6 = $3;$stackoffset$0 = 0;
 while(1) {
  $5 = ($6|0)<($4|0); //@line 109 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if (!($5)) {
   $storemerge = 0;
   break;
  }
  $7 = $stackoffset$0 << 5; //@line 111 "c_src/crypto_sign/sphincs256/ref/sign.c"
  _get_seed($seed$i,$sk,$a); //@line 90 "c_src/crypto_sign/sphincs256/ref/sign.c"
  _prg($pk$i,2144,0,$seed$i); //@line 8 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $storemerge$i$i = 0;
  while(1) {
   $exitcond4 = ($storemerge$i$i|0)==(67); //@line 27 "c_src/crypto_sign/sphincs256/ref/wots.c"
   if ($exitcond4) {
    break;
   }
   $8 = $storemerge$i$i << 5; //@line 28 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $9 = (($pk$i) + ($8)|0); //@line 28 "c_src/crypto_sign/sphincs256/ref/wots.c"
   _gen_chain($9,$9,$masks,15); //@line 28 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $10 = (($storemerge$i$i) + 1)|0; //@line 27 "c_src/crypto_sign/sphincs256/ref/wots.c"
   $storemerge$i$i = $10;
  }
  $11 = (($0) + ($7)|0); //@line 111 "c_src/crypto_sign/sphincs256/ref/sign.c"
  _l_tree($11,$pk$i,$masks); //@line 93 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $12 = (($1) + ($stackoffset$0<<2)|0); //@line 112 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$12>>2] = 0; //@line 112 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $13 = (($stackoffset$0) + 1)|0; //@line 113 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $19 = 0;$storemerge1 = $13;
  while(1) {
   $14 = ($storemerge1>>>0)>(1); //@line 114 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if (!($14)) {
    break;
   }
   $15 = (($storemerge1) + -2)|0; //@line 114 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $16 = (($1) + ($15<<2)|0); //@line 114 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $17 = HEAP32[$16>>2]|0; //@line 114 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $18 = ($19|0)==($17|0); //@line 114 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if (!($18)) {
    break;
   }
   $20 = (($storemerge1) + -1)|0; //@line 114 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $21 = $19 << 6; //@line 117 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $22 = (($21) + 448)|0; //@line 117 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $23 = $storemerge1 << 5; //@line 118 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $24 = (($23) + -64)|0; //@line 118 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $25 = (($0) + ($24)|0); //@line 118 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $26 = (($masks) + ($22)|0); //@line 119 "c_src/crypto_sign/sphincs256/ref/sign.c"
   _hash_2n_n_mask($25,$25,$26); //@line 118 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $27 = (($19) + 1)|0; //@line 120 "c_src/crypto_sign/sphincs256/ref/sign.c"
   HEAP32[$16>>2] = $27; //@line 120 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $19 = $27;$storemerge1 = $20;
  }
  $28 = (($6) + 1)|0; //@line 109 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP32[$2>>2] = $28; //@line 109 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $6 = $28;$stackoffset$0 = $storemerge1;
 }
 while(1) {
  $exitcond = ($storemerge|0)==(32); //@line 124 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if ($exitcond) {
   break;
  }
  $29 = (($0) + ($storemerge)|0); //@line 125 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $30 = HEAP8[$29>>0]|0; //@line 125 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $31 = (($node) + ($storemerge)|0); //@line 125 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$31>>0] = $30; //@line 125 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $32 = (($storemerge) + 1)|0; //@line 124 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $storemerge = $32;
 }
 STACKTOP = sp;return; //@line 126 "c_src/crypto_sign/sphincs256/ref/sign.c"
}
function _get_seed($seed,$sk,$a) {
 $seed = $seed|0;
 $sk = $sk|0;
 $a = $a|0;
 var $$ = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $S$i$i = 0, $buffer = 0, $exitcond = 0, $exitcond4 = 0, $msglen$i$i$i = 0, $oo$i$i$i = 0, $storemerge = 0, $storemerge1 = 0, $zo$i$i$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 192|0;
 $msglen$i$i$i = sp + 176|0;
 $zo$i$i$i = sp + 169|0;
 $oo$i$i$i = sp + 168|0;
 $S$i$i = sp;
 $buffer = sp + 128|0;
 $storemerge = 0;
 while(1) {
  $exitcond4 = ($storemerge|0)==(32); //@line 44 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if ($exitcond4) {
   break;
  }
  $0 = (($sk) + ($storemerge)|0); //@line 45 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $1 = HEAP8[$0>>0]|0; //@line 45 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $2 = (($buffer) + ($storemerge)|0); //@line 45 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$2>>0] = $1; //@line 45 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $3 = (($storemerge) + 1)|0; //@line 44 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $storemerge = $3;
 }
 $4 = HEAP32[$a>>2]|0; //@line 48 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $5 = ($4|0)<(0); //@line 48 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $6 = $5 << 31 >> 31; //@line 48 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $7 = ((($a)) + 8|0); //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $8 = $7; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $9 = $8; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $10 = HEAP32[$9>>2]|0; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $11 = (($8) + 4)|0; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $12 = $11; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $13 = HEAP32[$12>>2]|0; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $14 = (_bitshift64Shl(($10|0),($13|0),4)|0); //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $15 = tempRet0; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $16 = $4 | $14; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $17 = $6 | $15; //@line 50 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $18 = ((($a)) + 16|0); //@line 52 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $19 = HEAP32[$18>>2]|0; //@line 52 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $20 = (_bitshift64Shl(($19|0),0,59)|0); //@line 52 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $21 = tempRet0; //@line 52 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $22 = $16 | $20; //@line 52 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $23 = $17 | $21; //@line 52 "c_src/crypto_sign/sphincs256/ref/sign.c"
 $storemerge1 = 0;
 while(1) {
  $exitcond = ($storemerge1|0)==(8); //@line 54 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if ($exitcond) {
   break;
  }
  $24 = $storemerge1 << 3; //@line 55 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $25 = (_bitshift64Lshr(($22|0),($23|0),($24|0))|0); //@line 55 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $26 = tempRet0; //@line 55 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $27 = $25&255; //@line 55 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $28 = (($storemerge1) + 32)|0; //@line 55 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $29 = (($buffer) + ($28)|0); //@line 55 "c_src/crypto_sign/sphincs256/ref/sign.c"
  HEAP8[$29>>0] = $27; //@line 55 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $30 = (($storemerge1) + 1)|0; //@line 54 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $storemerge1 = $30;
 }
 HEAP32[$S$i$i>>2] = 1779033703; //@line 105 "c_src/crypto_hash/blake256/ref/hash.c"
 $31 = ((($S$i$i)) + 4|0); //@line 106 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$31>>2] = -1150833019; //@line 106 "c_src/crypto_hash/blake256/ref/hash.c"
 $32 = ((($S$i$i)) + 8|0); //@line 107 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$32>>2] = 1013904242; //@line 107 "c_src/crypto_hash/blake256/ref/hash.c"
 $33 = ((($S$i$i)) + 12|0); //@line 108 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$33>>2] = -1521486534; //@line 108 "c_src/crypto_hash/blake256/ref/hash.c"
 $34 = ((($S$i$i)) + 16|0); //@line 109 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$34>>2] = 1359893119; //@line 109 "c_src/crypto_hash/blake256/ref/hash.c"
 $35 = ((($S$i$i)) + 20|0); //@line 110 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$35>>2] = -1694144372; //@line 110 "c_src/crypto_hash/blake256/ref/hash.c"
 $36 = ((($S$i$i)) + 24|0); //@line 111 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$36>>2] = 528734635; //@line 111 "c_src/crypto_hash/blake256/ref/hash.c"
 $37 = ((($S$i$i)) + 28|0); //@line 112 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$37>>2] = 1541459225; //@line 112 "c_src/crypto_hash/blake256/ref/hash.c"
 $38 = ((($S$i$i)) + 60|0); //@line 113 "c_src/crypto_hash/blake256/ref/hash.c"
 $39 = ((($S$i$i)) + 56|0); //@line 113 "c_src/crypto_hash/blake256/ref/hash.c"
 $40 = ((($S$i$i)) + 52|0); //@line 113 "c_src/crypto_hash/blake256/ref/hash.c"
 $41 = ((($S$i$i)) + 48|0); //@line 113 "c_src/crypto_hash/blake256/ref/hash.c"
 $42 = ((($S$i$i)) + 32|0); //@line 114 "c_src/crypto_hash/blake256/ref/hash.c"
 ;HEAP32[$42>>2]=0|0;HEAP32[$42+4>>2]=0|0;HEAP32[$42+8>>2]=0|0;HEAP32[$42+12>>2]=0|0;HEAP32[$42+16>>2]=0|0;HEAP32[$42+20>>2]=0|0;HEAP32[$42+24>>2]=0|0;HEAP32[$42+28>>2]=0|0; //@line 113 "c_src/crypto_hash/blake256/ref/hash.c"
 _blake256_update($S$i$i,$buffer,320,0); //@line 195 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$zo$i$i$i>>0] = 1; //@line 151 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$oo$i$i$i>>0] = -127; //@line 151 "c_src/crypto_hash/blake256/ref/hash.c"
 $43 = HEAP32[$41>>2]|0; //@line 152 "c_src/crypto_hash/blake256/ref/hash.c"
 $44 = HEAP32[$39>>2]|0; //@line 152 "c_src/crypto_hash/blake256/ref/hash.c"
 $45 = (($43) + ($44))|0; //@line 152 "c_src/crypto_hash/blake256/ref/hash.c"
 $46 = HEAP32[$40>>2]|0; //@line 152 "c_src/crypto_hash/blake256/ref/hash.c"
 $47 = ($45>>>0)<($44>>>0); //@line 153 "c_src/crypto_hash/blake256/ref/hash.c"
 $48 = (($46) + 1)|0; //@line 153 "c_src/crypto_hash/blake256/ref/hash.c"
 $$ = $47 ? $48 : $46; //@line 153 "c_src/crypto_hash/blake256/ref/hash.c"
 $49 = $$ >>> 24; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $50 = $49&255; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$msglen$i$i$i>>0] = $50; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $51 = $$ >>> 16; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $52 = $51&255; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $53 = ((($msglen$i$i$i)) + 1|0); //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$53>>0] = $52; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $54 = $$ >>> 8; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $55 = $54&255; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $56 = ((($msglen$i$i$i)) + 2|0); //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$56>>0] = $55; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $57 = $$&255; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $58 = ((($msglen$i$i$i)) + 3|0); //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$58>>0] = $57; //@line 154 "c_src/crypto_hash/blake256/ref/hash.c"
 $59 = $45 >>> 24; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $60 = $59&255; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $61 = ((($msglen$i$i$i)) + 4|0); //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$61>>0] = $60; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $62 = $45 >>> 16; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $63 = $62&255; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $64 = ((($msglen$i$i$i)) + 5|0); //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$64>>0] = $63; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $65 = $45 >>> 8; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $66 = $65&255; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $67 = ((($msglen$i$i$i)) + 6|0); //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$67>>0] = $66; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $68 = $45&255; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $69 = ((($msglen$i$i$i)) + 7|0); //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$69>>0] = $68; //@line 155 "c_src/crypto_hash/blake256/ref/hash.c"
 $70 = ($44|0)==(440); //@line 157 "c_src/crypto_hash/blake256/ref/hash.c"
 if ($70) {
  $71 = (($43) + -8)|0; //@line 158 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$41>>2] = $71; //@line 158 "c_src/crypto_hash/blake256/ref/hash.c"
  _blake256_update($S$i$i,$oo$i$i$i,8,0); //@line 159 "c_src/crypto_hash/blake256/ref/hash.c"
  $$pre = HEAP32[$41>>2]|0; //@line 177 "c_src/crypto_hash/blake256/ref/hash.c"
  $89 = $$pre;
 } else {
  $72 = ($44|0)<(440); //@line 162 "c_src/crypto_hash/blake256/ref/hash.c"
  if ($72) {
   $73 = ($44|0)==(0); //@line 163 "c_src/crypto_hash/blake256/ref/hash.c"
   if ($73) {
    HEAP32[$38>>2] = 1; //@line 163 "c_src/crypto_hash/blake256/ref/hash.c"
   }
   $74 = (($44) + -440)|0; //@line 164 "c_src/crypto_hash/blake256/ref/hash.c"
   $75 = (($43) + ($74))|0; //@line 164 "c_src/crypto_hash/blake256/ref/hash.c"
   HEAP32[$41>>2] = $75; //@line 164 "c_src/crypto_hash/blake256/ref/hash.c"
   $76 = (440 - ($44))|0; //@line 165 "c_src/crypto_hash/blake256/ref/hash.c"
   $77 = ($76|0)<(0); //@line 165 "c_src/crypto_hash/blake256/ref/hash.c"
   $78 = $77 << 31 >> 31; //@line 165 "c_src/crypto_hash/blake256/ref/hash.c"
   _blake256_update($S$i$i,1711,$76,$78); //@line 165 "c_src/crypto_hash/blake256/ref/hash.c"
  } else {
   $79 = (($44) + -512)|0; //@line 168 "c_src/crypto_hash/blake256/ref/hash.c"
   $80 = (($43) + ($79))|0; //@line 168 "c_src/crypto_hash/blake256/ref/hash.c"
   HEAP32[$41>>2] = $80; //@line 168 "c_src/crypto_hash/blake256/ref/hash.c"
   $81 = (512 - ($44))|0; //@line 169 "c_src/crypto_hash/blake256/ref/hash.c"
   $82 = ($81|0)<(0); //@line 169 "c_src/crypto_hash/blake256/ref/hash.c"
   $83 = $82 << 31 >> 31; //@line 169 "c_src/crypto_hash/blake256/ref/hash.c"
   _blake256_update($S$i$i,1711,$81,$83); //@line 169 "c_src/crypto_hash/blake256/ref/hash.c"
   $84 = HEAP32[$41>>2]|0; //@line 170 "c_src/crypto_hash/blake256/ref/hash.c"
   $85 = (($84) + -440)|0; //@line 170 "c_src/crypto_hash/blake256/ref/hash.c"
   HEAP32[$41>>2] = $85; //@line 170 "c_src/crypto_hash/blake256/ref/hash.c"
   _blake256_update($S$i$i,(1712),440,0); //@line 171 "c_src/crypto_hash/blake256/ref/hash.c"
   HEAP32[$38>>2] = 1; //@line 172 "c_src/crypto_hash/blake256/ref/hash.c"
  }
  _blake256_update($S$i$i,$zo$i$i$i,8,0); //@line 174 "c_src/crypto_hash/blake256/ref/hash.c"
  $86 = HEAP32[$41>>2]|0; //@line 175 "c_src/crypto_hash/blake256/ref/hash.c"
  $87 = (($86) + -8)|0; //@line 175 "c_src/crypto_hash/blake256/ref/hash.c"
  HEAP32[$41>>2] = $87; //@line 175 "c_src/crypto_hash/blake256/ref/hash.c"
  $89 = $87;
 }
 $88 = (($89) + -64)|0; //@line 177 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP32[$41>>2] = $88; //@line 177 "c_src/crypto_hash/blake256/ref/hash.c"
 _blake256_update($S$i$i,$msglen$i$i$i,64,0); //@line 178 "c_src/crypto_hash/blake256/ref/hash.c"
 $90 = HEAP32[$S$i$i>>2]|0; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $91 = $90 >>> 24; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $92 = $91&255; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$seed>>0] = $92; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $93 = HEAP32[$S$i$i>>2]|0; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $94 = $93 >>> 16; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $95 = $94&255; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $96 = ((($seed)) + 1|0); //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$96>>0] = $95; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $97 = HEAP32[$S$i$i>>2]|0; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $98 = $97 >>> 8; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $99 = $98&255; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $100 = ((($seed)) + 2|0); //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$100>>0] = $99; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $101 = HEAP32[$S$i$i>>2]|0; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $102 = $101&255; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $103 = ((($seed)) + 3|0); //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$103>>0] = $102; //@line 180 "c_src/crypto_hash/blake256/ref/hash.c"
 $104 = HEAP32[$31>>2]|0; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $105 = $104 >>> 24; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $106 = $105&255; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $107 = ((($seed)) + 4|0); //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$107>>0] = $106; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $108 = HEAP32[$31>>2]|0; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $109 = $108 >>> 16; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $110 = $109&255; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $111 = ((($seed)) + 5|0); //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$111>>0] = $110; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $112 = HEAP32[$31>>2]|0; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $113 = $112 >>> 8; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $114 = $113&255; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $115 = ((($seed)) + 6|0); //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$115>>0] = $114; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $116 = HEAP32[$31>>2]|0; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $117 = $116&255; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $118 = ((($seed)) + 7|0); //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$118>>0] = $117; //@line 181 "c_src/crypto_hash/blake256/ref/hash.c"
 $119 = HEAP32[$32>>2]|0; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $120 = $119 >>> 24; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $121 = $120&255; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $122 = ((($seed)) + 8|0); //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$122>>0] = $121; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $123 = HEAP32[$32>>2]|0; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $124 = $123 >>> 16; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $125 = $124&255; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $126 = ((($seed)) + 9|0); //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$126>>0] = $125; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $127 = HEAP32[$32>>2]|0; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $128 = $127 >>> 8; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $129 = $128&255; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $130 = ((($seed)) + 10|0); //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$130>>0] = $129; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $131 = HEAP32[$32>>2]|0; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $132 = $131&255; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $133 = ((($seed)) + 11|0); //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$133>>0] = $132; //@line 182 "c_src/crypto_hash/blake256/ref/hash.c"
 $134 = HEAP32[$33>>2]|0; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $135 = $134 >>> 24; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $136 = $135&255; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $137 = ((($seed)) + 12|0); //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$137>>0] = $136; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $138 = HEAP32[$33>>2]|0; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $139 = $138 >>> 16; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $140 = $139&255; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $141 = ((($seed)) + 13|0); //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$141>>0] = $140; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $142 = HEAP32[$33>>2]|0; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $143 = $142 >>> 8; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $144 = $143&255; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $145 = ((($seed)) + 14|0); //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$145>>0] = $144; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $146 = HEAP32[$33>>2]|0; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $147 = $146&255; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $148 = ((($seed)) + 15|0); //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$148>>0] = $147; //@line 183 "c_src/crypto_hash/blake256/ref/hash.c"
 $149 = HEAP32[$34>>2]|0; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $150 = $149 >>> 24; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $151 = $150&255; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $152 = ((($seed)) + 16|0); //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$152>>0] = $151; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $153 = HEAP32[$34>>2]|0; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $154 = $153 >>> 16; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $155 = $154&255; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $156 = ((($seed)) + 17|0); //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$156>>0] = $155; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $157 = HEAP32[$34>>2]|0; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $158 = $157 >>> 8; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $159 = $158&255; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $160 = ((($seed)) + 18|0); //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$160>>0] = $159; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $161 = HEAP32[$34>>2]|0; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $162 = $161&255; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $163 = ((($seed)) + 19|0); //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$163>>0] = $162; //@line 184 "c_src/crypto_hash/blake256/ref/hash.c"
 $164 = HEAP32[$35>>2]|0; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $165 = $164 >>> 24; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $166 = $165&255; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $167 = ((($seed)) + 20|0); //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$167>>0] = $166; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $168 = HEAP32[$35>>2]|0; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $169 = $168 >>> 16; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $170 = $169&255; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $171 = ((($seed)) + 21|0); //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$171>>0] = $170; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $172 = HEAP32[$35>>2]|0; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $173 = $172 >>> 8; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $174 = $173&255; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $175 = ((($seed)) + 22|0); //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$175>>0] = $174; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $176 = HEAP32[$35>>2]|0; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $177 = $176&255; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $178 = ((($seed)) + 23|0); //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$178>>0] = $177; //@line 185 "c_src/crypto_hash/blake256/ref/hash.c"
 $179 = HEAP32[$36>>2]|0; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $180 = $179 >>> 24; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $181 = $180&255; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $182 = ((($seed)) + 24|0); //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$182>>0] = $181; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $183 = HEAP32[$36>>2]|0; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $184 = $183 >>> 16; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $185 = $184&255; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $186 = ((($seed)) + 25|0); //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$186>>0] = $185; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $187 = HEAP32[$36>>2]|0; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $188 = $187 >>> 8; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $189 = $188&255; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $190 = ((($seed)) + 26|0); //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$190>>0] = $189; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $191 = HEAP32[$36>>2]|0; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $192 = $191&255; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $193 = ((($seed)) + 27|0); //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$193>>0] = $192; //@line 186 "c_src/crypto_hash/blake256/ref/hash.c"
 $194 = HEAP32[$37>>2]|0; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $195 = $194 >>> 24; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $196 = $195&255; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $197 = ((($seed)) + 28|0); //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$197>>0] = $196; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $198 = HEAP32[$37>>2]|0; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $199 = $198 >>> 16; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $200 = $199&255; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $201 = ((($seed)) + 29|0); //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$201>>0] = $200; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $202 = HEAP32[$37>>2]|0; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $203 = $202 >>> 8; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $204 = $203&255; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $205 = ((($seed)) + 30|0); //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$205>>0] = $204; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $206 = HEAP32[$37>>2]|0; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $207 = $206&255; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 $208 = ((($seed)) + 31|0); //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 HEAP8[$208>>0] = $207; //@line 187 "c_src/crypto_hash/blake256/ref/hash.c"
 STACKTOP = sp;return; //@line 61 "c_src/crypto_sign/sphincs256/ref/sign.c"
}
function _l_tree($leaf,$wots_pk,$masks) {
 $leaf = $leaf|0;
 $wots_pk = $wots_pk|0;
 $masks = $masks|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $exitcond = 0, $l$0 = 0;
 var $storemerge = 0, $storemerge1 = 0, $storemerge2 = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 $l$0 = 67;$storemerge = 0;
 while(1) {
  $exitcond = ($storemerge|0)==(7); //@line 68 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if ($exitcond) {
   break;
  }
  $0 = $l$0 >> 1; //@line 70 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $1 = $storemerge << 6; //@line 71 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $2 = (($masks) + ($1)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $storemerge1 = 0;
  while(1) {
   $3 = ($storemerge1|0)<($0|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/sign.c"
   if (!($3)) {
    break;
   }
   $4 = $storemerge1 << 5; //@line 71 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $5 = (($wots_pk) + ($4)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $6 = $storemerge1 << 6; //@line 71 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $7 = (($wots_pk) + ($6)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/sign.c"
   _hash_2n_n_mask($5,$7,$2); //@line 71 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $8 = (($storemerge1) + 1)|0; //@line 70 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $storemerge1 = $8;
  }
  $9 = $l$0 & 1; //@line 73 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $10 = ($9|0)==(0); //@line 73 "c_src/crypto_sign/sphincs256/ref/sign.c"
  if ($10) {
   $storemerge2 = $0;
  } else {
   $11 = $0 << 5; //@line 75 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $12 = (($wots_pk) + ($11)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $13 = $l$0 << 5; //@line 75 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $14 = (($13) + -32)|0; //@line 75 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $15 = (($wots_pk) + ($14)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/sign.c"
   dest=$12; src=$15; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0)); //@line 75 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $16 = (($0) + 1)|0; //@line 76 "c_src/crypto_sign/sphincs256/ref/sign.c"
   $storemerge2 = $16;
  }
  $17 = (($storemerge) + 1)|0; //@line 68 "c_src/crypto_sign/sphincs256/ref/sign.c"
  $l$0 = $storemerge2;$storemerge = $17;
 }
 dest=$leaf; src=$wots_pk; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0)); //@line 81 "c_src/crypto_sign/sphincs256/ref/sign.c"
 return; //@line 82 "c_src/crypto_sign/sphincs256/ref/sign.c"
}
function _gen_chain($out,$seed,$masks,$chainlen) {
 $out = $out|0;
 $seed = $seed|0;
 $masks = $masks|0;
 $chainlen = $chainlen|0;
 var $$op = 0, $$sum = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $buf$i = 0, $chainlen$op = 0, $exitcond = 0, $exitcond5 = 0, $exitcond6 = 0, $exitcond7 = 0, $exitcond8 = 0, $storemerge = 0, $storemerge$i = 0;
 var $storemerge$i$i = 0, $storemerge1 = 0, $storemerge1$i$i = 0, $x$i$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 96|0;
 $x$i$i = sp + 32|0;
 $buf$i = sp;
 $storemerge = 0;
 while(1) {
  $exitcond8 = ($storemerge|0)==(32); //@line 15 "c_src/crypto_sign/sphincs256/ref/wots.c"
  if ($exitcond8) {
   break;
  }
  $4 = (($seed) + ($storemerge)|0); //@line 16 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $5 = HEAP8[$4>>0]|0; //@line 16 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $6 = (($out) + ($storemerge)|0); //@line 16 "c_src/crypto_sign/sphincs256/ref/wots.c"
  HEAP8[$6>>0] = $5; //@line 16 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $7 = (($storemerge) + 1)|0; //@line 15 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $storemerge = $7;
 }
 $0 = ($chainlen|0)>(0);
 $chainlen$op = $chainlen ^ -1; //@line 14 "c_src/crypto_sign/sphincs256/ref/wots.c"
 $1 = $0 ? $chainlen$op : -1; //@line 14 "c_src/crypto_sign/sphincs256/ref/wots.c"
 $2 = ($1>>>0)>(4294967279);
 $$op = $1 ^ -1; //@line 14 "c_src/crypto_sign/sphincs256/ref/wots.c"
 $3 = $2 ? $$op : 16; //@line 14 "c_src/crypto_sign/sphincs256/ref/wots.c"
 $storemerge1 = 0;
 while(1) {
  $exitcond7 = ($storemerge1|0)==($3|0); //@line 18 "c_src/crypto_sign/sphincs256/ref/wots.c"
  if ($exitcond7) {
   break;
  }
  $8 = $storemerge1 << 5; //@line 19 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $storemerge$i = 0;
  while(1) {
   $exitcond = ($storemerge$i|0)==(32); //@line 84 "c_src/crypto_sign/sphincs256/ref/hash.c"
   if ($exitcond) {
    break;
   }
   $9 = (($out) + ($storemerge$i)|0); //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $10 = HEAP8[$9>>0]|0; //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $$sum = (($8) + ($storemerge$i))|0; //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $11 = (($masks) + ($$sum)|0); //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $12 = HEAP8[$11>>0]|0; //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $13 = $10 ^ $12; //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $14 = (($buf$i) + ($storemerge$i)|0); //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   HEAP8[$14>>0] = $13; //@line 85 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $15 = (($storemerge$i) + 1)|0; //@line 84 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $storemerge$i = $15;
  }
  $storemerge$i$i = 0;
  while(1) {
   $exitcond5 = ($storemerge$i$i|0)==(32); //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
   if ($exitcond5) {
    break;
   }
   $16 = (($buf$i) + ($storemerge$i$i)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $17 = HEAP8[$16>>0]|0; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $18 = (($x$i$i) + ($storemerge$i$i)|0); //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   HEAP8[$18>>0] = $17; //@line 70 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $19 = (2224 + ($storemerge$i$i)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $20 = HEAP8[$19>>0]|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $21 = (($storemerge$i$i) + 32)|0; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $22 = (($x$i$i) + ($21)|0); //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   HEAP8[$22>>0] = $20; //@line 71 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $23 = (($storemerge$i$i) + 1)|0; //@line 68 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $storemerge$i$i = $23;
  }
  _chacha_permute($x$i$i,$x$i$i); //@line 73 "c_src/crypto_sign/sphincs256/ref/hash.c"
  $storemerge1$i$i = 0;
  while(1) {
   $exitcond6 = ($storemerge1$i$i|0)==(32); //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
   if ($exitcond6) {
    break;
   }
   $24 = (($x$i$i) + ($storemerge1$i$i)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $25 = HEAP8[$24>>0]|0; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $26 = (($out) + ($storemerge1$i$i)|0); //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   HEAP8[$26>>0] = $25; //@line 75 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $27 = (($storemerge1$i$i) + 1)|0; //@line 74 "c_src/crypto_sign/sphincs256/ref/hash.c"
   $storemerge1$i$i = $27;
  }
  $28 = (($storemerge1) + 1)|0; //@line 18 "c_src/crypto_sign/sphincs256/ref/wots.c"
  $storemerge1 = $28;
 }
 STACKTOP = sp;return; //@line 20 "c_src/crypto_sign/sphincs256/ref/wots.c"
}
function _sphincsjs_public_key_bytes() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 1056; //@line 4 "sphincs.c"
}
function _sphincsjs_secret_key_bytes() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 1088; //@line 8 "sphincs.c"
}
function _sphincsjs_signature_bytes() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 41000; //@line 12 "sphincs.c"
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$0$i = 0, $$3$i = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i22$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre106 = 0, $$pre14$i$i = 0, $$pre43$i = 0, $$pre56$i$i = 0, $$pre57$i$i = 0, $$pre8$i = 0;
 var $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i13$i = 0, $$sum$i14$i = 0, $$sum$i17$i = 0, $$sum$i19$i = 0, $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i15$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0;
 var $$sum10$i$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0, $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum121$i = 0, $$sum122$i = 0, $$sum123$i = 0, $$sum124$i = 0, $$sum125$i = 0;
 var $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i16$i = 0, $$sum2$i18$i = 0, $$sum2$i21$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0;
 var $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0;
 var $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0;
 var $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0;
 var $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0;
 var $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0;
 var $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0;
 var $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0;
 var $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0;
 var $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0;
 var $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0;
 var $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0;
 var $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0;
 var $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0;
 var $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0;
 var $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0;
 var $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0;
 var $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0;
 var $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0;
 var $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0;
 var $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0;
 var $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0;
 var $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0;
 var $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0;
 var $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0;
 var $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0;
 var $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0;
 var $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0;
 var $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0;
 var $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0;
 var $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0;
 var $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0;
 var $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0;
 var $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0;
 var $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0;
 var $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0;
 var $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0;
 var $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0;
 var $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0;
 var $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0;
 var $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0;
 var $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0;
 var $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0;
 var $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0;
 var $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0;
 var $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0;
 var $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0;
 var $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0;
 var $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0;
 var $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0;
 var $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0;
 var $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0;
 var $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0;
 var $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0;
 var $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0;
 var $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0;
 var $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0;
 var $R$0$i = 0, $R$0$i$i = 0, $R$0$i18 = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i17 = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$050$i$i = 0, $T$06$i$i = 0, $br$0$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0;
 var $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $not$$i = 0, $not$$i$i = 0, $not$$i26$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i30 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond5$i = 0, $or$cond57$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0;
 var $rsize$0$i = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$183$i = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0;
 var $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[248>>2]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (288 + ($13<<2)|0);
    $$sum10 = (($13) + 2)|0;
    $15 = (288 + ($$sum10<<2)|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[248>>2] = $22;
     } else {
      $23 = HEAP32[(264)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[(256)>>2]|0;
   $35 = ($4>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $5;
     $38 = 2 << $5;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = (288 + ($65<<2)|0);
     $$sum4 = (($65) + 2)|0;
     $67 = (288 + ($$sum4<<2)|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ((($68)) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[248>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[(264)>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = ((($70)) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[(256)>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($4))|0;
     $82 = $4 | 3;
     $83 = ((($68)) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($4)|0);
     $85 = $81 | 1;
     $$sum56 = $4 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[(268)>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = (288 + ($92<<2)|0);
      $94 = HEAP32[248>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[248>>2] = $98;
       $$pre105 = (($92) + 2)|0;
       $$pre106 = (288 + ($$pre105<<2)|0);
       $$pre$phiZ2D = $$pre106;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = (288 + ($$sum9<<2)|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[(264)>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = ((($F4$0)) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = ((($90)) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = ((($90)) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[(256)>>2] = $81;
     HEAP32[(268)>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[(252)>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $4;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = (552 + ($130<<2)|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = ((($132)) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($4))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = ((($t$0$i)) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = ((($t$0$i)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = ((($144)) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($4))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(264)>>2]|0;
     $150 = ($v$0$i>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i) + ($4)|0);
     $152 = ($v$0$i>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = ((($v$0$i)) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($v$0$i)) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i|0);
     do {
      if ($157) {
       $167 = ((($v$0$i)) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = ((($v$0$i)) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = ((($R$0$i)) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = ((($R$0$i)) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i>>2] = 0;
        $R$1$i = $R$0$i;
        break;
       }
      } else {
       $158 = ((($v$0$i)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = ((($159)) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = ((($156)) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = ((($v$0$i)) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = (552 + ($182<<2)|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(252)>>2]|0;
         $189 = $188 & $187;
         HEAP32[(252)>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(264)>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = ((($154)) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = ((($154)) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(264)>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = ((($R$1$i)) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = ((($v$0$i)) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = ((($R$1$i)) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = ((($201)) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = ((($v$0$i)) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[(264)>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = ((($R$1$i)) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = ((($207)) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i) + ($4))|0;
      $215 = $214 | 3;
      $216 = ((($v$0$i)) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $4 | 3;
      $221 = ((($v$0$i)) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i | 1;
      $$sum$i35 = $4 | 4;
      $223 = (($v$0$i) + ($$sum$i35)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i) + ($4))|0;
      $224 = (($v$0$i) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i;
      $225 = HEAP32[(256)>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[(268)>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (288 + ($229<<2)|0);
       $231 = HEAP32[248>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[248>>2] = $235;
        $$pre$i = (($229) + 2)|0;
        $$pre8$i = (288 + ($$pre$i<<2)|0);
        $$pre$phi$iZ2D = $$pre8$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = (288 + ($$sum3$i<<2)|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(264)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = ((($F1$0$i)) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = ((($227)) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = ((($227)) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[(256)>>2] = $rsize$0$i;
      HEAP32[(268)>>2] = $151;
     }
     $243 = ((($v$0$i)) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(252)>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = (552 + ($idx$0$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
       label = 86;
      } else {
       $278 = ($idx$0$i|0)==(31);
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = ((($t$0$i14)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$331$i = $286;$t$230$i = $t$0$i14;$v$332$i = $t$0$i14;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = ((($t$0$i14)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = (((($t$0$i14)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $298 = ($t$1$i|0)==(0|0);
      $299 = ($v$2$i|0)==(0|0);
      $or$cond$i = $298 & $299;
      if ($or$cond$i) {
       $300 = 2 << $idx$0$i;
       $301 = (0 - ($300))|0;
       $302 = $300 | $301;
       $303 = $247 & $302;
       $304 = ($303|0)==(0);
       if ($304) {
        $nb$0 = $246;
        break;
       }
       $305 = (0 - ($303))|0;
       $306 = $303 & $305;
       $307 = (($306) + -1)|0;
       $308 = $307 >>> 12;
       $309 = $308 & 16;
       $310 = $307 >>> $309;
       $311 = $310 >>> 5;
       $312 = $311 & 8;
       $313 = $312 | $309;
       $314 = $310 >>> $312;
       $315 = $314 >>> 2;
       $316 = $315 & 4;
       $317 = $313 | $316;
       $318 = $314 >>> $316;
       $319 = $318 >>> 1;
       $320 = $319 & 2;
       $321 = $317 | $320;
       $322 = $318 >>> $320;
       $323 = $322 >>> 1;
       $324 = $323 & 1;
       $325 = $321 | $324;
       $326 = $322 >>> $324;
       $327 = (($325) + ($326))|0;
       $328 = (552 + ($327<<2)|0);
       $329 = HEAP32[$328>>2]|0;
       $t$2$ph$i = $329;$v$3$ph$i = 0;
      } else {
       $t$2$ph$i = $t$1$i;$v$3$ph$i = $v$2$i;
      }
      $330 = ($t$2$ph$i|0)==(0|0);
      if ($330) {
       $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$3$ph$i;
      } else {
       $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$3$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $331 = ((($t$230$i)) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = ((($t$230$i)) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        label = 90;
        continue;
       }
       $339 = ((($t$230$i)) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
        label = 90;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(256)>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[(264)>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = ((($v$3$lcssa$i)) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = ((($v$3$lcssa$i)) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = ((($v$3$lcssa$i)) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = ((($v$3$lcssa$i)) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = ((($R$0$i18)) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = ((($R$0$i18)) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17>>2] = 0;
          $R$1$i20 = $R$0$i18;
          break;
         }
        } else {
         $355 = ((($v$3$lcssa$i)) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = ((($356)) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = ((($353)) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = ((($v$3$lcssa$i)) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = (552 + ($379<<2)|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(252)>>2]|0;
           $386 = $385 & $384;
           HEAP32[(252)>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(264)>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($351)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = ((($351)) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(264)>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($R$1$i20)) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = ((($v$3$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($R$1$i20)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = ((($v$3$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[(264)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($R$1$i20)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L199: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = (288 + ($424<<2)|0);
          $426 = HEAP32[248>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          if ($429) {
           $430 = $426 | $427;
           HEAP32[248>>2] = $430;
           $$pre$i25 = (($424) + 2)|0;
           $$pre43$i = (288 + ($$pre$i25<<2)|0);
           $$pre$phi$i26Z2D = $$pre43$i;$F5$0$i = $425;
          } else {
           $$sum17$i = (($424) + 2)|0;
           $431 = (288 + ($$sum17$i<<2)|0);
           $432 = HEAP32[$431>>2]|0;
           $433 = HEAP32[(264)>>2]|0;
           $434 = ($432>>>0)<($433>>>0);
           if ($434) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
           }
          }
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = ((($F5$0$i)) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = (552 + ($I7$0$i<<2)|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[(252)>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(252)>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ((($475)) + 4|0);
         $477 = HEAP32[$476>>2]|0;
         $478 = $477 & -8;
         $479 = ($478|0)==($rsize$3$lcssa$i|0);
         L217: do {
          if ($479) {
           $T$0$lcssa$i = $475;
          } else {
           $480 = ($I7$0$i|0)==(31);
           $481 = $I7$0$i >>> 1;
           $482 = (25 - ($481))|0;
           $483 = $480 ? 0 : $482;
           $484 = $rsize$3$lcssa$i << $483;
           $K12$029$i = $484;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = (((($T$028$i)) + 16|0) + ($491<<2)|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = ((($487)) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L217;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[(264)>>2]|0;
           $495 = ($492>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$492>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L199;
           }
          }
         } while(0);
         $499 = ((($T$0$lcssa$i)) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[(264)>>2]|0;
         $502 = ($500>>>0)>=($501>>>0);
         $not$$i = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = $502 & $not$$i;
         if ($503) {
          $504 = ((($500)) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = ((($v$3$lcssa$i)) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(256)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(268)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(268)>>2] = $514;
   HEAP32[(256)>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(256)>>2] = 0;
   HEAP32[(268)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = ((($512)) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[(260)>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[(260)>>2] = $528;
  $529 = HEAP32[(272)>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[(272)>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = ((($529)) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = ((($529)) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[720>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[(728)>>2] = $538;
    HEAP32[(724)>>2] = $538;
    HEAP32[(732)>>2] = -1;
    HEAP32[(736)>>2] = -1;
    HEAP32[(740)>>2] = 0;
    HEAP32[(692)>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[720>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[(728)>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[(688)>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[(680)>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[(692)>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L258: do {
  if ($560) {
   $561 = HEAP32[(272)>>2]|0;
   $562 = ($561|0)==(0|0);
   L260: do {
    if ($562) {
     label = 174;
    } else {
     $sp$0$i$i = (696);
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = ((($sp$0$i$i)) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        break;
       }
      }
      $569 = ((($sp$0$i$i)) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 174;
       break L260;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $594 = HEAP32[(260)>>2]|0;
     $595 = (($548) - ($594))|0;
     $596 = $595 & $549;
     $597 = ($596>>>0)<(2147483647);
     if ($597) {
      $598 = (_sbrk(($596|0))|0);
      $599 = HEAP32[$sp$0$i$i>>2]|0;
      $600 = HEAP32[$565>>2]|0;
      $601 = (($599) + ($600)|0);
      $602 = ($598|0)==($601|0);
      $$3$i = $602 ? $596 : 0;
      if ($602) {
       $603 = ($598|0)==((-1)|0);
       if ($603) {
        $tsize$0323944$i = $$3$i;
       } else {
        $tbase$255$i = $598;$tsize$254$i = $$3$i;
        label = 194;
        break L258;
       }
      } else {
       $br$0$ph$i = $598;$ssize$1$ph$i = $596;$tsize$0$ph$i = $$3$i;
       label = 184;
      }
     } else {
      $tsize$0323944$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 174) {
     $572 = (_sbrk(0)|0);
     $573 = ($572|0)==((-1)|0);
     if ($573) {
      $tsize$0323944$i = 0;
     } else {
      $574 = $572;
      $575 = HEAP32[(724)>>2]|0;
      $576 = (($575) + -1)|0;
      $577 = $576 & $574;
      $578 = ($577|0)==(0);
      if ($578) {
       $ssize$0$i = $550;
      } else {
       $579 = (($576) + ($574))|0;
       $580 = (0 - ($575))|0;
       $581 = $579 & $580;
       $582 = (($550) - ($574))|0;
       $583 = (($582) + ($581))|0;
       $ssize$0$i = $583;
      }
      $584 = HEAP32[(680)>>2]|0;
      $585 = (($584) + ($ssize$0$i))|0;
      $586 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $587 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i30 = $586 & $587;
      if ($or$cond$i30) {
       $588 = HEAP32[(688)>>2]|0;
       $589 = ($588|0)==(0);
       if (!($589)) {
        $590 = ($585>>>0)<=($584>>>0);
        $591 = ($585>>>0)>($588>>>0);
        $or$cond2$i = $590 | $591;
        if ($or$cond2$i) {
         $tsize$0323944$i = 0;
         break;
        }
       }
       $592 = (_sbrk(($ssize$0$i|0))|0);
       $593 = ($592|0)==($572|0);
       $ssize$0$$i = $593 ? $ssize$0$i : 0;
       if ($593) {
        $tbase$255$i = $572;$tsize$254$i = $ssize$0$$i;
        label = 194;
        break L258;
       } else {
        $br$0$ph$i = $592;$ssize$1$ph$i = $ssize$0$i;$tsize$0$ph$i = $ssize$0$$i;
        label = 184;
       }
      } else {
       $tsize$0323944$i = 0;
      }
     }
    }
   } while(0);
   L280: do {
    if ((label|0) == 184) {
     $604 = (0 - ($ssize$1$ph$i))|0;
     $605 = ($br$0$ph$i|0)!=((-1)|0);
     $606 = ($ssize$1$ph$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $605;
     $607 = ($545>>>0)>($ssize$1$ph$i>>>0);
     $or$cond6$i = $607 & $or$cond5$i;
     do {
      if ($or$cond6$i) {
       $608 = HEAP32[(728)>>2]|0;
       $609 = (($547) - ($ssize$1$ph$i))|0;
       $610 = (($609) + ($608))|0;
       $611 = (0 - ($608))|0;
       $612 = $610 & $611;
       $613 = ($612>>>0)<(2147483647);
       if ($613) {
        $614 = (_sbrk(($612|0))|0);
        $615 = ($614|0)==((-1)|0);
        if ($615) {
         (_sbrk(($604|0))|0);
         $tsize$0323944$i = $tsize$0$ph$i;
         break L280;
        } else {
         $616 = (($612) + ($ssize$1$ph$i))|0;
         $ssize$2$i = $616;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$ph$i;
       }
      } else {
       $ssize$2$i = $ssize$1$ph$i;
      }
     } while(0);
     $617 = ($br$0$ph$i|0)==((-1)|0);
     if ($617) {
      $tsize$0323944$i = $tsize$0$ph$i;
     } else {
      $tbase$255$i = $br$0$ph$i;$tsize$254$i = $ssize$2$i;
      label = 194;
      break L258;
     }
    }
   } while(0);
   $618 = HEAP32[(692)>>2]|0;
   $619 = $618 | 4;
   HEAP32[(692)>>2] = $619;
   $tsize$1$i = $tsize$0323944$i;
   label = 191;
  } else {
   $tsize$1$i = 0;
   label = 191;
  }
 } while(0);
 if ((label|0) == 191) {
  $620 = ($550>>>0)<(2147483647);
  if ($620) {
   $621 = (_sbrk(($550|0))|0);
   $622 = (_sbrk(0)|0);
   $623 = ($621|0)!=((-1)|0);
   $624 = ($622|0)!=((-1)|0);
   $or$cond3$i = $623 & $624;
   $625 = ($621>>>0)<($622>>>0);
   $or$cond8$i = $625 & $or$cond3$i;
   if ($or$cond8$i) {
    $626 = $622;
    $627 = $621;
    $628 = (($626) - ($627))|0;
    $629 = (($nb$0) + 40)|0;
    $630 = ($628>>>0)>($629>>>0);
    $$tsize$1$i = $630 ? $628 : $tsize$1$i;
    if ($630) {
     $tbase$255$i = $621;$tsize$254$i = $$tsize$1$i;
     label = 194;
    }
   }
  }
 }
 if ((label|0) == 194) {
  $631 = HEAP32[(680)>>2]|0;
  $632 = (($631) + ($tsize$254$i))|0;
  HEAP32[(680)>>2] = $632;
  $633 = HEAP32[(684)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(684)>>2] = $632;
  }
  $635 = HEAP32[(272)>>2]|0;
  $636 = ($635|0)==(0|0);
  L299: do {
   if ($636) {
    $637 = HEAP32[(264)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$255$i>>>0)<($637>>>0);
    $or$cond9$i = $638 | $639;
    if ($or$cond9$i) {
     HEAP32[(264)>>2] = $tbase$255$i;
    }
    HEAP32[(696)>>2] = $tbase$255$i;
    HEAP32[(700)>>2] = $tsize$254$i;
    HEAP32[(708)>>2] = 0;
    $640 = HEAP32[720>>2]|0;
    HEAP32[(284)>>2] = $640;
    HEAP32[(280)>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $641 = $i$02$i$i << 1;
     $642 = (288 + ($641<<2)|0);
     $$sum$i$i = (($641) + 3)|0;
     $643 = (288 + ($$sum$i$i<<2)|0);
     HEAP32[$643>>2] = $642;
     $$sum1$i$i = (($641) + 2)|0;
     $644 = (288 + ($$sum1$i$i<<2)|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $645;
     }
    }
    $646 = (($tsize$254$i) + -40)|0;
    $647 = ((($tbase$255$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$255$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(272)>>2] = $654;
    HEAP32[(260)>>2] = $655;
    $656 = $655 | 1;
    $$sum$i13$i = (($653) + 4)|0;
    $657 = (($tbase$255$i) + ($$sum$i13$i)|0);
    HEAP32[$657>>2] = $656;
    $$sum2$i$i = (($tsize$254$i) + -36)|0;
    $658 = (($tbase$255$i) + ($$sum2$i$i)|0);
    HEAP32[$658>>2] = 40;
    $659 = HEAP32[(736)>>2]|0;
    HEAP32[(276)>>2] = $659;
   } else {
    $sp$084$i = (696);
    while(1) {
     $660 = HEAP32[$sp$084$i>>2]|0;
     $661 = ((($sp$084$i)) + 4|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = (($660) + ($662)|0);
     $664 = ($tbase$255$i|0)==($663|0);
     if ($664) {
      label = 204;
      break;
     }
     $665 = ((($sp$084$i)) + 8|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = ($666|0)==(0|0);
     if ($667) {
      break;
     } else {
      $sp$084$i = $666;
     }
    }
    if ((label|0) == 204) {
     $668 = ((($sp$084$i)) + 12|0);
     $669 = HEAP32[$668>>2]|0;
     $670 = $669 & 8;
     $671 = ($670|0)==(0);
     if ($671) {
      $672 = ($635>>>0)>=($660>>>0);
      $673 = ($635>>>0)<($tbase$255$i>>>0);
      $or$cond57$i = $673 & $672;
      if ($or$cond57$i) {
       $674 = (($662) + ($tsize$254$i))|0;
       HEAP32[$661>>2] = $674;
       $675 = HEAP32[(260)>>2]|0;
       $676 = (($675) + ($tsize$254$i))|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($676) - ($683))|0;
       HEAP32[(272)>>2] = $684;
       HEAP32[(260)>>2] = $685;
       $686 = $685 | 1;
       $$sum$i17$i = (($683) + 4)|0;
       $687 = (($635) + ($$sum$i17$i)|0);
       HEAP32[$687>>2] = $686;
       $$sum2$i18$i = (($676) + 4)|0;
       $688 = (($635) + ($$sum2$i18$i)|0);
       HEAP32[$688>>2] = 40;
       $689 = HEAP32[(736)>>2]|0;
       HEAP32[(276)>>2] = $689;
       break;
      }
     }
    }
    $690 = HEAP32[(264)>>2]|0;
    $691 = ($tbase$255$i>>>0)<($690>>>0);
    if ($691) {
     HEAP32[(264)>>2] = $tbase$255$i;
     $755 = $tbase$255$i;
    } else {
     $755 = $690;
    }
    $692 = (($tbase$255$i) + ($tsize$254$i)|0);
    $sp$183$i = (696);
    while(1) {
     $693 = HEAP32[$sp$183$i>>2]|0;
     $694 = ($693|0)==($692|0);
     if ($694) {
      label = 212;
      break;
     }
     $695 = ((($sp$183$i)) + 8|0);
     $696 = HEAP32[$695>>2]|0;
     $697 = ($696|0)==(0|0);
     if ($697) {
      $sp$0$i$i$i = (696);
      break;
     } else {
      $sp$183$i = $696;
     }
    }
    if ((label|0) == 212) {
     $698 = ((($sp$183$i)) + 12|0);
     $699 = HEAP32[$698>>2]|0;
     $700 = $699 & 8;
     $701 = ($700|0)==(0);
     if ($701) {
      HEAP32[$sp$183$i>>2] = $tbase$255$i;
      $702 = ((($sp$183$i)) + 4|0);
      $703 = HEAP32[$702>>2]|0;
      $704 = (($703) + ($tsize$254$i))|0;
      HEAP32[$702>>2] = $704;
      $705 = ((($tbase$255$i)) + 8|0);
      $706 = $705;
      $707 = $706 & 7;
      $708 = ($707|0)==(0);
      $709 = (0 - ($706))|0;
      $710 = $709 & 7;
      $711 = $708 ? 0 : $710;
      $712 = (($tbase$255$i) + ($711)|0);
      $$sum112$i = (($tsize$254$i) + 8)|0;
      $713 = (($tbase$255$i) + ($$sum112$i)|0);
      $714 = $713;
      $715 = $714 & 7;
      $716 = ($715|0)==(0);
      $717 = (0 - ($714))|0;
      $718 = $717 & 7;
      $719 = $716 ? 0 : $718;
      $$sum113$i = (($719) + ($tsize$254$i))|0;
      $720 = (($tbase$255$i) + ($$sum113$i)|0);
      $721 = $720;
      $722 = $712;
      $723 = (($721) - ($722))|0;
      $$sum$i19$i = (($711) + ($nb$0))|0;
      $724 = (($tbase$255$i) + ($$sum$i19$i)|0);
      $725 = (($723) - ($nb$0))|0;
      $726 = $nb$0 | 3;
      $$sum1$i20$i = (($711) + 4)|0;
      $727 = (($tbase$255$i) + ($$sum1$i20$i)|0);
      HEAP32[$727>>2] = $726;
      $728 = ($720|0)==($635|0);
      L324: do {
       if ($728) {
        $729 = HEAP32[(260)>>2]|0;
        $730 = (($729) + ($725))|0;
        HEAP32[(260)>>2] = $730;
        HEAP32[(272)>>2] = $724;
        $731 = $730 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $732 = (($tbase$255$i) + ($$sum42$i$i)|0);
        HEAP32[$732>>2] = $731;
       } else {
        $733 = HEAP32[(268)>>2]|0;
        $734 = ($720|0)==($733|0);
        if ($734) {
         $735 = HEAP32[(256)>>2]|0;
         $736 = (($735) + ($725))|0;
         HEAP32[(256)>>2] = $736;
         HEAP32[(268)>>2] = $724;
         $737 = $736 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $738 = (($tbase$255$i) + ($$sum40$i$i)|0);
         HEAP32[$738>>2] = $737;
         $$sum41$i$i = (($736) + ($$sum$i19$i))|0;
         $739 = (($tbase$255$i) + ($$sum41$i$i)|0);
         HEAP32[$739>>2] = $736;
         break;
        }
        $$sum2$i21$i = (($tsize$254$i) + 4)|0;
        $$sum114$i = (($$sum2$i21$i) + ($719))|0;
        $740 = (($tbase$255$i) + ($$sum114$i)|0);
        $741 = HEAP32[$740>>2]|0;
        $742 = $741 & 3;
        $743 = ($742|0)==(1);
        if ($743) {
         $744 = $741 & -8;
         $745 = $741 >>> 3;
         $746 = ($741>>>0)<(256);
         L332: do {
          if ($746) {
           $$sum3738$i$i = $719 | 8;
           $$sum124$i = (($$sum3738$i$i) + ($tsize$254$i))|0;
           $747 = (($tbase$255$i) + ($$sum124$i)|0);
           $748 = HEAP32[$747>>2]|0;
           $$sum39$i$i = (($tsize$254$i) + 12)|0;
           $$sum125$i = (($$sum39$i$i) + ($719))|0;
           $749 = (($tbase$255$i) + ($$sum125$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = $745 << 1;
           $752 = (288 + ($751<<2)|0);
           $753 = ($748|0)==($752|0);
           do {
            if (!($753)) {
             $754 = ($748>>>0)<($755>>>0);
             if ($754) {
              _abort();
              // unreachable;
             }
             $756 = ((($748)) + 12|0);
             $757 = HEAP32[$756>>2]|0;
             $758 = ($757|0)==($720|0);
             if ($758) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $759 = ($750|0)==($748|0);
           if ($759) {
            $760 = 1 << $745;
            $761 = $760 ^ -1;
            $762 = HEAP32[248>>2]|0;
            $763 = $762 & $761;
            HEAP32[248>>2] = $763;
            break;
           }
           $764 = ($750|0)==($752|0);
           do {
            if ($764) {
             $$pre57$i$i = ((($750)) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $765 = ($750>>>0)<($755>>>0);
             if ($765) {
              _abort();
              // unreachable;
             }
             $766 = ((($750)) + 8|0);
             $767 = HEAP32[$766>>2]|0;
             $768 = ($767|0)==($720|0);
             if ($768) {
              $$pre$phi58$i$iZ2D = $766;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $769 = ((($748)) + 12|0);
           HEAP32[$769>>2] = $750;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $748;
          } else {
           $$sum34$i$i = $719 | 24;
           $$sum115$i = (($$sum34$i$i) + ($tsize$254$i))|0;
           $770 = (($tbase$255$i) + ($$sum115$i)|0);
           $771 = HEAP32[$770>>2]|0;
           $$sum5$i$i = (($tsize$254$i) + 12)|0;
           $$sum116$i = (($$sum5$i$i) + ($719))|0;
           $772 = (($tbase$255$i) + ($$sum116$i)|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ($773|0)==($720|0);
           do {
            if ($774) {
             $$sum67$i$i = $719 | 16;
             $$sum122$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $784 = (($tbase$255$i) + ($$sum122$i)|0);
             $785 = HEAP32[$784>>2]|0;
             $786 = ($785|0)==(0|0);
             if ($786) {
              $$sum123$i = (($$sum67$i$i) + ($tsize$254$i))|0;
              $787 = (($tbase$255$i) + ($$sum123$i)|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $788;$RP$0$i$i = $787;
              }
             } else {
              $R$0$i$i = $785;$RP$0$i$i = $784;
             }
             while(1) {
              $790 = ((($R$0$i$i)) + 20|0);
              $791 = HEAP32[$790>>2]|0;
              $792 = ($791|0)==(0|0);
              if (!($792)) {
               $R$0$i$i = $791;$RP$0$i$i = $790;
               continue;
              }
              $793 = ((($R$0$i$i)) + 16|0);
              $794 = HEAP32[$793>>2]|0;
              $795 = ($794|0)==(0|0);
              if ($795) {
               break;
              } else {
               $R$0$i$i = $794;$RP$0$i$i = $793;
              }
             }
             $796 = ($RP$0$i$i>>>0)<($755>>>0);
             if ($796) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i>>2] = 0;
              $R$1$i$i = $R$0$i$i;
              break;
             }
            } else {
             $$sum3536$i$i = $719 | 8;
             $$sum117$i = (($$sum3536$i$i) + ($tsize$254$i))|0;
             $775 = (($tbase$255$i) + ($$sum117$i)|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776>>>0)<($755>>>0);
             if ($777) {
              _abort();
              // unreachable;
             }
             $778 = ((($776)) + 12|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = ($779|0)==($720|0);
             if (!($780)) {
              _abort();
              // unreachable;
             }
             $781 = ((($773)) + 8|0);
             $782 = HEAP32[$781>>2]|0;
             $783 = ($782|0)==($720|0);
             if ($783) {
              HEAP32[$778>>2] = $773;
              HEAP32[$781>>2] = $776;
              $R$1$i$i = $773;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $797 = ($771|0)==(0|0);
           if ($797) {
            break;
           }
           $$sum30$i$i = (($tsize$254$i) + 28)|0;
           $$sum118$i = (($$sum30$i$i) + ($719))|0;
           $798 = (($tbase$255$i) + ($$sum118$i)|0);
           $799 = HEAP32[$798>>2]|0;
           $800 = (552 + ($799<<2)|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = ($720|0)==($801|0);
           do {
            if ($802) {
             HEAP32[$800>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $803 = 1 << $799;
             $804 = $803 ^ -1;
             $805 = HEAP32[(252)>>2]|0;
             $806 = $805 & $804;
             HEAP32[(252)>>2] = $806;
             break L332;
            } else {
             $807 = HEAP32[(264)>>2]|0;
             $808 = ($771>>>0)<($807>>>0);
             if ($808) {
              _abort();
              // unreachable;
             }
             $809 = ((($771)) + 16|0);
             $810 = HEAP32[$809>>2]|0;
             $811 = ($810|0)==($720|0);
             if ($811) {
              HEAP32[$809>>2] = $R$1$i$i;
             } else {
              $812 = ((($771)) + 20|0);
              HEAP32[$812>>2] = $R$1$i$i;
             }
             $813 = ($R$1$i$i|0)==(0|0);
             if ($813) {
              break L332;
             }
            }
           } while(0);
           $814 = HEAP32[(264)>>2]|0;
           $815 = ($R$1$i$i>>>0)<($814>>>0);
           if ($815) {
            _abort();
            // unreachable;
           }
           $816 = ((($R$1$i$i)) + 24|0);
           HEAP32[$816>>2] = $771;
           $$sum3132$i$i = $719 | 16;
           $$sum119$i = (($$sum3132$i$i) + ($tsize$254$i))|0;
           $817 = (($tbase$255$i) + ($$sum119$i)|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           do {
            if (!($819)) {
             $820 = ($818>>>0)<($814>>>0);
             if ($820) {
              _abort();
              // unreachable;
             } else {
              $821 = ((($R$1$i$i)) + 16|0);
              HEAP32[$821>>2] = $818;
              $822 = ((($818)) + 24|0);
              HEAP32[$822>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum120$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $823 = (($tbase$255$i) + ($$sum120$i)|0);
           $824 = HEAP32[$823>>2]|0;
           $825 = ($824|0)==(0|0);
           if ($825) {
            break;
           }
           $826 = HEAP32[(264)>>2]|0;
           $827 = ($824>>>0)<($826>>>0);
           if ($827) {
            _abort();
            // unreachable;
           } else {
            $828 = ((($R$1$i$i)) + 20|0);
            HEAP32[$828>>2] = $824;
            $829 = ((($824)) + 24|0);
            HEAP32[$829>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $744 | $719;
         $$sum121$i = (($$sum9$i$i) + ($tsize$254$i))|0;
         $830 = (($tbase$255$i) + ($$sum121$i)|0);
         $831 = (($744) + ($725))|0;
         $oldfirst$0$i$i = $830;$qsize$0$i$i = $831;
        } else {
         $oldfirst$0$i$i = $720;$qsize$0$i$i = $725;
        }
        $832 = ((($oldfirst$0$i$i)) + 4|0);
        $833 = HEAP32[$832>>2]|0;
        $834 = $833 & -2;
        HEAP32[$832>>2] = $834;
        $835 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $836 = (($tbase$255$i) + ($$sum10$i$i)|0);
        HEAP32[$836>>2] = $835;
        $$sum11$i$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $837 = (($tbase$255$i) + ($$sum11$i$i)|0);
        HEAP32[$837>>2] = $qsize$0$i$i;
        $838 = $qsize$0$i$i >>> 3;
        $839 = ($qsize$0$i$i>>>0)<(256);
        if ($839) {
         $840 = $838 << 1;
         $841 = (288 + ($840<<2)|0);
         $842 = HEAP32[248>>2]|0;
         $843 = 1 << $838;
         $844 = $842 & $843;
         $845 = ($844|0)==(0);
         do {
          if ($845) {
           $846 = $842 | $843;
           HEAP32[248>>2] = $846;
           $$pre$i22$i = (($840) + 2)|0;
           $$pre56$i$i = (288 + ($$pre$i22$i<<2)|0);
           $$pre$phi$i23$iZ2D = $$pre56$i$i;$F4$0$i$i = $841;
          } else {
           $$sum29$i$i = (($840) + 2)|0;
           $847 = (288 + ($$sum29$i$i<<2)|0);
           $848 = HEAP32[$847>>2]|0;
           $849 = HEAP32[(264)>>2]|0;
           $850 = ($848>>>0)<($849>>>0);
           if (!($850)) {
            $$pre$phi$i23$iZ2D = $847;$F4$0$i$i = $848;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i23$iZ2D>>2] = $724;
         $851 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$851>>2] = $724;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $852 = (($tbase$255$i) + ($$sum27$i$i)|0);
         HEAP32[$852>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $853 = (($tbase$255$i) + ($$sum28$i$i)|0);
         HEAP32[$853>>2] = $841;
         break;
        }
        $854 = $qsize$0$i$i >>> 8;
        $855 = ($854|0)==(0);
        do {
         if ($855) {
          $I7$0$i$i = 0;
         } else {
          $856 = ($qsize$0$i$i>>>0)>(16777215);
          if ($856) {
           $I7$0$i$i = 31;
           break;
          }
          $857 = (($854) + 1048320)|0;
          $858 = $857 >>> 16;
          $859 = $858 & 8;
          $860 = $854 << $859;
          $861 = (($860) + 520192)|0;
          $862 = $861 >>> 16;
          $863 = $862 & 4;
          $864 = $863 | $859;
          $865 = $860 << $863;
          $866 = (($865) + 245760)|0;
          $867 = $866 >>> 16;
          $868 = $867 & 2;
          $869 = $864 | $868;
          $870 = (14 - ($869))|0;
          $871 = $865 << $868;
          $872 = $871 >>> 15;
          $873 = (($870) + ($872))|0;
          $874 = $873 << 1;
          $875 = (($873) + 7)|0;
          $876 = $qsize$0$i$i >>> $875;
          $877 = $876 & 1;
          $878 = $877 | $874;
          $I7$0$i$i = $878;
         }
        } while(0);
        $879 = (552 + ($I7$0$i$i<<2)|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $880 = (($tbase$255$i) + ($$sum12$i$i)|0);
        HEAP32[$880>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $881 = (($tbase$255$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $882 = (($tbase$255$i) + ($$sum14$i$i)|0);
        HEAP32[$882>>2] = 0;
        HEAP32[$881>>2] = 0;
        $883 = HEAP32[(252)>>2]|0;
        $884 = 1 << $I7$0$i$i;
        $885 = $883 & $884;
        $886 = ($885|0)==(0);
        if ($886) {
         $887 = $883 | $884;
         HEAP32[(252)>>2] = $887;
         HEAP32[$879>>2] = $724;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $888 = (($tbase$255$i) + ($$sum15$i$i)|0);
         HEAP32[$888>>2] = $879;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $889 = (($tbase$255$i) + ($$sum16$i$i)|0);
         HEAP32[$889>>2] = $724;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $890 = (($tbase$255$i) + ($$sum17$i$i)|0);
         HEAP32[$890>>2] = $724;
         break;
        }
        $891 = HEAP32[$879>>2]|0;
        $892 = ((($891)) + 4|0);
        $893 = HEAP32[$892>>2]|0;
        $894 = $893 & -8;
        $895 = ($894|0)==($qsize$0$i$i|0);
        L418: do {
         if ($895) {
          $T$0$lcssa$i25$i = $891;
         } else {
          $896 = ($I7$0$i$i|0)==(31);
          $897 = $I7$0$i$i >>> 1;
          $898 = (25 - ($897))|0;
          $899 = $896 ? 0 : $898;
          $900 = $qsize$0$i$i << $899;
          $K8$051$i$i = $900;$T$050$i$i = $891;
          while(1) {
           $907 = $K8$051$i$i >>> 31;
           $908 = (((($T$050$i$i)) + 16|0) + ($907<<2)|0);
           $903 = HEAP32[$908>>2]|0;
           $909 = ($903|0)==(0|0);
           if ($909) {
            break;
           }
           $901 = $K8$051$i$i << 1;
           $902 = ((($903)) + 4|0);
           $904 = HEAP32[$902>>2]|0;
           $905 = $904 & -8;
           $906 = ($905|0)==($qsize$0$i$i|0);
           if ($906) {
            $T$0$lcssa$i25$i = $903;
            break L418;
           } else {
            $K8$051$i$i = $901;$T$050$i$i = $903;
           }
          }
          $910 = HEAP32[(264)>>2]|0;
          $911 = ($908>>>0)<($910>>>0);
          if ($911) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$908>>2] = $724;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $912 = (($tbase$255$i) + ($$sum23$i$i)|0);
           HEAP32[$912>>2] = $T$050$i$i;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $913 = (($tbase$255$i) + ($$sum24$i$i)|0);
           HEAP32[$913>>2] = $724;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $914 = (($tbase$255$i) + ($$sum25$i$i)|0);
           HEAP32[$914>>2] = $724;
           break L324;
          }
         }
        } while(0);
        $915 = ((($T$0$lcssa$i25$i)) + 8|0);
        $916 = HEAP32[$915>>2]|0;
        $917 = HEAP32[(264)>>2]|0;
        $918 = ($916>>>0)>=($917>>>0);
        $not$$i26$i = ($T$0$lcssa$i25$i>>>0)>=($917>>>0);
        $919 = $918 & $not$$i26$i;
        if ($919) {
         $920 = ((($916)) + 12|0);
         HEAP32[$920>>2] = $724;
         HEAP32[$915>>2] = $724;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $921 = (($tbase$255$i) + ($$sum20$i$i)|0);
         HEAP32[$921>>2] = $916;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $922 = (($tbase$255$i) + ($$sum21$i$i)|0);
         HEAP32[$922>>2] = $T$0$lcssa$i25$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $923 = (($tbase$255$i) + ($$sum22$i$i)|0);
         HEAP32[$923>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $711 | 8;
      $924 = (($tbase$255$i) + ($$sum1819$i$i)|0);
      $mem$0 = $924;
      return ($mem$0|0);
     } else {
      $sp$0$i$i$i = (696);
     }
    }
    while(1) {
     $925 = HEAP32[$sp$0$i$i$i>>2]|0;
     $926 = ($925>>>0)>($635>>>0);
     if (!($926)) {
      $927 = ((($sp$0$i$i$i)) + 4|0);
      $928 = HEAP32[$927>>2]|0;
      $929 = (($925) + ($928)|0);
      $930 = ($929>>>0)>($635>>>0);
      if ($930) {
       break;
      }
     }
     $931 = ((($sp$0$i$i$i)) + 8|0);
     $932 = HEAP32[$931>>2]|0;
     $sp$0$i$i$i = $932;
    }
    $$sum$i14$i = (($928) + -47)|0;
    $$sum1$i15$i = (($928) + -39)|0;
    $933 = (($925) + ($$sum1$i15$i)|0);
    $934 = $933;
    $935 = $934 & 7;
    $936 = ($935|0)==(0);
    $937 = (0 - ($934))|0;
    $938 = $937 & 7;
    $939 = $936 ? 0 : $938;
    $$sum2$i16$i = (($$sum$i14$i) + ($939))|0;
    $940 = (($925) + ($$sum2$i16$i)|0);
    $941 = ((($635)) + 16|0);
    $942 = ($940>>>0)<($941>>>0);
    $943 = $942 ? $635 : $940;
    $944 = ((($943)) + 8|0);
    $945 = (($tsize$254$i) + -40)|0;
    $946 = ((($tbase$255$i)) + 8|0);
    $947 = $946;
    $948 = $947 & 7;
    $949 = ($948|0)==(0);
    $950 = (0 - ($947))|0;
    $951 = $950 & 7;
    $952 = $949 ? 0 : $951;
    $953 = (($tbase$255$i) + ($952)|0);
    $954 = (($945) - ($952))|0;
    HEAP32[(272)>>2] = $953;
    HEAP32[(260)>>2] = $954;
    $955 = $954 | 1;
    $$sum$i$i$i = (($952) + 4)|0;
    $956 = (($tbase$255$i) + ($$sum$i$i$i)|0);
    HEAP32[$956>>2] = $955;
    $$sum2$i$i$i = (($tsize$254$i) + -36)|0;
    $957 = (($tbase$255$i) + ($$sum2$i$i$i)|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(736)>>2]|0;
    HEAP32[(276)>>2] = $958;
    $959 = ((($943)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$944>>2]=HEAP32[(696)>>2]|0;HEAP32[$944+4>>2]=HEAP32[(696)+4>>2]|0;HEAP32[$944+8>>2]=HEAP32[(696)+8>>2]|0;HEAP32[$944+12>>2]=HEAP32[(696)+12>>2]|0;
    HEAP32[(696)>>2] = $tbase$255$i;
    HEAP32[(700)>>2] = $tsize$254$i;
    HEAP32[(708)>>2] = 0;
    HEAP32[(704)>>2] = $944;
    $960 = ((($943)) + 28|0);
    HEAP32[$960>>2] = 7;
    $961 = ((($943)) + 32|0);
    $962 = ($961>>>0)<($929>>>0);
    if ($962) {
     $964 = $960;
     while(1) {
      $963 = ((($964)) + 4|0);
      HEAP32[$963>>2] = 7;
      $965 = ((($964)) + 8|0);
      $966 = ($965>>>0)<($929>>>0);
      if ($966) {
       $964 = $963;
      } else {
       break;
      }
     }
    }
    $967 = ($943|0)==($635|0);
    if (!($967)) {
     $968 = $943;
     $969 = $635;
     $970 = (($968) - ($969))|0;
     $971 = HEAP32[$959>>2]|0;
     $972 = $971 & -2;
     HEAP32[$959>>2] = $972;
     $973 = $970 | 1;
     $974 = ((($635)) + 4|0);
     HEAP32[$974>>2] = $973;
     HEAP32[$943>>2] = $970;
     $975 = $970 >>> 3;
     $976 = ($970>>>0)<(256);
     if ($976) {
      $977 = $975 << 1;
      $978 = (288 + ($977<<2)|0);
      $979 = HEAP32[248>>2]|0;
      $980 = 1 << $975;
      $981 = $979 & $980;
      $982 = ($981|0)==(0);
      if ($982) {
       $983 = $979 | $980;
       HEAP32[248>>2] = $983;
       $$pre$i$i = (($977) + 2)|0;
       $$pre14$i$i = (288 + ($$pre$i$i<<2)|0);
       $$pre$phi$i$iZ2D = $$pre14$i$i;$F$0$i$i = $978;
      } else {
       $$sum4$i$i = (($977) + 2)|0;
       $984 = (288 + ($$sum4$i$i<<2)|0);
       $985 = HEAP32[$984>>2]|0;
       $986 = HEAP32[(264)>>2]|0;
       $987 = ($985>>>0)<($986>>>0);
       if ($987) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $984;$F$0$i$i = $985;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $988 = ((($F$0$i$i)) + 12|0);
      HEAP32[$988>>2] = $635;
      $989 = ((($635)) + 8|0);
      HEAP32[$989>>2] = $F$0$i$i;
      $990 = ((($635)) + 12|0);
      HEAP32[$990>>2] = $978;
      break;
     }
     $991 = $970 >>> 8;
     $992 = ($991|0)==(0);
     if ($992) {
      $I1$0$i$i = 0;
     } else {
      $993 = ($970>>>0)>(16777215);
      if ($993) {
       $I1$0$i$i = 31;
      } else {
       $994 = (($991) + 1048320)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 8;
       $997 = $991 << $996;
       $998 = (($997) + 520192)|0;
       $999 = $998 >>> 16;
       $1000 = $999 & 4;
       $1001 = $1000 | $996;
       $1002 = $997 << $1000;
       $1003 = (($1002) + 245760)|0;
       $1004 = $1003 >>> 16;
       $1005 = $1004 & 2;
       $1006 = $1001 | $1005;
       $1007 = (14 - ($1006))|0;
       $1008 = $1002 << $1005;
       $1009 = $1008 >>> 15;
       $1010 = (($1007) + ($1009))|0;
       $1011 = $1010 << 1;
       $1012 = (($1010) + 7)|0;
       $1013 = $970 >>> $1012;
       $1014 = $1013 & 1;
       $1015 = $1014 | $1011;
       $I1$0$i$i = $1015;
      }
     }
     $1016 = (552 + ($I1$0$i$i<<2)|0);
     $1017 = ((($635)) + 28|0);
     HEAP32[$1017>>2] = $I1$0$i$i;
     $1018 = ((($635)) + 20|0);
     HEAP32[$1018>>2] = 0;
     HEAP32[$941>>2] = 0;
     $1019 = HEAP32[(252)>>2]|0;
     $1020 = 1 << $I1$0$i$i;
     $1021 = $1019 & $1020;
     $1022 = ($1021|0)==(0);
     if ($1022) {
      $1023 = $1019 | $1020;
      HEAP32[(252)>>2] = $1023;
      HEAP32[$1016>>2] = $635;
      $1024 = ((($635)) + 24|0);
      HEAP32[$1024>>2] = $1016;
      $1025 = ((($635)) + 12|0);
      HEAP32[$1025>>2] = $635;
      $1026 = ((($635)) + 8|0);
      HEAP32[$1026>>2] = $635;
      break;
     }
     $1027 = HEAP32[$1016>>2]|0;
     $1028 = ((($1027)) + 4|0);
     $1029 = HEAP32[$1028>>2]|0;
     $1030 = $1029 & -8;
     $1031 = ($1030|0)==($970|0);
     L459: do {
      if ($1031) {
       $T$0$lcssa$i$i = $1027;
      } else {
       $1032 = ($I1$0$i$i|0)==(31);
       $1033 = $I1$0$i$i >>> 1;
       $1034 = (25 - ($1033))|0;
       $1035 = $1032 ? 0 : $1034;
       $1036 = $970 << $1035;
       $K2$07$i$i = $1036;$T$06$i$i = $1027;
       while(1) {
        $1043 = $K2$07$i$i >>> 31;
        $1044 = (((($T$06$i$i)) + 16|0) + ($1043<<2)|0);
        $1039 = HEAP32[$1044>>2]|0;
        $1045 = ($1039|0)==(0|0);
        if ($1045) {
         break;
        }
        $1037 = $K2$07$i$i << 1;
        $1038 = ((($1039)) + 4|0);
        $1040 = HEAP32[$1038>>2]|0;
        $1041 = $1040 & -8;
        $1042 = ($1041|0)==($970|0);
        if ($1042) {
         $T$0$lcssa$i$i = $1039;
         break L459;
        } else {
         $K2$07$i$i = $1037;$T$06$i$i = $1039;
        }
       }
       $1046 = HEAP32[(264)>>2]|0;
       $1047 = ($1044>>>0)<($1046>>>0);
       if ($1047) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$1044>>2] = $635;
        $1048 = ((($635)) + 24|0);
        HEAP32[$1048>>2] = $T$06$i$i;
        $1049 = ((($635)) + 12|0);
        HEAP32[$1049>>2] = $635;
        $1050 = ((($635)) + 8|0);
        HEAP32[$1050>>2] = $635;
        break L299;
       }
      }
     } while(0);
     $1051 = ((($T$0$lcssa$i$i)) + 8|0);
     $1052 = HEAP32[$1051>>2]|0;
     $1053 = HEAP32[(264)>>2]|0;
     $1054 = ($1052>>>0)>=($1053>>>0);
     $not$$i$i = ($T$0$lcssa$i$i>>>0)>=($1053>>>0);
     $1055 = $1054 & $not$$i$i;
     if ($1055) {
      $1056 = ((($1052)) + 12|0);
      HEAP32[$1056>>2] = $635;
      HEAP32[$1051>>2] = $635;
      $1057 = ((($635)) + 8|0);
      HEAP32[$1057>>2] = $1052;
      $1058 = ((($635)) + 12|0);
      HEAP32[$1058>>2] = $T$0$lcssa$i$i;
      $1059 = ((($635)) + 24|0);
      HEAP32[$1059>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1060 = HEAP32[(260)>>2]|0;
  $1061 = ($1060>>>0)>($nb$0>>>0);
  if ($1061) {
   $1062 = (($1060) - ($nb$0))|0;
   HEAP32[(260)>>2] = $1062;
   $1063 = HEAP32[(272)>>2]|0;
   $1064 = (($1063) + ($nb$0)|0);
   HEAP32[(272)>>2] = $1064;
   $1065 = $1062 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1066 = (($1063) + ($$sum$i32)|0);
   HEAP32[$1066>>2] = $1065;
   $1067 = $nb$0 | 3;
   $1068 = ((($1063)) + 4|0);
   HEAP32[$1068>>2] = $1067;
   $1069 = ((($1063)) + 8|0);
   $mem$0 = $1069;
   return ($mem$0|0);
  }
 }
 $1070 = HEAP32[200>>2]|0;
 $1071 = ($1070|0)==(0|0);
 if ($1071) {
  $$0$i = 244;
 } else {
  $1072 = (_pthread_self()|0);
  $1073 = ((($1072)) + 60|0);
  $1074 = HEAP32[$1073>>2]|0;
  $$0$i = $1074;
 }
 HEAP32[$$0$i>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$pre57 = 0, $$pre58 = 0, $$pre60 = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum1718 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0, $$sum25 = 0;
 var $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0;
 var $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0;
 var $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0;
 var $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0;
 var $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0;
 var $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0;
 var $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0;
 var $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0, $R7$1 = 0;
 var $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$051 = 0, $cond = 0, $cond47 = 0, $not$ = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(264)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[(268)>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[(256)>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum20 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum20)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum30 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum30)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum31 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum31)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = (288 + ($25<<2)|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = ((($22)) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[248>>2]|0;
     $36 = $35 & $34;
     HEAP32[248>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre60 = ((($24)) + 8|0);
     $$pre$phi61Z2D = $$pre60;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = ((($24)) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi61Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = ((($22)) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi61Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum22 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum22)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum23 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum23)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum25 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum25)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum24 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum24)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = ((($R$0)) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = ((($R$0)) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum29 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum29)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = ((($49)) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = ((($46)) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum26 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum26)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (552 + ($72<<2)|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(252)>>2]|0;
      $79 = $78 & $77;
      HEAP32[(252)>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(264)>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = ((($44)) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = ((($44)) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(264)>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = ((($R$1)) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum27 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum27)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = ((($R$1)) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = ((($91)) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum28)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[(264)>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = ((($R$1)) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = ((($97)) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum19 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum19)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[(272)>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[(260)>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[(260)>>2] = $120;
   HEAP32[(272)>>2] = $p$0;
   $121 = $120 | 1;
   $122 = ((($p$0)) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[(268)>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[(268)>>2] = 0;
   HEAP32[(256)>>2] = 0;
   return;
  }
  $125 = HEAP32[(268)>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[(256)>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[(256)>>2] = $128;
   HEAP32[(268)>>2] = $p$0;
   $129 = $128 | 1;
   $130 = ((($p$0)) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum1718 = $8 | 4;
    $138 = (($mem) + ($$sum1718)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = (288 + ($140<<2)|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[(264)>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = ((($137)) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[248>>2]|0;
     $152 = $151 & $150;
     HEAP32[248>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre58 = ((($139)) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $154 = HEAP32[(264)>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = ((($139)) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi59Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = ((($137)) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi59Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = ((($R7$0)) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = ((($R7$0)) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[(264)>>2]|0;
      $188 = ($RP9$0>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[(264)>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = ((($166)) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = ((($163)) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum12 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum12)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = (552 + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond47 = ($R7$1|0)==(0|0);
      if ($cond47) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(252)>>2]|0;
       $198 = $197 & $196;
       HEAP32[(252)>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(264)>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = ((($161)) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = ((($161)) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(264)>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = ((($R7$1)) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum13 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum13)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = ((($R7$1)) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = ((($210)) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum14 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum14)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[(264)>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = ((($R7$1)) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = ((($216)) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = ((($p$0)) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[(268)>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[(256)>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = ((($p$0)) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = (288 + ($233<<2)|0);
  $235 = HEAP32[248>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[248>>2] = $239;
   $$pre = (($233) + 2)|0;
   $$pre57 = (288 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre57;$F16$0 = $234;
  } else {
   $$sum11 = (($233) + 2)|0;
   $240 = (288 + ($$sum11<<2)|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[(264)>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = ((($F16$0)) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = ((($p$0)) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = ((($p$0)) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = (552 + ($I18$0<<2)|0);
 $273 = ((($p$0)) + 28|0);
 HEAP32[$273>>2] = $I18$0;
 $274 = ((($p$0)) + 16|0);
 $275 = ((($p$0)) + 20|0);
 HEAP32[$275>>2] = 0;
 HEAP32[$274>>2] = 0;
 $276 = HEAP32[(252)>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(252)>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = ((($p$0)) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = ((($p$0)) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = ((($p$0)) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ((($284)) + 4|0);
   $286 = HEAP32[$285>>2]|0;
   $287 = $286 & -8;
   $288 = ($287|0)==($psize$1|0);
   L202: do {
    if ($288) {
     $T$0$lcssa = $284;
    } else {
     $289 = ($I18$0|0)==(31);
     $290 = $I18$0 >>> 1;
     $291 = (25 - ($290))|0;
     $292 = $289 ? 0 : $291;
     $293 = $psize$1 << $292;
     $K19$052 = $293;$T$051 = $284;
     while(1) {
      $300 = $K19$052 >>> 31;
      $301 = (((($T$051)) + 16|0) + ($300<<2)|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       break;
      }
      $294 = $K19$052 << 1;
      $295 = ((($296)) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L202;
      } else {
       $K19$052 = $294;$T$051 = $296;
      }
     }
     $303 = HEAP32[(264)>>2]|0;
     $304 = ($301>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$301>>2] = $p$0;
      $305 = ((($p$0)) + 24|0);
      HEAP32[$305>>2] = $T$051;
      $306 = ((($p$0)) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = ((($p$0)) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = ((($T$0$lcssa)) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[(264)>>2]|0;
   $311 = ($309>>>0)>=($310>>>0);
   $not$ = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = $311 & $not$;
   if ($312) {
    $313 = ((($309)) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = ((($p$0)) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = ((($p$0)) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = ((($p$0)) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[(280)>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[(280)>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = (704);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = ((($sp$0$i)) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(280)>>2] = -1;
 return;
}
function runPostSets() {
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _memmove(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if (((src|0) < (dest|0)) & ((dest|0) < ((src + num)|0))) {
      // Unlikely case: Copy backwards in a safe manner
      ret = dest;
      src = (src + num)|0;
      dest = (dest + num)|0;
      while ((num|0) > 0) {
        dest = (dest - 1)|0;
        src = (src - 1)|0;
        num = (num - 1)|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      }
      dest = ret;
    } else {
      _memcpy(dest, src, num) | 0;
    }
    return dest | 0;
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return $10$0 | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



  


// EMSCRIPTEN_END_FUNCS


  return { _crypto_sign_sphincs_open: _crypto_sign_sphincs_open, _i64Subtract: _i64Subtract, _free: _free, _crypto_sign_sphincs: _crypto_sign_sphincs, _i64Add: _i64Add, _crypto_sign_sphincs_keypair: _crypto_sign_sphincs_keypair, _sphincsjs_public_key_bytes: _sphincsjs_public_key_bytes, _memset: _memset, _sphincsjs_secret_key_bytes: _sphincsjs_secret_key_bytes, _malloc: _malloc, _memcpy: _memcpy, _memmove: _memmove, _bitshift64Lshr: _bitshift64Lshr, _sphincsjs_signature_bytes: _sphincsjs_signature_bytes, _randombytes_stir: _randombytes_stir, _bitshift64Shl: _bitshift64Shl, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0 };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _crypto_sign_sphincs_open = Module["_crypto_sign_sphincs_open"] = asm["_crypto_sign_sphincs_open"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _crypto_sign_sphincs = Module["_crypto_sign_sphincs"] = asm["_crypto_sign_sphincs"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _crypto_sign_sphincs_keypair = Module["_crypto_sign_sphincs_keypair"] = asm["_crypto_sign_sphincs_keypair"];
var _sphincsjs_public_key_bytes = Module["_sphincsjs_public_key_bytes"] = asm["_sphincsjs_public_key_bytes"];
var _memset = Module["_memset"] = asm["_memset"];
var _sphincsjs_secret_key_bytes = Module["_sphincsjs_secret_key_bytes"] = asm["_sphincsjs_secret_key_bytes"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _sphincsjs_signature_bytes = Module["_sphincsjs_signature_bytes"] = asm["_sphincsjs_signature_bytes"];
var _randombytes_stir = Module["_randombytes_stir"] = asm["_randombytes_stir"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===


function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();


    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}


// EMSCRIPTEN_GENERATED_FUNCTIONS: ["_i64Subtract","_i64Add","_memset","_bitshift64Lshr","_bitshift64Shl","_memcpy","_memmove","_bitshift64Ashr","_llvm_cttz_i32"]


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
			Module._free(publicKeyBuffer);
			Module._free(privateKeyBuffer);
		}
	},

	sign: function (message, privateKey) {
		var signedLength		= message.length + sphincs.signatureLength;

		var signedBuffer		= Module._malloc(signedLength);
		// var signedLengthBuffer	= Module._malloc(256);
		var messageBuffer		= Module._malloc(message.length);
		var privateKeyBuffer	= Module._malloc(privateKey.length);

		Module.writeArrayToMemory(message, messageBuffer);
		Module.writeArrayToMemory(privateKey, privateKeyBuffer);

		try {
			var returnValue	= Module._crypto_sign_sphincs(
				signedBuffer,
				0, // signedLengthBuffer,
				messageBuffer,
				message.length,
				privateKeyBuffer
			);

			return dataReturn(returnValue, dataResult(signedBuffer, signedLength));
		}
		finally {
			Module._free(signedBuffer);
			// Module._free(signedLengthBuffer);
			Module._free(messageBuffer);
			Module._free(privateKeyBuffer);
		}
	},

	open: function (signed, publicKey) {
		var openedLength	= signed.length - sphincs.signatureLength;

		var openedBuffer	= Module._malloc(openedLength);
		// var openedLengthBuffer	= Module._malloc(256);
		var signedBuffer	= Module._malloc(signed.length);
		var publicKeyBuffer	= Module._malloc(publicKey.length);

		Module.writeArrayToMemory(signed, signedBuffer);
		Module.writeArrayToMemory(publicKey, publicKeyBuffer);

		try {
			var returnValue	= Module._crypto_sign_sphincs_open(
				openedBuffer,
				0, // openedLengthBuffer,
				signedBuffer,
				signed.length,
				publicKeyBuffer
			);

			return dataReturn(returnValue, dataResult(openedBuffer, openedLength));
		}
		finally {
			Module._free(openedBuffer);
			// Module._free(openedLengthBuffer);
			Module._free(signedBuffer);
			Module._free(publicKeyBuffer);
		}
	}
};



return sphincs;

}());

self.sphincs	= sphincs;

//# sourceMappingURL=sphincs.debug.js.map