var sphincs = function() {
    var Module = {};
    var _Module = Module;
    Module.ready = new Promise(function(resolve, reject) {
        var Module = _Module;
        Module.onAbort = reject;
        Module.onRuntimeInitialized = function() {
            try {
                Module._sphincsjs_public_key_bytes();
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        var Module = typeof Module !== "undefined" ? Module : {};
        var moduleOverrides = {};
        var key;
        for (key in Module) {
            if (Module.hasOwnProperty(key)) {
                moduleOverrides[key] = Module[key];
            }
        }
        Module["arguments"] = [];
        Module["thisProgram"] = "./this.program";
        Module["quit"] = function(status, toThrow) {
            throw toThrow;
        };
        Module["preRun"] = [];
        Module["postRun"] = [];
        var ENVIRONMENT_IS_WEB = false;
        var ENVIRONMENT_IS_WORKER = false;
        var ENVIRONMENT_IS_NODE = false;
        var ENVIRONMENT_IS_SHELL = false;
        if (Module["ENVIRONMENT"]) {
            if (Module["ENVIRONMENT"] === "WEB") {
                ENVIRONMENT_IS_WEB = true;
            } else if (Module["ENVIRONMENT"] === "WORKER") {
                ENVIRONMENT_IS_WORKER = true;
            } else if (Module["ENVIRONMENT"] === "NODE") {
                ENVIRONMENT_IS_NODE = true;
            } else if (Module["ENVIRONMENT"] === "SHELL") {
                ENVIRONMENT_IS_SHELL = true;
            } else {
                throw new Error("Module['ENVIRONMENT'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL.");
            }
        } else {
            ENVIRONMENT_IS_WEB = typeof window === "object";
            ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
            ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
            ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
        }
        if (ENVIRONMENT_IS_NODE) {
            var nodeFS;
            var nodePath;
            Module["read"] = function shell_read(filename, binary) {
                var ret;
                ret = tryParseAsDataURI(filename);
                if (!ret) {
                    if (!nodeFS) nodeFS = eval("require")("fs");
                    if (!nodePath) nodePath = eval("require")("path");
                    filename = nodePath["normalize"](filename);
                    ret = nodeFS["readFileSync"](filename);
                }
                return binary ? ret : ret.toString();
            };
            Module["readBinary"] = function readBinary(filename) {
                var ret = Module["read"](filename, true);
                if (!ret.buffer) {
                    ret = new Uint8Array(ret);
                }
                assert(ret.buffer);
                return ret;
            };
            if (process["argv"].length > 1) {
                Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
            }
            Module["arguments"] = process["argv"].slice(2);
            if (typeof module !== "undefined") {
                module["exports"] = Module;
            }
            process["on"]("uncaughtException", function(ex) {
                if (!(ex instanceof ExitStatus)) {
                    throw ex;
                }
            });
            process["on"]("unhandledRejection", function(reason, p) {
                Module["printErr"]("node.js exiting due to unhandled promise rejection");
                process["exit"](1);
            });
            Module["inspect"] = function() {
                return "[Emscripten Module object]";
            };
        } else if (ENVIRONMENT_IS_SHELL) {
            if (typeof read != "undefined") {
                Module["read"] = function shell_read(f) {
                    var data = tryParseAsDataURI(f);
                    if (data) {
                        return intArrayToString(data);
                    }
                    return read(f);
                };
            }
            Module["readBinary"] = function readBinary(f) {
                var data;
                data = tryParseAsDataURI(f);
                if (data) {
                    return data;
                }
                if (typeof readbuffer === "function") {
                    return new Uint8Array(readbuffer(f));
                }
                data = read(f, "binary");
                assert(typeof data === "object");
                return data;
            };
            if (typeof scriptArgs != "undefined") {
                Module["arguments"] = scriptArgs;
            } else if (typeof arguments != "undefined") {
                Module["arguments"] = arguments;
            }
            if (typeof quit === "function") {
                Module["quit"] = function(status, toThrow) {
                    quit(status);
                };
            }
        } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
            Module["read"] = function shell_read(url) {
                try {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, false);
                    xhr.send(null);
                    return xhr.responseText;
                } catch (err) {
                    var data = tryParseAsDataURI(url);
                    if (data) {
                        return intArrayToString(data);
                    }
                    throw err;
                }
            };
            if (ENVIRONMENT_IS_WORKER) {
                Module["readBinary"] = function readBinary(url) {
                    try {
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET", url, false);
                        xhr.responseType = "arraybuffer";
                        xhr.send(null);
                        return new Uint8Array(xhr.response);
                    } catch (err) {
                        var data = tryParseAsDataURI(url);
                        if (data) {
                            return data;
                        }
                        throw err;
                    }
                };
            }
            Module["readAsync"] = function readAsync(url, onload, onerror) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = function xhr_onload() {
                    if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                        onload(xhr.response);
                        return;
                    }
                    var data = tryParseAsDataURI(url);
                    if (data) {
                        onload(data.buffer);
                        return;
                    }
                    onerror();
                };
                xhr.onerror = onerror;
                xhr.send(null);
            };
            Module["setWindowTitle"] = function(title) {
                document.title = title;
            };
        } else {
            throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
        }
        Module["print"] = typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null;
        Module["printErr"] = typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn.bind(console) || Module["print"];
        Module.print = Module["print"];
        Module.printErr = Module["printErr"];
        for (key in moduleOverrides) {
            if (moduleOverrides.hasOwnProperty(key)) {
                Module[key] = moduleOverrides[key];
            }
        }
        moduleOverrides = undefined;
        var STACK_ALIGN = 16;
        stackSave = stackRestore = stackAlloc = setTempRet0 = getTempRet0 = function() {
            abort("cannot use the stack before compiled code is ready to run, and has provided stack access");
        };
        function staticAlloc(size) {
            assert(!staticSealed);
            var ret = STATICTOP;
            STATICTOP = STATICTOP + size + 15 & -16;
            return ret;
        }
        function alignMemory(size, factor) {
            if (!factor) factor = STACK_ALIGN;
            var ret = size = Math.ceil(size / factor) * factor;
            return ret;
        }
        function warnOnce(text) {
            if (!warnOnce.shown) warnOnce.shown = {};
            if (!warnOnce.shown[text]) {
                warnOnce.shown[text] = 1;
                Module.printErr(text);
            }
        }
        var asm2wasmImports = {
            "f64-rem": function(x, y) {
                return x % y;
            },
            debugger: function() {
                debugger;
            }
        };
        var functionPointers = new Array(0);
        var GLOBAL_BASE = 1024;
        function getSafeHeapType(bytes, isFloat) {
            switch (bytes) {
              case 1:
                return "i8";

              case 2:
                return "i16";

              case 4:
                return isFloat ? "float" : "i32";

              case 8:
                return "double";

              default:
                assert(0);
            }
        }
        function SAFE_HEAP_STORE(dest, value, bytes, isFloat) {
            if (dest <= 0) abort("segmentation fault storing " + bytes + " bytes to address " + dest);
            if (dest % bytes !== 0) abort("alignment error storing to address " + dest + ", which was expected to be aligned to a multiple of " + bytes);
            if (staticSealed) {
                if (dest + bytes > HEAP32[DYNAMICTOP_PTR >> 2]) abort("segmentation fault, exceeded the top of the available dynamic heap when storing " + bytes + " bytes to address " + dest + ". STATICTOP=" + STATICTOP + ", DYNAMICTOP=" + HEAP32[DYNAMICTOP_PTR >> 2]);
                assert(DYNAMICTOP_PTR);
                assert(HEAP32[DYNAMICTOP_PTR >> 2] <= TOTAL_MEMORY);
            } else {
                if (dest + bytes > STATICTOP) abort("segmentation fault, exceeded the top of the available static heap when storing " + bytes + " bytes to address " + dest + ". STATICTOP=" + STATICTOP);
            }
            setValue(dest, value, getSafeHeapType(bytes, isFloat), 1);
        }
        function SAFE_HEAP_STORE_D(dest, value, bytes) {
            SAFE_HEAP_STORE(dest, value, bytes, true);
        }
        function SAFE_HEAP_LOAD(dest, bytes, unsigned, isFloat) {
            if (dest <= 0) abort("segmentation fault loading " + bytes + " bytes from address " + dest);
            if (dest % bytes !== 0) abort("alignment error loading from address " + dest + ", which was expected to be aligned to a multiple of " + bytes);
            if (staticSealed) {
                if (dest + bytes > HEAP32[DYNAMICTOP_PTR >> 2]) abort("segmentation fault, exceeded the top of the available dynamic heap when loading " + bytes + " bytes from address " + dest + ". STATICTOP=" + STATICTOP + ", DYNAMICTOP=" + HEAP32[DYNAMICTOP_PTR >> 2]);
                assert(DYNAMICTOP_PTR);
                assert(HEAP32[DYNAMICTOP_PTR >> 2] <= TOTAL_MEMORY);
            } else {
                if (dest + bytes > STATICTOP) abort("segmentation fault, exceeded the top of the available static heap when loading " + bytes + " bytes from address " + dest + ". STATICTOP=" + STATICTOP);
            }
            var type = getSafeHeapType(bytes, isFloat);
            var ret = getValue(dest, type, 1);
            if (unsigned) ret = unSign(ret, parseInt(type.substr(1)), 1);
            return ret;
        }
        function SAFE_HEAP_LOAD_D(dest, bytes, unsigned) {
            return SAFE_HEAP_LOAD(dest, bytes, unsigned, true);
        }
        function segfault() {
            abort("segmentation fault");
        }
        function alignfault() {
            abort("alignment fault");
        }
        var ABORT = 0;
        var EXITSTATUS = 0;
        function assert(condition, text) {
            if (!condition) {
                abort("Assertion failed: " + text);
            }
        }
        function setValue(ptr, value, type, noSafe) {
            type = type || "i8";
            if (type.charAt(type.length - 1) === "*") type = "i32";
            if (noSafe) {
                switch (type) {
                  case "i1":
                    HEAP8[ptr >> 0] = value;
                    break;

                  case "i8":
                    HEAP8[ptr >> 0] = value;
                    break;

                  case "i16":
                    HEAP16[ptr >> 1] = value;
                    break;

                  case "i32":
                    HEAP32[ptr >> 2] = value;
                    break;

                  case "i64":
                    tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
                    HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
                    break;

                  case "float":
                    HEAPF32[ptr >> 2] = value;
                    break;

                  case "double":
                    HEAPF64[ptr >> 3] = value;
                    break;

                  default:
                    abort("invalid type for setValue: " + type);
                }
            } else {
                switch (type) {
                  case "i1":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 1);
                    break;

                  case "i8":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 1);
                    break;

                  case "i16":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 2);
                    break;

                  case "i32":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 4);
                    break;

                  case "i64":
                    tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
                    SAFE_HEAP_STORE(ptr | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(ptr + 4 | 0, tempI64[1] | 0, 4);
                    break;

                  case "float":
                    SAFE_HEAP_STORE_D(ptr | 0, Math_fround(value), 4);
                    break;

                  case "double":
                    SAFE_HEAP_STORE_D(ptr | 0, +value, 8);
                    break;

                  default:
                    abort("invalid type for setValue: " + type);
                }
            }
        }
        function getValue(ptr, type, noSafe) {
            type = type || "i8";
            if (type.charAt(type.length - 1) === "*") type = "i32";
            if (noSafe) {
                switch (type) {
                  case "i1":
                    return HEAP8[ptr >> 0];

                  case "i8":
                    return HEAP8[ptr >> 0];

                  case "i16":
                    return HEAP16[ptr >> 1];

                  case "i32":
                    return HEAP32[ptr >> 2];

                  case "i64":
                    return HEAP32[ptr >> 2];

                  case "float":
                    return HEAPF32[ptr >> 2];

                  case "double":
                    return HEAPF64[ptr >> 3];

                  default:
                    abort("invalid type for getValue: " + type);
                }
            } else {
                switch (type) {
                  case "i1":
                    return SAFE_HEAP_LOAD(ptr | 0, 1, 0) | 0;

                  case "i8":
                    return SAFE_HEAP_LOAD(ptr | 0, 1, 0) | 0;

                  case "i16":
                    return SAFE_HEAP_LOAD(ptr | 0, 2, 0) | 0;

                  case "i32":
                    return SAFE_HEAP_LOAD(ptr | 0, 4, 0) | 0;

                  case "i64":
                    return SAFE_HEAP_LOAD(ptr | 0, 8, 0) | 0;

                  case "float":
                    return Math_fround(SAFE_HEAP_LOAD_D(ptr | 0, 4, 0));

                  case "double":
                    return +SAFE_HEAP_LOAD_D(ptr | 0, 8, 0);

                  default:
                    abort("invalid type for getValue: " + type);
                }
            }
            return null;
        }
        function Pointer_stringify(ptr, length) {
            if (length === 0 || !ptr) return "";
            var hasUtf = 0;
            var t;
            var i = 0;
            while (1) {
                assert(ptr + i < TOTAL_MEMORY);
                t = SAFE_HEAP_LOAD(ptr + i | 0, 1, 1) | 0;
                hasUtf |= t;
                if (t == 0 && !length) break;
                i++;
                if (length && i == length) break;
            }
            if (!length) length = i;
            var ret = "";
            if (hasUtf < 128) {
                var MAX_CHUNK = 1024;
                var curr;
                while (length > 0) {
                    curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
                    ret = ret ? ret + curr : curr;
                    ptr += MAX_CHUNK;
                    length -= MAX_CHUNK;
                }
                return ret;
            }
            return UTF8ToString(ptr);
        }
        var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
        function UTF8ArrayToString(u8Array, idx) {
            var endPtr = idx;
            while (u8Array[endPtr]) ++endPtr;
            if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
                return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
            } else {
                var u0, u1, u2, u3, u4, u5;
                var str = "";
                while (1) {
                    u0 = u8Array[idx++];
                    if (!u0) return str;
                    if (!(u0 & 128)) {
                        str += String.fromCharCode(u0);
                        continue;
                    }
                    u1 = u8Array[idx++] & 63;
                    if ((u0 & 224) == 192) {
                        str += String.fromCharCode((u0 & 31) << 6 | u1);
                        continue;
                    }
                    u2 = u8Array[idx++] & 63;
                    if ((u0 & 240) == 224) {
                        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
                    } else {
                        u3 = u8Array[idx++] & 63;
                        if ((u0 & 248) == 240) {
                            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
                        } else {
                            u4 = u8Array[idx++] & 63;
                            if ((u0 & 252) == 248) {
                                u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
                            } else {
                                u5 = u8Array[idx++] & 63;
                                u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
                            }
                        }
                    }
                    if (u0 < 65536) {
                        str += String.fromCharCode(u0);
                    } else {
                        var ch = u0 - 65536;
                        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
                    }
                }
            }
        }
        function UTF8ToString(ptr) {
            return UTF8ArrayToString(HEAPU8, ptr);
        }
        var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;
        function demangle(func) {
            warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
            return func;
        }
        function demangleAll(text) {
            var regex = /__Z[\w\d_]+/g;
            return text.replace(regex, function(x) {
                var y = demangle(x);
                return x === y ? x : x + " [" + y + "]";
            });
        }
        function jsStackTrace() {
            var err = new Error();
            if (!err.stack) {
                try {
                    throw new Error(0);
                } catch (e) {
                    err = e;
                }
                if (!err.stack) {
                    return "(no stack trace available)";
                }
            }
            return err.stack.toString();
        }
        function stackTrace() {
            var js = jsStackTrace();
            if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
            return demangleAll(js);
        }
        var WASM_PAGE_SIZE = 65536;
        var ASMJS_PAGE_SIZE = 16777216;
        function alignUp(x, multiple) {
            if (x % multiple > 0) {
                x += multiple - x % multiple;
            }
            return x;
        }
        var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
        function updateGlobalBuffer(buf) {
            Module["buffer"] = buffer = buf;
        }
        function updateGlobalBufferViews() {
            Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
            Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
            Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
            Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
            Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
            Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
            Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
            Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
        }
        var STATIC_BASE, STATICTOP, staticSealed;
        var STACK_BASE, STACKTOP, STACK_MAX;
        var DYNAMIC_BASE, DYNAMICTOP_PTR;
        STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
        staticSealed = false;
        function writeStackCookie() {
            assert((STACK_MAX & 3) == 0);
            HEAPU32[(STACK_MAX >> 2) - 1] = 34821223;
            HEAPU32[(STACK_MAX >> 2) - 2] = 2310721022;
        }
        function checkStackCookie() {
            if (HEAPU32[(STACK_MAX >> 2) - 1] != 34821223 || HEAPU32[(STACK_MAX >> 2) - 2] != 2310721022) {
                abort("Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x" + HEAPU32[(STACK_MAX >> 2) - 2].toString(16) + " " + HEAPU32[(STACK_MAX >> 2) - 1].toString(16));
            }
            if (HEAP32[0] !== 1668509029) throw "Runtime error: The application has corrupted its heap memory area (address zero)!";
        }
        function abortStackOverflow(allocSize) {
            abort("Stack overflow! Attempted to allocate " + allocSize + " bytes on the stack, but stack has only " + (STACK_MAX - stackSave() + allocSize) + " bytes available!");
        }
        function abortOnCannotGrowMemory() {
            abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ");
        }
        function enlargeMemory() {
            abortOnCannotGrowMemory();
        }
        var TOTAL_STACK = Module["TOTAL_STACK"] || 8388608;
        var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
        if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
        assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined, "JS engine does not provide full typed array support");
        if (Module["buffer"]) {
            buffer = Module["buffer"];
            assert(buffer.byteLength === TOTAL_MEMORY, "provided buffer should be " + TOTAL_MEMORY + " bytes, but it is " + buffer.byteLength);
        } else {
            if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
                assert(TOTAL_MEMORY % WASM_PAGE_SIZE === 0);
                Module["wasmMemory"] = new WebAssembly.Memory({
                    initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
                    maximum: TOTAL_MEMORY / WASM_PAGE_SIZE
                });
                buffer = Module["wasmMemory"].buffer;
            } else {
                buffer = new ArrayBuffer(TOTAL_MEMORY);
            }
            assert(buffer.byteLength === TOTAL_MEMORY);
            Module["buffer"] = buffer;
        }
        updateGlobalBufferViews();
        function getTotalMemory() {
            return TOTAL_MEMORY;
        }
        HEAP32[0] = 1668509029;
        HEAP16[1] = 25459;
        if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw "Runtime error: expected the system to be little-endian!";
        function callRuntimeCallbacks(callbacks) {
            while (callbacks.length > 0) {
                var callback = callbacks.shift();
                if (typeof callback == "function") {
                    callback();
                    continue;
                }
                var func = callback.func;
                if (typeof func === "number") {
                    if (callback.arg === undefined) {
                        Module["dynCall_v"](func);
                    } else {
                        Module["dynCall_vi"](func, callback.arg);
                    }
                } else {
                    func(callback.arg === undefined ? null : callback.arg);
                }
            }
        }
        var __ATPRERUN__ = [];
        var __ATINIT__ = [];
        var __ATMAIN__ = [];
        var __ATEXIT__ = [];
        var __ATPOSTRUN__ = [];
        var runtimeInitialized = false;
        var runtimeExited = false;
        function preRun() {
            if (Module["preRun"]) {
                if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
                while (Module["preRun"].length) {
                    addOnPreRun(Module["preRun"].shift());
                }
            }
            callRuntimeCallbacks(__ATPRERUN__);
        }
        function ensureInitRuntime() {
            checkStackCookie();
            if (runtimeInitialized) return;
            runtimeInitialized = true;
            callRuntimeCallbacks(__ATINIT__);
        }
        function preMain() {
            checkStackCookie();
            callRuntimeCallbacks(__ATMAIN__);
        }
        function exitRuntime() {
            checkStackCookie();
            callRuntimeCallbacks(__ATEXIT__);
            runtimeExited = true;
        }
        function postRun() {
            checkStackCookie();
            if (Module["postRun"]) {
                if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
                while (Module["postRun"].length) {
                    addOnPostRun(Module["postRun"].shift());
                }
            }
            callRuntimeCallbacks(__ATPOSTRUN__);
        }
        function addOnPreRun(cb) {
            __ATPRERUN__.unshift(cb);
        }
        function addOnPostRun(cb) {
            __ATPOSTRUN__.unshift(cb);
        }
        function writeArrayToMemory(array, buffer) {
            assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
            HEAP8.set(array, buffer);
        }
        function unSign(value, bits, ignore) {
            if (value >= 0) {
                return value;
            }
            return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
        }
        assert(Math["imul"] && Math["fround"] && Math["clz32"] && Math["trunc"], "this is a legacy browser, build with LEGACY_VM_SUPPORT");
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
        var Math_round = Math.round;
        var Math_min = Math.min;
        var Math_max = Math.max;
        var Math_clz32 = Math.clz32;
        var Math_trunc = Math.trunc;
        var runDependencies = 0;
        var runDependencyWatcher = null;
        var dependenciesFulfilled = null;
        var runDependencyTracking = {};
        function addRunDependency(id) {
            runDependencies++;
            if (Module["monitorRunDependencies"]) {
                Module["monitorRunDependencies"](runDependencies);
            }
            if (id) {
                assert(!runDependencyTracking[id]);
                runDependencyTracking[id] = 1;
                if (runDependencyWatcher === null && typeof setInterval !== "undefined") {
                    runDependencyWatcher = setInterval(function() {
                        if (ABORT) {
                            clearInterval(runDependencyWatcher);
                            runDependencyWatcher = null;
                            return;
                        }
                        var shown = false;
                        for (var dep in runDependencyTracking) {
                            if (!shown) {
                                shown = true;
                                Module.printErr("still waiting on run dependencies:");
                            }
                            Module.printErr("dependency: " + dep);
                        }
                        if (shown) {
                            Module.printErr("(end of list)");
                        }
                    }, 1e4);
                }
            } else {
                Module.printErr("warning: run dependency added without ID");
            }
        }
        function removeRunDependency(id) {
            runDependencies--;
            if (Module["monitorRunDependencies"]) {
                Module["monitorRunDependencies"](runDependencies);
            }
            if (id) {
                assert(runDependencyTracking[id]);
                delete runDependencyTracking[id];
            } else {
                Module.printErr("warning: run dependency removed without ID");
            }
            if (runDependencies == 0) {
                if (runDependencyWatcher !== null) {
                    clearInterval(runDependencyWatcher);
                    runDependencyWatcher = null;
                }
                if (dependenciesFulfilled) {
                    var callback = dependenciesFulfilled;
                    dependenciesFulfilled = null;
                    callback();
                }
            }
        }
        Module["preloadedImages"] = {};
        Module["preloadedAudios"] = {};
        var FS = {
            error: function() {
                abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1");
            },
            init: function() {
                FS.error();
            },
            createDataFile: function() {
                FS.error();
            },
            createPreloadedFile: function() {
                FS.error();
            },
            createLazyFile: function() {
                FS.error();
            },
            open: function() {
                FS.error();
            },
            mkdev: function() {
                FS.error();
            },
            registerDevice: function() {
                FS.error();
            },
            analyzePath: function() {
                FS.error();
            },
            loadFilesFromDB: function() {
                FS.error();
            },
            ErrnoError: function ErrnoError() {
                FS.error();
            }
        };
        Module["FS_createDataFile"] = FS.createDataFile;
        Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
        var dataURIPrefix = "data:application/octet-stream;base64,";
        function isDataURI(filename) {
            return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0;
        }
        function integrateWasmJS() {
            var wasmTextFile = "";
            var wasmBinaryFile = "data:application/octet-stream;base64,AGFzbQEAAAABhAEUYAABf2ABfwBgAABgBH9/f38AYAF/AX9gA39/fwF/YAJ/fwBgA39/fwBgAn9+AGADf39+AGADf39+AX9gBH9+f38Bf2ACf38Bf2AIf39/f35/f38Bf2AGf39/fn9/AX9gA39+fwBgBX9/f35/AX9gAn9+AX9gBX9/f39/AX9gAn9/AX4CwwIPA2VudgZtZW1vcnkCAYACgAIDZW52DkRZTkFNSUNUT1BfUFRSA38AA2VudghTVEFDS1RPUAN/AANlbnYJU1RBQ0tfTUFYA38AA2Vudg1lbmxhcmdlTWVtb3J5AAADZW52DmdldFRvdGFsTWVtb3J5AAADZW52F2Fib3J0T25DYW5ub3RHcm93TWVtb3J5AAADZW52EmFib3J0U3RhY2tPdmVyZmxvdwABA2VudghzZWdmYXVsdAACA2VudgphbGlnbmZhdWx0AAIDZW52Dl9fX2Fzc2VydF9mYWlsAAMDZW52EV9fX2Vycm5vX2xvY2F0aW9uAAADZW52C19fX3NldEVyck5vAAEDZW52F19lbXNjcmlwdGVuX2FzbV9jb25zdF9pAAQDZW52Fl9lbXNjcmlwdGVuX21lbWNweV9iaWcABQNIRwcHDAwMCRMFEwkJBwcHBQUGCQQJEwYKAw8MEQMKCgYGAAEMDAwFAQEEEhIMAAAAAgMGAxAQDAYODQUMAwYBAwsKBgkHCAAEBh8GfwEjAAt/ASMBC38BIwILfwFBAAt/AUEAC38BQQALB7QCEgVfZnJlZQAxB19tYWxsb2MAMwVfc2JyawAdD19zcGhpbmNzanNfaW5pdAA6El9zcGhpbmNzanNfa2V5cGFpcgA2D19zcGhpbmNzanNfb3BlbgA1G19zcGhpbmNzanNfcHVibGljX2tleV9ieXRlcwA5G19zcGhpbmNzanNfc2VjcmV0X2tleV9ieXRlcwA4D19zcGhpbmNzanNfc2lnbgA0Gl9zcGhpbmNzanNfc2lnbmF0dXJlX2J5dGVzADcTZXN0YWJsaXNoU3RhY2tTcGFjZQBBC2dldFRlbXBSZXQwACsNc2V0RHluYW1pY1RvcAAyC3NldFRlbXBSZXQwACwIc2V0VGhyZXcAPApzdGFja0FsbG9jAFEMc3RhY2tSZXN0b3JlAEgJc3RhY2tTYXZlAFAKqdcCRzIBAX8gACABaiEDIANBAEYgA0EEaiMAKAIAS3IEQBAECyADQQNxBEAQBQsgAyACNgIACygBAX8gACABaiEDIANBAEYgA0EBaiMAKAIAS3IEQBAECyADIAI6AAALJgEBfyAAIAFqIQIgAkEARiACQQFqIwAoAgBLcgRAEAQLIAIsAAALMAEBfyAAIAFqIQIgAkEARiACQQRqIwAoAgBLcgRAEAQLIAJBA3EEQBAFCyACKAIACyYBAX8gACABaiECIAJBAEYgAkEBaiMAKAIAS3IEQBAECyACLQAACygBAX8gACABaiEDIANBAEYgA0EIaiMAKAIAS3IEQBAECyADIAI3AAALJgEBfyAAIAFqIQIgAkEARiACQQhqIwAoAgBLcgRAEAQLIAIpAAALVQECfyMEIQQjBEFAayQEIwQjBU4EQEHAABADCwNAIAQgA2pBACACIANqQQAQDSABIANqQQAQDXMQDCADQQFqIgNBwABHDQALIAAgBBBFGiAEJARBAAswAQF/IAAgAWohAiACQQBGIAJBCGojACgCAEtyBEAQBAsgAkEHcQRAEAULIAIpAwALMgEBfyAAIAFqIQMgA0EARiADQQhqIwAoAgBLcgRAEAQLIANBB3EEQBAFCyADIAI3AwALKAEBfyAAIAFqIQMgA0EARiADQQFqIwAoAgBLcgRAEAQLIAMgAjwAAAtbACAAQQBMBEAQBAsgACACaiMDQQAQDkoEQBAECyACQQRGBEAgAEEDcQRAEAULIABBACABEAsFIAJBAUYEQCAAQQAgARAMBSAAQQFxBEAQBQsgAEEAIAEQTgsLC5gLAQJ/IAEgASACEBIaIAFBIGogAUFAayACEBIaIAFBQGsgAUGAAWogAhASGiABQeAAaiABQcABaiACEBIaIAFBgAFqIAFBgAJqIAIQEhogAUGgAWogAUHAAmogAhASGiABQcABaiABQYADaiACEBIaIAFB4AFqIAFBwANqIAIQEhogAUGAAmogAUGABGogAhASGiABQaACaiABQcAEaiACEBIaIAFBwAJqIAFBgAVqIAIQEhogAUHgAmogAUHABWogAhASGiABQYADaiABQYAGaiACEBIaIAFBoANqIAFBwAZqIAIQEhogAUHAA2ogAUGAB2ogAhASGiABQeADaiABQcAHaiACEBIaIAFBgARqIAFBgAhqIAIQEhogAUGgBGogAUHACGogAhASGiABQcAEaiABQYAJaiACEBIaIAFB4ARqIAFBwAlqIAIQEhogAUGABWogAUGACmogAhASGiABQaAFaiABQcAKaiACEBIaIAFBwAVqIAFBgAtqIAIQEhogAUHgBWogAUHAC2ogAhASGiABQYAGaiABQYAMaiACEBIaIAFBoAZqIAFBwAxqIAIQEhogAUHABmogAUGADWogAhASGiABQeAGaiABQcANaiACEBIaIAFBgAdqIAFBgA5qIAIQEhogAUGgB2ogAUHADmogAhASGiABQcAHaiABQYAPaiACEBIaIAFB4AdqIAFBwA9qIAIQEhogAUGACGogAUGAEGogAhASGiABQaAIaiIDQQAgAUHAEGoiBEEAEBEQECADQQggBEEIEBEQECADQRAgBEEQEBEQECADQRggBEEYEBEQECABIAEgAkFAayIDEBIaIAFBIGogAUFAayADEBIaIAFBQGsgAUGAAWogAxASGiABQeAAaiABQcABaiADEBIaIAFBgAFqIAFBgAJqIAMQEhogAUGgAWogAUHAAmogAxASGiABQcABaiABQYADaiADEBIaIAFB4AFqIAFBwANqIAMQEhogAUGAAmogAUGABGogAxASGiABQaACaiABQcAEaiADEBIaIAFBwAJqIAFBgAVqIAMQEhogAUHgAmogAUHABWogAxASGiABQYADaiABQYAGaiADEBIaIAFBoANqIAFBwAZqIAMQEhogAUHAA2ogAUGAB2ogAxASGiABQeADaiABQcAHaiADEBIaIAFBgARqIAFBgAhqIAMQEhogASABIAJBgAFqIgMQEhogAUEgaiABQUBrIAMQEhogAUFAayABQYABaiADEBIaIAFB4ABqIAFBwAFqIAMQEhogAUGAAWogAUGAAmogAxASGiABQaABaiABQcACaiADEBIaIAFBwAFqIAFBgANqIAMQEhogAUHgAWogAUHAA2ogAxASGiABQYACaiIDQQAgAUGABGoiBEEAEBEQECADQQggBEEIEBEQECADQRAgBEEQEBEQECADQRggBEEYEBEQECABIAEgAkHAAWoiAxASGiABQSBqIAFBQGsgAxASGiABQUBrIAFBgAFqIAMQEhogAUHgAGogAUHAAWogAxASGiABQYABaiIDQQAgAUGAAmoiBEEAEBEQECADQQggBEEIEBEQECADQRAgBEEQEBEQECADQRggBEEYEBEQECABIAEgAkGAAmoiAxASGiABQSBqIAFBQGsgAxASGiABQUBrIgNBACABQYABaiIEQQAQERAQIANBCCAEQQgQERAQIANBECAEQRAQERAQIANBGCAEQRgQERAQIAEgASACQcACahASGiABQSBqIgNBACABQUBrIgRBABAREBAgA0EIIARBCBAREBAgA0EQIARBEBAREBAgA0EYIARBGBAREBAgASABIAJBgANqEBIaIABBACABQQAQERAQIABBCCABQQgQERAQIABBECABQRAQERAQIABBGCABQRgQERAQCzMBAX8gAELgECABECNBACEBA0AgACABQQV0aiIDIAMgAkEPECIgAUEBaiIBQcMARw0ACwtwACAAQQBMBEAQBAsgACABaiMDQQAQDkoEQBAECyABQQRGBEAgAEEDcQRAEAULIABBABAODwUgAUEBRgRAIAIEQCAAQQAQDw8FIABBABANDwsACwsgAEEBcQRAEAULIAIEQCAAQQAQLg8LIABBABAvC4sFAQN/IAJBgMAATgRAIAAgASACEAoPCyAAIQQgACACaiEDIABBA3EgAUEDcUYEQANAIABBA3EEQCACRQRAIAQPCyAAIAFBAUEAEBlBARAWIABBAWohACABQQFqIQEgAkEBayECDAELCyADQXxxIgJBQGohBQNAIAAgBUwEQCAAIAFBBEEAEBlBBBAWIABBBGogAUEEakEEQQAQGUEEEBYgAEEIaiABQQhqQQRBABAZQQQQFiAAQQxqIAFBDGpBBEEAEBlBBBAWIABBEGogAUEQakEEQQAQGUEEEBYgAEEUaiABQRRqQQRBABAZQQQQFiAAQRhqIAFBGGpBBEEAEBlBBBAWIABBHGogAUEcakEEQQAQGUEEEBYgAEEgaiABQSBqQQRBABAZQQQQFiAAQSRqIAFBJGpBBEEAEBlBBBAWIABBKGogAUEoakEEQQAQGUEEEBYgAEEsaiABQSxqQQRBABAZQQQQFiAAQTBqIAFBMGpBBEEAEBlBBBAWIABBNGogAUE0akEEQQAQGUEEEBYgAEE4aiABQThqQQRBABAZQQQQFiAAQTxqIAFBPGpBBEEAEBlBBBAWIABBQGshACABQUBrIQEMAQsLA0AgACACSARAIAAgAUEEQQAQGUEEEBYgAEEEaiEAIAFB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PCAfQQAQDiIBEAwgAEE9IAFBCHYQDCAAQT4gAUEQdhAMIABBPyABQRh2EAwgAiQECw0AIAAgASACEEsaQQALswMAIABBACABQQAQDRAMIABBASABQQEQDRAMIABBAiABQQIQDRAMIABBAyABQQMQDRAMIABBBCABQQQQDRAMIABBBSABQQUQDRAMIABBBiABQQYQDRAMIABBByABQQcQDRAMIABBCCABQQgQDRAMIABBCSABQQkQDRAMIABBCiABQQoQDRAMIABBCyABQQsQDRAMIABBDCABQQwQDRAMIABBDSABQQ0QDRAMIABBDiABQQ4QDRAMIABBDyABQQ8QDRAMIABBECABQRAQDRAMIABBESABQREQDRAMIABBEiABQRIQDRAMIABBEyABQRMQDRAMIABBFCABQRQQDRAMIABBFSABQRUQDRAMIABBFiABQRYQDRAMIABBFyABQRcQDRAMIABBGCABQRgQDRAMIABBGSABQRkQDRAMIABBGiABQRoQDRAMIABBGyABQRsQDRAMIABBHCABQRwQDRAMIABBHSABQR0QDRAMIABBHiABQR4QDRAMIABBHyABQR8QDRAMIANBAEwEQA8LQQAhAQNAIAAgACACIAFBBXRqEEQaIAFBAWoiASADSCABQRBJcQ0ACwsOACAAIAFBoBogAhBKGgvBAQEBfyMEIQIjBEFAayQEIwQjBU4EQEHAABADCyACQQAgAUEAEBEQECACQQggAUEIEBEQECACQRAgAUEQEBEQECACQRggAUEYEBEQECACQSBqIgFBAEGLFkEAEBEQECABQQhBkxZBABAREBAgAUEQQZsWQQAQERAQIAFBGEGjFkEAEBEQECACIAIQICAAQQAgAkEAEBEQECAAQQggAkEIEBEQECAAQRAgAkEQEBEQECAAQRggAkEYEBEQECACJARBAAs6AQJ/IAFCAFEEQCAADwsgACECA0AgAkEBaiEDIAJBAEEAEAwgAUJ/fCIBQgBSBEAgAyECDAELCyAAC8EEAhl/AX4jBCEFIwRBgBNqJAQjBCMFTgRAQYATEAMLIAVBuBJqIQogBUHYAWohCyAFQRhqIQYgAkEIEBNCBIYgAkEAEA6shCIdp0H/AXEhDCAFQdgSaiIEQSBqIQ0gHUIIiKdB/wFxIQ4gBEEhaiEPIB1CEIinQf8BcSEQIARBImoh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wAhqakEAEA0QDCADQgF8IgMgAUEAEBNUDQALQQAhAAwBCyABQQAgAxAUIANCAFIEQEIAIQMDQCAAIAOnakEAQQAQDCADQgF8IgMgAUEAEBNUDQALCyABQQBCfxAUQX8hAAsgCCQEIAALsx4CqgF/A34jBCENIwRB0MIEaiQEIwQjBU4EQEHQwgQQAwsgDUHIEGoiCyAEQcAIEBoaIABBiMACaiEEIANCAFIEQCADIbABA0AgBCCwAaciBUEfampBACACIAVBf2pqQQAQDRAMILABQn98IrABQgBSDQALCyAEQQAgC0GgCGoiBUEAEBEQECAEQQggBUEIEBEQECAEQRAgBUEQEBEQECAEQRggBUEYEBEQECANQQhqIgUgBCADQiB8ECgaIARCIBAlGiAFQQAQEyGvASANQYgiaiIGQQAgBUEQaiIFQQAQERAQIAZBCCAFQQgQERAQIAZBECAFQRAQERAQIAZBGCAFQRgQERAQIABB6LcCaiIHQQAgBUEAEBEQECAHQQggBUEIEBEQECAHQRAgBUEQEBEQECAHQRggBUEYEBEQECANQcgAaiIFQQBBCxALIAVBCEIAEBQgBUEQQQAQCyAAQYi4AmoiCCALQSBqIglBgAgQGhogBCALIAUgCBAmIA1ByCFqIgQgByADQsAIfBAnGiABQQBCABAUIABBACAGQQAQERAQIABBCCAGQQgQERAQIABBECAGQRAQERAQIABBGCAGQRgQERAQIK8BQv//////////D4MisQFCBYghsAEgAUEAIAFBABATQiB8EBQgDUGIGWoiBiAJQYAIEBoaIABBICCvARAVIABBISCvAUIIiBAVIABBIiCvAUIQiBAVIABBIyCvAUIYiBAVIABBJCCvAUIgiBAVIABBJSCvAUIoiBAVIABBJiCvAUIwiBAVIABBJyCxAUI4iBAVIAFBACABQQAQE0IIfBAUIA1BqCJqIglBACALQQAQERAQIAlBCCALQQgQERAQIAlBECALQRAQERAQIAlBGCALQRgQERAQIAlBIGoiGEEAILABQgSGIrEBp0H/AXFBDHIQDCAJQSFqIhlBACCvAUIJiBAVIAlBImoiGkEAIK8BQhGIEBUgCUEjaiIbQQAgrwFCGYgQFSAJQSRqIhxBACCvAUIhiBAVIAlBJWoiHUEAIK8BQimIEBUgCUEmaiIeQQAg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ILoBQQAQDUcNASABIAZBEnJqQQAQDSC7AUEAEA1HDQEgASAGQRNyakEAEA0gvAFBABANRw0BIAEgBkEUcmpBABANIL0BQQAQDUcNASABIAZBFXJqQQAQDSC+AUEAEA1HDQEgASAGQRZyakEAEA0gvwFBABANRw0BIAEgBkEXcmpBABANIMABQQAQDUcNASABIAZBGHJqQQAQDSDBAUEAEA1HDQEgASAGQRlyakEAEA0gwgFBABANRw0BIAEgBkEacmpBABANIMMBQQAQDUcNASABIAZBG3JqQQAQDSDEAUEAEA1HDQEgASAGQRxyakEAEA0gxQFBABANRw0BIAEgBkEdcmpBABANIMYBQQAQDUcNASABIAZBHnJqQQAQDSDHAUEAEA1HDQEgASAGQR9yakEAEA0gyAFBABANRw0BIAdB4AJqIQcgK0EBaiIrQSBJDQALIAIgASAEQYAFaiIFEBIaIAsgAUFAayAFEBIaIAJBQGsiBiABQYABaiAFEBIaIAJB4ABqIgwgAUHAAWogBRASGiACQYABaiIKIAFBgAJqIAUQEhogAkGgAWoiESABQcACaiAFEBIaIAJBwAFqIgkgAUGAA2ogBRASGiACQeABaiISIAFBwANqIAUQEhogAkGAAmoiDSABQYAEaiAFEBIaIAJBoAJqIhMgAUHABGogBRASGiACQcACaiIOIAFBgAVqIAUQEhogAkHgAmoiFCABQcAFaiAFEBIaIAJBgANqIg8gAUGABmogBRASGiACQaADaiIVIAFBwAZqIAUQEhogAkHAA2oiECABQYAHaiAFEBIaIAJB4ANqIhYgAUHAB2ogBRASGiACQYAEaiIXIAFBgAhqIAUQEhogAkGgBGogAUHACGogBRASGiACQcAEaiIYIAFBgAlqIAUQEhogAkHgBGogAUHACWogBRASGiACQYAFaiIZIAFBgApqIAUQEhogAkGgBWogAUHACmogBRASGiACQcAFaiIaIAFBgAtqIAUQEhogAkHgBWogAUHAC2ogBRASGiACQYAGaiIbIAFBgAxqIAUQEhogAkGgBmogAUHADGogBRASGiACQcAGaiIcIAFBgA1qIAUQEhogAkHgBmogAUHADWogBRASGiACQYAHaiIdIAFBgA5qIAUQEhogAkGgB2ogAUHADmogBRASGiACQcAHaiIeIAFBgA9qIAUQEhogAkHgB2ogAUHAD2ogBRASGiACIAIgBEHABWoiARASGiALIAYgARASGiAGIAogARASGiAMIAkgARASGiAKIA0gARASGiARIA4gARASGiAJIA8gARASGiASIBAgARASGiANIBcgARASGiATIBggARASGiAOIBkgARASGiAUIBogARASGiAPIBsgARASGiAVIBwgARASGiAQIB0gARASGiAWIB4gARASGiACIAIgBEGABmoiARASGiALIAYgARASGiAGIAogARASGiAMIAkgARASGiAKIA0gARASGiARIA4gARASGiAJIA8gARASGiASIBAgARASGiACIAIgBEHABmoiARASGiALIAYgARASGiAGIAogARASGiAMIAkgARASGiACIAIgBEGAB2oiARASGiALIAYgARASGiAAIAIgBEHAB2oQEhogKiQEQQAPCyAAQQBCABAQIABBCEIAEBAgAEEQQgAQECAAQRhCABAQICokBEF/C7kKAQZ/IwQhDCMEQeD//wJqJAQjBCMFTgRAQeD//wIQAwsgDEHg//8BaiINQoCAgAEgBRAjQQAhAwNAIAwgA0EFdCIFQeD//wBqaiANIAVqECQaIANBAWoiA0GAgARHDQALQQAhAwNAQQFBECADayIFdEH///8/aiEJQQEgBUF/anQiCEH///8/aiEKIAYgA0EGdGohC0EAIQUDQCAMIAogBWpBBXRqIAwgCSAFQQF0akEFdGogCxASGiAFQQFqIgUgCEgNAAsgA0EBaiIDQRBHDQALIAAgDEHgD2pBgBAQGhogDEFgaiEGQYAQIQNBACEFA0AgACADaiIJQQAgDSAHIAVBAXQiCEEBcmpBABAPQQh0IAcgCGpBABAPciIKQQV0aiIIQQAQERAQIAlBCCAIQQgQERAQIAlBECAIQRAQERAQIAlBGCAIQRgQERAQIAAgA0EgamoiCUEAIAYgCkH//wNqIgtBBnRBwABxIAtBBXRqaiIIQQAQERAQIAlBCCAIQQgQERAQIAlBECAIQRAQERAQIAlBGCAIQRgQERAQIAogC0EBdEECcWpB/f8DaiIKQQF2IQsgACADQUBraiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECALIApBAnFqQX5qIgpBAXYhCyAAIANB4ABqaiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECALIApBAnFqQX5qIgpBAXYhCyAAIANBgAFqaiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECALIApBAnFqQX5qIgpBAXYhCyAAIANBoAFqaiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECALIApBAnFqQX5qIgpBAXYhCyAAIANBwAFqaiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECALIApBAnFqQX5qIgpBAXYhCyAAIANB4AFqaiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECALIApBAnFqQX5qIgpBAXYhCyAAIANBgAJqaiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECALIApBAnFqQX5qIgpBAXYhCyAAIANBoAJqaiIJQQAgBiAKQQV0QcAAcSALQQV0amoiCEEAEBEQECAJQQggCEEIEBEQECAJQRAgCEEQEBEQECAJQRggCEEYEBEQECAAIANBwAJqaiIJQQAgBiALIApBAnFqQX5qIghBBXRBwABxIAhBAXZBBXRqaiIIQQAQERAQIAlBCCAIQQgQERAQIAlBECAIQRAQERAQIAlBGCAIQRgQERAQIANB4AJqIQMgBUEBaiIFQSBHDQALIAFBACAMQQAQERAQIAFBCCAMQQgQERAQIAFBECAMQRAQERAQIAFBGCAMQRgQERAQIAJBAEKA6AAQFCAMJARBAAunBgEBfyMEIQMjBEHgAGokBCMEIwVOBEBB4AAQAwsgA0EAIAJBABANIAFBABANcxAMIANBASACQQEQDSABQQEQDXMQDCADQQIgAkECEA0gAUECEA1zEAwgA0EDIAJBAxANIAFBAxANcxAMIANBBCACQQQQDSABQQQQDXMQDCADQQUgAkEFEA0gAUEFEA1zEAwgA0EGIAJBBhANIAFBBhANcxAMIANBByACQQcQDSABQQcQDXMQDCADQQggAkEIEA0gAUEIEA1zEAwgA0EJIAJBCRANIAFBCRANcxAMIANBCiACQQoQDSABQQoQDXMQDCADQQsgAkELEA0gAUELEA1zEAwgA0EMIAJBDBANIAFBDBANcxAMIANBDSACQQ0QDSABQQ0QDXMQDCADQQ4gAkEOEA0gAUEOEA1zEAwgA0EPIAJBDxANIAFBDxANcxAMIANBECACQRAQDSABQRAQDXMQDCADQREgAkEREA0gAUEREA1zEAwgA0ESIAJBEhANIAFBEhANcxAMIANBEyACQRMQDSABQRMQDXMQDCADQRQgAkEUEA0gAUEUEA1zEAwgA0EVIAJBFRANIAFBFRANcxAMIANBFiACQRYQDSABQRYQDXMQDCADQRcgAkEXEA0gAUEXEA1zEAwgA0EYIAJBGBANIAFBGBANcxAMIANBGSACQRkQDSABQRkQDXMQDCADQRogAkEaEA0gAUEaEA1zEAwgA0EbIAJBGxANIAFBGxANcxAMIANBHCACQRwQDSABQRwQDXMQDCADQR0gAkEdEA0gAUEdEA1zEAwgA0EeIAJBHhANIAFBHhANcxAMIANBHyACQR8QDSABQR8QDXMQDCADQSBqIgJBACADQQAQERAQIAJBCCADQQgQERAQIAJBECADQRAQERAQIAJBGCADQRgQERAQIAJBIGoiAUEAQYsWQQAQERAQIAFBCEGTFkEAEBEQECABQRBBmxZBABAREBAgAUEYQaMWQQAQERAQIAIgAhAgIABBACACQQAQERAQIABBCCACQQgQERAQIABBECACQRAQERAQIABBGCACQRgQERAQIAMkBEEAC8IHAQJ/IwQhAyMEQUBrJAQjBCMFTgRAQcAAEAMLIANBACABQQAQERAQIANBCCABQQgQERAQIANBECABQRAQERAQIANBGCABQRgQERAQIANBIGoiAkEAQYsWQQAQERAQIAJBCEGTFkEAEBEQECACQRBBmxZBABAREBAgAkEYQaMWQQAQERAQIAMgAxAgIANBACABQSAQDSADQQAQDXMQDCADQQFqIgJBACABQSEQDSACQQAQDXMQDCADQQJqIgJBACABQSIQDSACQQAQDXMQDCADQQNqIgJBACABQSMQDSACQQAQDXMQDCADQQRqIgJBACABQSQQDSACQQAQDXMQDCADQQVqIgJBACABQSUQDSACQQAQDXMQDCADQQZqIgJBACABQSYQDSACQQAQDXMQDCADQQdqIgJBACABQScQDSACQQAQDXMQDCADQQhqIgJBACABQSgQDSACQQAQDXMQDCADQQlqIgJBACABQSkQDSACQQAQDXMQDCADQQpqIgJBACABQSoQDSACQQAQDXMQDCADQQtqIgJBACABQSsQDSACQQAQDXMQDCADQQxqIgJBACABQSwQDSACQQAQDXMQDCADQQ1qIgJBACABQS0QDSACQQAQDXMQDCADQQ5qIgJBACABQS4QDSACQQAQDXMQDCADQQ9qIgJBACABQS8QDSACQQAQDXMQDCADQRBqIgJBACABQTAQDSACQQAQDXMQDCADQRFqIgJBACABQTEQDSACQQAQDXMQDCADQRJqIgJBACABQTIQDSACQQAQDXMQDCADQRNqIgJBACABQTMQDSACQQAQDXMQDCADQRRqIgJBACABQTQQDSACQQAQDXMQDCADQRVqIgJBACABQTUQDSACQQAQDXMQDCADQRZqIgJBACABQTYQDSACQQAQDXMQDCADQRdqIgJBACABQTcQDSACQQAQDXMQDCADQRhqIgJBACABQTgQDSACQQAQDXMQDCADQRlqIgJBACABQTkQDSACQQAQDXMQDCADQRpqIgJBACABQToQDSACQQAQDXMQDCADQRtqIgJBACABQTsQDSACQQAQDXMQDCADQRxqIgJBACABQTwQDSACQQAQDXMQDCADQR1qIgJBACABQT0QDSACQQAQDXMQDCADQR5qIgJBACABQT4QDSACQQAQDXMQDCADQR9qIgJBACABQT8QDSACQQAQDXMQDCADIAMQICAAQQAgA0EAEBEQECAAQQggA0EIEBEQECAAQRAgA0EQEBEQECAAQRggA0EYEBEQECADJARBAAuOEwFkfyMEIQQjBEFAayQEIwQjBU4EQEHAABADCyADRQRAIAQkBA8LIABBBGohGSAAQQhqIRogAEEMaiEbIABBEGohHCAAQRRqIR0gAEEYaiEeIABBHGohHyAAQSBqISAgAEEkaiEhIABBKGohIiAAQSxqISMgAEEwaiEXIABBNGohGCAAQThqISQgAEE8aiElIARBAWohJiAEQQJqIScgBEEDaiEoIARBBGohKSAEQQVqISogBEEGaiErIARBB2ohLCAEQQhqIS0gBEEJaiEuIARBCmohLyAEQQtqITAgBEEMaiExIARBDWohMiAEQQ5qITMgBEEPaiE0IARBEGohNSAEQRFqITYgBEESaiE3IARBE2ohOCAEQRRqITkgBEEVaiE6IARBFmohOyAEQRdqITwgBEEYaiE9IARBGWohPiAEQRpqIT8gBEEbaiFAIARBHGohQSAEQR1qIUIgBEEeaiFDIARBH2ohRCAEQSBqIUUgBEEhaiFGIARBImohRyAEQSNqIUggBEEkaiFJIARBJWohSiAEQSZqIUsgBEEnaiFMIARBKGohTSAEQSlqIU4gBEEqaiFPIARBK2ohUCAEQSxqIVEgBEEtaiFSIARBLmohUyAEQS9qIVQgBEEwaiFVIARBMWohViAEQTJqIVcgBEEzaiFYIARBNGohWSAEQTVqIVogBEE2aiFbIARBN2ohXCAEQThqIV0gBEE5aiFeIARBOmohXyAEQTtqIWAgBEE8aiFhIARBPWohYiAEQT5qIWMgBEE/aiFkIAMhEyACIRUgASEWA0BBDCEBICFBABAOIQsgHkEAEA4hAiAaQQAQDiEMICRBABAOIQcgIkEAEA4hDSAfQQAQDiEDIBtBABAOIQ4gJUEAEA4hCCAjQQAQDiEPIBxBABAOIQUgAEEAEA4iZSERIBdBABAOImYhCSAgQQAQDiEKIB1BABAOIQYgGUEAEA4hECAYQQAQDiJnIRIDQCARIAVqIhEgCXMiCUEQdCAJQRB2ciIJIApqIgogBXMiBUEMdCAFQRR2ciIFIBFqIhEgCXMiCUEIdCAJQRh2ciIJIApqIgogBXMiBUEHdCAFQRl2ciEFIAwgAmoiDCAHcyIHQRB0IAdBEHZyIgcgDWoiDSACcyICQQx0IAJBFHZyIgIgDGoiDCAHcyIHQQh0IAdBGHZyIgcgDWoiDSACcyICQQd0IAJBGXZyIQIgDiADaiIOIAhzIghBEHQgCEEQdnIiCCAPaiIPIANzIgNBDHQgA0EUdnIiAyAOaiIOIAhzIghBCHQgCEEYdnIiCCAPaiIPIANzIgNBB3QgA0EZdnIhAyAQIAZqIhAgEnMiEkEQdCASQRB2ciISIAtqIgsgBnMiBkEMdCAGQRR2ciIGIBBqIhAgEnMiEkEIdCASQRh2ciISIAtqIgsgBnMiBkEHdCAGQRl2ciIGIBFqIhEgCHMiCEEQdCAIQRB2ciIIIA1qIg0gBnMiBkEMdCAGQRR2ciIGIBFqIhEgCHMiCEEIdCAIQRh2ciIIIA1qIg0gBnMiBkEHdCAGQRl2ciEGIAkgAiAQaiIJcyIQQRB0IBBBEHZyIhQgD2oiDyACcyICQQx0IAJBFHZyIgIgCWoiECAUcyIJQQh0IAlBGHZyIgkgD2oiDyACcyICQQd0IAJBGXZyIQIgCiASIAMgDGoiDHMiCkEQdCAKQRB2ciIKaiIUIANzIgNBDHQgA0EUdnIiAyAMaiIMIApzIgpBCHQgCkEYdnIiEiAUaiIKIANzIgNBB3QgA0EZdnIhAyAFIA5qIg4gB3MiB0EQdCAHQRB2ciIHIAtqIgsgBXMiBUEMdCAFQRR2ciIFIA5qIg4gB3MiB0EIdCAHQRh2ciIHIAtqIgsgBXMiBUEHdCAFQRl2ciEFIAFBfmohFCABQQJLBEAgFCEBDAELCyAZQQAQDiAQaiEBIBpBABAOIAxqIQwgG0EAEA4gDmohDiAcQQAQDiAFaiEFIB1BABAOIAZqIQYgHkEAEA4gAmohAiAfQQAQDiADaiEDICBBABAOIApqIQogIUEAEA4gC2ohCyAiQQAQDiANaiENICNBABAOIA9qIQ8gF0EAEA4gCWohCSAYQQAQDiASaiEQICRBABAOIAdqIQcgJUEAEA4gCGohCCAEQQAgESBlaiIREAwgJkEAIBFBCHYQDCAnQQAgEUEQdhAMIChBACARQRh2EAwgKUEAIAEQDCAqQQAgAUEIdhAMICtBACABQRB2EAwgLEEAIAFBGHYQDCAtQQAgDBAMIC5BACAMQQh2EAwgL0EAIAxBEHYQDCAwQQAgDEEYdhAMIDFBACAOEAwgMkEAIA5BCHYQDCAzQQAgDkEQdhAMIDRBACAOQRh2EAwgNUEAIAUQDCA2QQAgBUEIdhAMIDdBACAFQRB2EAwgOEEAIAVBGHYQDCA5QQAgBhAMIDpBACAGQQh2EAwgO0EAIAZBEHYQDCA8QQAgBkEYdhAMID1BACACEAwgPkEAIAJBCHYQDCA/QQAgAkEQdhAMIEBBACACQRh2EAwgQUEAIAMQDCBCQQAgA0EIdhAMIENBACADQRB2EAwgREEAIANBGHYQDCBFQQAgChAMIEZBACAKQQh2EAwgR0EAIApBEHYQDCBIQQAgCkEYdhAMIElBACALEAwgSkEAIAtBCHYQDCBLQQAgC0EQdhAMIExBACALQRh2EAwgTUEAIA0QDCBOQQAgDUEIdhAMIE9BACANQRB2EAwgUEEAIA1BGHYQDCBRQQAgDxAMIFJBACAPQQh2EAwgU0EAIA9BEHYQDCBUQQAgD0EYdhAMIFVBACAJEAwgVkEAIAlBCHYQDCBXQQAgCUEQdhAMIFhBACAJQRh2EAwgWUEAIBAQDCBaQQAgEEEIdhAMIFtBACAQQRB2EAwgXEEAIBBBGHYQDCBdQQAgBxAMIF5BACAHQQh2EAwgX0EAIAdBEHYQDCBgQQAgB0EYdhAMIGFBACAIEAwgYkEAIAhBCHYQDCBjQQAgCEEQdhAMIGRBACAIQRh2EAwgF0EAIGZBAWoiARALIAFFBEAgGEEAIGdBAWoQCwsgE0HBAE8EQEEAIQEDQCAVIAFqQQAgBCABakEAEA0gFiABakEAEA1zEAwgAUEBaiIBQcAARw0ACyATQUBqIRMgFUFAayEVIBZBQGshFgwBCwsgE0UEQCAEJAQPC0EAIQADQCAVIABqQQAgBCAAakEAEA0gFiAAakEAEA1zEAwgAEEBaiIAIBNHDQALIAQkBAtmACAAQTBBABALIABBNEEAEAsgAEE4IAFBARAPQQh0IAFBABAPciABQQIQD0EQdHIgAUEDEA9BGHRyEAsgAEE8IAFBBRAPQQh0IAFBBBAPciABQQYQD0EQdHIgAUEHEA9BGHRyEAsLBgAgACQEC50EACAAQRAgAUEBEA9BCHQgAUEAEA9yIAFBAhAPQRB0ciABQQMQD0EYdHIQCyAAQRQgAUEFEA9BCHQgAUEEEA9yIAFBBhAPQRB0ciABQQcQD0EYdHIQCyAAQRggAUEJEA9BCHQgAUEIEA9yIAFBChAPQRB0ciABQQsQD0EYdHIQCyAAQRwgAUENEA9BCHQgAUEMEA9yIAFBDhAPQRB0ciABQQ8QD0EYdHIQCyABQRBqIQMgAEEgIAJBgAJGIgIEfyADBSABIgMLQQEQD0EIdCADQQAQD3IgA0ECEA9BEHRyIANBAxAPQRh0chALIABBJCADQQUQD0EIdCADQQQQD3IgA0EGEA9BEHRyIANBBxAPQRh0chALIABBKCADQQkQD0EIdCADQQgQD3IgA0EKEA9BEHRyIANBCxAPQRh0chALIABBLCADQQ0QD0EIdCADQQwQD3IgA0EOEA9BEHRyIANBDxAPQRh0chALIABBACACBH9B6xUFQfsVCyIBQQEQDUEIdCABQQAQDXIgAUECEA1BEHRyIAFBAxAPQRh0chALIABBBCABQQUQDUEIdCABQQQQDXIgAUEGEA1BEHRyIAFBBxAPQRh0chALIABBCCABQQkQDUEIdCABQQgQDXIgAUEKEA1BEHRyIAFBCxAPQRh0chALIABBDCABQQ0QDUEIdCABQQwQDXIgAUEOEA1BEHRyIAFBDxAPQRh0chALC1cBAX8jBCEEIwRBQGskBCMEIwVOBEBBwAAQAwsgBCADQYACQcAAEEkgBCACEEcgAUIAUQRAQQAhAgUgAEEAIAGnIgIQMBoLIAQgACAAIAIQRiAEJARBAAu5AQECfyMEIQMjBEGAAWokBCMEIwVOBEBBgAEQAwsgA0EAQefMp9AGEAsgA0EEQYXdntt7EAsgA0EIQfLmu+MDEAsgA0EMQbrqv6p6EAsgA0EQQf+kuYgFEAsgA0EUQYzRldh5EAsgA0EYQauzj/wBEAsgA0EcQZmag98FEAsgA0EgaiIEQQBCABAcIARBCEIAEBwgBEEQQgAQHCAEQRhCABAcIAMgASACQgOGEB4gAyAAEEwgAyQEQQAL2QYBCH8jBCEHIwRBEGokBCMEIwVOBEBBEBADCyAHQQFqIglBAEEBEAwgB0EAQYF/EAwgB0EIaiIEQQAgAEE0EA4gAEE4EA4iBSAAQTBqIgNBABAOIgJqIgYgBUlqIghBGHYQDCAEQQEgCEEQdhAMIARBAiAIQQh2EAwgBEEDIAgQDCAEQQQgBkEYdhAMIARBBSAGQRB2EAwgBEEGIAZBCHYQDCAEQQcgBhAMIAVBuANGBEAgA0EAIAJBeGoQCyAAIAdCCBAeIANBABAOIQIFIAVBuANIBEAgBUUEQCAAQTxBARALCyADQQAgBkHIfGoQCyAAQeoRQbgDIAVrrBAeBSADQQAgBkGAfGoQCyAAQeoRQYAEIAVrrBAeIANBACADQQAQDkHIfGoQCyAAQesRQrgDEB4gAEE8QQEQCwsgACAJQggQHiADQQAgA0EAEA5BeGoiAhALCyADQQAgAkFAahALIAAgBELAABAeIAFBACAAQQAQDkEYdhAMIAFBASAAQQAQDkEQdhAMIAFBAiAAQQAQDkEIdhAMIAFBAyAAQQAQDhAMIAFBBCAAQQRqIgJBABAOQRh2EAwgAUEFIAJBABAOQRB2EAwgAUEGIAJBABAOQQh2EAwgAUEHIAJBABAOEAwgAUEIIABBCGoiAkEAEA5BGHYQDCABQQkgAkEAEA5BEHYQDCABQQogAkEAEA5BCHYQDCABQQsgAkEAEA4QDCABQQwgAEEMaiICQQAQDkEYdhAMIAFBDSACQQAQDkEQdhAMIAFBDiACQQAQDkEIdhAMIAFBDyACQQAQDhAMIAFBECAAQRBqIgJBABAOQRh2EAwgAUERIAJBABAOQRB2EAwgAUESIAJBABAOQQh2EAwgAUETIAJBABAOEAwgAUEUIABBFGoiAkEAEA5BGHYQDCABQRUgAkEAEA5BEHYQDCABQRYgAkEAEA5BCHYQDCABQRcgAkEAEA4QDCABQRggAEEYaiICQQAQDkEYdhAMIAFBGSACQQAQDkEQdhAMIAFBGiACQQAQDkEIdhAMIAFBGyACQQAQDhAMIAFBHCAAQRxqIgBBABAOQRh2EAwgAUEdIABBABAOQRB2EAwgAUEeIABBABAOQQh2EAwgAUEfIABBABAOEAwgByQECzIBAX8gACABaiEDIANBAEYgA0EEaiMAKAIAS3IEQBAECyADQQNxBEAQBQsgAyACPgIACzIBAX8gACABaiEDIANBAEYgA0ECaiMAKAIAS3IEQBAECyADQQFxBEAQBQsgAyACOwEAC0QBAn8gAUKAgICAEFoEQEG4D0HMD0HMAUH+DxAGCyABpyIDRQRADwsDQCAAIAJqQQBBARAJEAwgAkEBaiICIANHDQALCwQAIwQLJwEBfyMEIQEjBCAAaiQEIwRBD2pBcHEkBCMEIwVOBEAgABADCyABCwuADQMAQYAIC+sJ0wijhYhqPyREc3ADLooZE9AxnykiOAmkiWxO7Jj6Lgh3E9A45iEoRWwM6TTPZlS+3VB8ybcprMAXCUe1tdWEPxv7eYnZ1RaSrLXfmKYLMdG33xrQ23L9L5Z+Jmrtr+G4mX8s8UWQfLr3bJGzR5mhJBb8joXi8gEIaU5XcdggaWOIaj8k0wijhS6KGRNEc3ADIjgJpNAxnymY+i4IiWxO7OYhKEV3E9A4z2ZUvmwM6TS3KazA3VB8ybXVhD8XCUe1InsgcmV0dXJuIE1vZHVsZS5nZXRSYW5kb21WYWx1ZSgpOyB9IgB7IGlmIChNb2R1bGUuZ2V0UmFuZG9tVmFsdWUgPT09IHVuZGVmaW5lZCkgeyB0cnkgeyB2YXIgd2luZG93XyA9ICdvYmplY3QnID09PSB0eXBlb2Ygd2luZG93ID8gd2luZG93IDogc2VsZjsgdmFyIGNyeXB0b18gPSB0eXBlb2Ygd2luZG93Xy5jcnlwdG8gIT09ICd1bmRlZmluZWQnID8gd2luZG93Xy5jcnlwdG8gOiB3aW5kb3dfLm1zQ3J5cHRvOyB2YXIgcmFuZG9tVmFsdWVzU3RhbmRhcmQgPSBmdW5jdGlvbigpIHsgdmFyIGJ1ZiA9IG5ldyBVaW50MzJBcnJheSgxKTsgY3J5cHRvXy5nZXRSYW5kb21WYWx1ZXMoYnVmKTsgcmV0dXJuIGJ1ZlswXSA+Pj4gMDsgfTsgcmFuZG9tVmFsdWVzU3RhbmRhcmQoKTsgTW9kdWxlLmdldFJhbmRvbVZhbHVlID0gcmFuZG9tVmFsdWVzU3RhbmRhcmQ7IH0gY2F0Y2ggKGUpIHsgdHJ5IHsgdmFyIGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpOyB2YXIgcmFuZG9tVmFsdWVOb2RlSlMgPSBmdW5jdGlvbigpIHsgdmFyIGJ1ZiA9IGNyeXB0b1sncmFuZG9tQnl0ZXMnXSg0KTsgcmV0dXJuIChidWZbMF0gPDwgMjQgfCBidWZbMV0gPDwgMTYgfCBidWZbMl0gPDwgOCB8IGJ1ZlszXSkgPj4+IDA7IH07IHJhbmRvbVZhbHVlTm9kZUpTKCk7IE1vZHVsZS5nZXRSYW5kb21WYWx1ZSA9IHJhbmRvbVZhbHVlTm9kZUpTOyB9IGNhdGNoIChlKSB7IHRocm93ICdObyBzZWN1cmUgcmFuZG9tIG51bWJlciBnZW5lcmF0b3IgZm91bmQnOyB9IH0gfSB9AGJ1Zl9sZW4gPD0gU0laRV9NQVgAbGlic29kaXVtL3NyYy9saWJzb2RpdW0vcmFuZG9tYnl0ZXMvcmFuZG9tYnl0ZXMuYwByYW5kb21ieXRlcwAAAQIDBAUGBwgJCgsMDQ4PDgoECAkPDQYBDAACCwcFAwsIDAAFAg8NCg4DBgcBCQQHCQMBDQwLDgIGBQoEAA8ICQAFBwIECg8OAQsMBggDDQIMBgoACwgDBA0HBQ8OAQkMBQEPDg0ECgAHBgMJAggLDQsHDgwBAwkFAA8ECAYCCgYPDgkLAwAIDAINBwEECgUKAggEBwYBBQ8LCQ4DDA0AAAECAwQFBgcICQoLDA0ODw4KBAgJDw0GAQwAAgsHBQMLCAwABQIPDQoOAwYHAQkEBwkDAQ0MCw4CBgUKBAAPCIAAQasSC8ACAQIDBAUGBwgJCgsMDQ4PDgoECAkPDQYBDAACCwcFAwsIDAAFAg8NCg4DBgcBCQQHCQMBDQwLDgIGBQoEAA8ICQAFBwIECg8OAQsMBggDDQIMBgoACwgDBA0HBQ8OAQkMBQEPDg0ECgAHBgMJAggLDQsHDgwBAwkFAA8ECAYCCgYPDgkLAwAIDAINBwEECgUKAggEBwYBBQ8LCQ4DDA0AAAECAwQFBgcICQoLDA0ODw4KBAgJDw0GAQwAAgsHBQMLCAwABQIPDQoOAwYHAQkEBwkDAQ0MCw4CBgUKBAAPCAkABQcCBAoPDgELDAYIAw0CDAYKAAsIAwQNBwUPDgEJDAUBDw4NBAoABwYDCQIICw0LBw4MAQMJBQAPBAgGAgoGDw4JCwMACAwCDQcBBAoFCgIIBAcGAQUPCwkOAwwNAIAAQesVC0BleHBhbmQgMzItYnl0ZSBrZXhwYW5kIDE2LWJ5dGUga2V4cGFuZCAzMi1ieXRlIHRvIDY0LWJ5dGUgc3RhdGUh";
            var asmjsCodeFile = "";
            if (typeof Module["locateFile"] === "function") {
                if (!isDataURI(wasmTextFile)) {
                    wasmTextFile = Module["locateFile"](wasmTextFile);
                }
                if (!isDataURI(wasmBinaryFile)) {
                    wasmBinaryFile = Module["locateFile"](wasmBinaryFile);
                }
                if (!isDataURI(asmjsCodeFile)) {
                    asmjsCodeFile = Module["locateFile"](asmjsCodeFile);
                }
            }
            var wasmPageSize = 64 * 1024;
            var info = {
                global: null,
                env: null,
                asm2wasm: asm2wasmImports,
                parent: Module
            };
            var exports = null;
            function mergeMemory(newBuffer) {
                var oldBuffer = Module["buffer"];
                if (newBuffer.byteLength < oldBuffer.byteLength) {
                    Module["printErr"]("the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here");
                }
                var oldView = new Int8Array(oldBuffer);
                var newView = new Int8Array(newBuffer);
                newView.set(oldView);
                updateGlobalBuffer(newBuffer);
                updateGlobalBufferViews();
            }
            function fixImports(imports) {
                return imports;
            }
            function getBinary() {
                try {
                    if (Module["wasmBinary"]) {
                        return new Uint8Array(Module["wasmBinary"]);
                    }
                    var binary = tryParseAsDataURI(wasmBinaryFile);
                    if (binary) {
                        return binary;
                    }
                    if (Module["readBinary"]) {
                        return Module["readBinary"](wasmBinaryFile);
                    } else {
                        throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
                    }
                } catch (err) {
                    abort(err);
                }
            }
            function getBinaryPromise() {
                if (!Module["wasmBinary"] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
                    return fetch(wasmBinaryFile, {
                        credentials: "same-origin"
                    }).then(function(response) {
                        if (!response["ok"]) {
                            throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
                        }
                        return response["arrayBuffer"]();
                    }).catch(function() {
                        return getBinary();
                    });
                }
                return new Promise(function(resolve, reject) {
                    resolve(getBinary());
                });
            }
            function doNativeWasm(global, env, providedBuffer) {
                if (typeof WebAssembly !== "object") {
                    abort("No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.");
                    Module["printErr"]("no native wasm support detected");
                    return false;
                }
                if (!(Module["wasmMemory"] instanceof WebAssembly.Memory)) {
                    Module["printErr"]("no native wasm Memory in use");
                    return false;
                }
                env["memory"] = Module["wasmMemory"];
                info["global"] = {
                    NaN: NaN,
                    Infinity: Infinity
                };
                info["global.Math"] = Math;
                info["env"] = env;
                function receiveInstance(instance, module) {
                    exports = instance.exports;
                    if (exports.memory) mergeMemory(exports.memory);
                    Module["asm"] = exports;
                    Module["usingWasm"] = true;
                    removeRunDependency("wasm-instantiate");
                }
                addRunDependency("wasm-instantiate");
                if (Module["instantiateWasm"]) {
                    try {
                        return Module["instantiateWasm"](info, receiveInstance);
                    } catch (e) {
                        Module["printErr"]("Module.instantiateWasm callback failed with error: " + e);
                        return false;
                    }
                }
                var trueModule = Module;
                function receiveInstantiatedSource(output) {
                    assert(Module === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
                    trueModule = null;
                    receiveInstance(output["instance"], output["module"]);
                }
                function instantiateArrayBuffer(receiver) {
                    getBinaryPromise().then(function(binary) {
                        return WebAssembly.instantiate(binary, info);
                    }).then(receiver).catch(function(reason) {
                        Module["printErr"]("failed to asynchronously prepare wasm: " + reason);
                        abort(reason);
                    });
                }
                if (!Module["wasmBinary"] && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
                    WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, {
                        credentials: "same-origin"
                    }), info).then(receiveInstantiatedSource).catch(function(reason) {
                        Module["printErr"]("wasm streaming compile failed: " + reason);
                        Module["printErr"]("falling back to ArrayBuffer instantiation");
                        instantiateArrayBuffer(receiveInstantiatedSource);
                    });
                } else {
                    instantiateArrayBuffer(receiveInstantiatedSource);
                }
                return {};
            }
            Module["asmPreload"] = Module["asm"];
            var asmjsReallocBuffer = Module["reallocBuffer"];
            var wasmReallocBuffer = function(size) {
                var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
                size = alignUp(size, PAGE_MULTIPLE);
                var old = Module["buffer"];
                var oldSize = old.byteLength;
                if (Module["usingWasm"]) {
                    try {
                        var result = Module["wasmMemory"].grow((size - oldSize) / wasmPageSize);
                        if (result !== (-1 | 0)) {
                            return Module["buffer"] = Module["wasmMemory"].buffer;
                        } else {
                            return null;
                        }
                    } catch (e) {
                        console.error("Module.reallocBuffer: Attempted to grow from " + oldSize + " bytes to " + size + " bytes, but got error: " + e);
                        return null;
                    }
                }
            };
            Module["reallocBuffer"] = function(size) {
                if (finalMethod === "asmjs") {
                    return asmjsReallocBuffer(size);
                } else {
                    return wasmReallocBuffer(size);
                }
            };
            var finalMethod = "";
            Module["asm"] = function(global, env, providedBuffer) {
                env = fixImports(env);
                if (!env["table"]) {
                    var TABLE_SIZE = Module["wasmTableSize"];
                    if (TABLE_SIZE === undefined) TABLE_SIZE = 1024;
                    var MAX_TABLE_SIZE = Module["wasmMaxTableSize"];
                    if (typeof WebAssembly === "object" && typeof WebAssembly.Table === "function") {
                        if (MAX_TABLE_SIZE !== undefined) {
                            env["table"] = new WebAssembly.Table({
                                initial: TABLE_SIZE,
                                maximum: MAX_TABLE_SIZE,
                                element: "anyfunc"
                            });
                        } else {
                            env["table"] = new WebAssembly.Table({
                                initial: TABLE_SIZE,
                                element: "anyfunc"
                            });
                        }
                    } else {
                        env["table"] = new Array(TABLE_SIZE);
                    }
                    Module["wasmTable"] = env["table"];
                }
                if (!env["memoryBase"]) {
                    env["memoryBase"] = Module["STATIC_BASE"];
                }
                if (!env["tableBase"]) {
                    env["tableBase"] = 0;
                }
                var exports;
                exports = doNativeWasm(global, env, providedBuffer);
                assert(exports, "no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods");
                return exports;
            };
        }
        integrateWasmJS();
        var ASM_CONSTS = [ function() {
            if (Module.getRandomValue === undefined) {
                try {
                    var window_ = "object" === typeof window ? window : self;
                    var crypto_ = typeof window_.crypto !== "undefined" ? window_.crypto : window_.msCrypto;
                    var randomValuesStandard = function() {
                        var buf = new Uint32Array(1);
                        crypto_.getRandomValues(buf);
                        return buf[0] >>> 0;
                    };
                    randomValuesStandard();
                    Module.getRandomValue = randomValuesStandard;
                } catch (e) {
                    try {
                        var crypto = eval("require")("crypto");
                        var randomValueNodeJS = function() {
                            var buf = crypto["randomBytes"](4);
                            return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0;
                        };
                        randomValueNodeJS();
                        Module.getRandomValue = randomValueNodeJS;
                    } catch (e) {
                        throw "No secure random number generator found";
                    }
                }
            }
        }, function() {
            return Module.getRandomValue();
        } ];
        function _emscripten_asm_const_i(code) {
            return ASM_CONSTS[code]();
        }
        STATIC_BASE = GLOBAL_BASE;
        STATICTOP = STATIC_BASE + 3376;
        __ATINIT__.push();
        var STATIC_BUMP = 3376;
        Module["STATIC_BASE"] = STATIC_BASE;
        Module["STATIC_BUMP"] = STATIC_BUMP;
        var tempDoublePtr = STATICTOP;
        STATICTOP += 16;
        assert(tempDoublePtr % 8 == 0);
        function ___assert_fail(condition, filename, line, func) {
            abort("Assertion failed: " + Pointer_stringify(condition) + ", at: " + [ filename ? Pointer_stringify(filename) : "unknown filename", line, func ? Pointer_stringify(func) : "unknown function" ]);
        }
        function ___errno_location() {
            Module["printErr"]("missing function: __errno_location");
            abort(-1);
        }
        function _emscripten_memcpy_big(dest, src, num) {
            HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
            return dest;
        }
        function ___setErrNo(value) {
            if (Module["___errno_location"]) SAFE_HEAP_STORE(Module["___errno_location"]() | 0, value | 0, 4); else Module.printErr("failed to set errno from JS");
            return value;
        }
        DYNAMICTOP_PTR = staticAlloc(4);
        STACK_BASE = STACKTOP = alignMemory(STATICTOP);
        STACK_MAX = STACK_BASE + TOTAL_STACK;
        DYNAMIC_BASE = alignMemory(STACK_MAX);
        HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
        staticSealed = true;
        assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
        var ASSERTIONS = true;
        function intArrayToString(array) {
            var ret = [];
            for (var i = 0; i < array.length; i++) {
                var chr = array[i];
                if (chr > 255) {
                    if (ASSERTIONS) {
                        assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.");
                    }
                    chr &= 255;
                }
                ret.push(String.fromCharCode(chr));
            }
            return ret.join("");
        }
        var decodeBase64 = typeof atob === "function" ? atob : function(input) {
            var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));
                chr1 = enc1 << 2 | enc2 >> 4;
                chr2 = (enc2 & 15) << 4 | enc3 >> 2;
                chr3 = (enc3 & 3) << 6 | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 !== 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 !== 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);
            return output;
        };
        function intArrayFromBase64(s) {
            if (typeof ENVIRONMENT_IS_NODE === "boolean" && ENVIRONMENT_IS_NODE) {
                var buf;
                try {
                    buf = Buffer.from(s, "base64");
                } catch (_) {
                    buf = new Buffer(s, "base64");
                }
                return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            }
            try {
                var decoded = decodeBase64(s);
                var bytes = new Uint8Array(decoded.length);
                for (var i = 0; i < decoded.length; ++i) {
                    bytes[i] = decoded.charCodeAt(i);
                }
                return bytes;
            } catch (_) {
                throw new Error("Converting base64 string to bytes failed.");
            }
        }
        function tryParseAsDataURI(filename) {
            if (!isDataURI(filename)) {
                return;
            }
            return intArrayFromBase64(filename.slice(dataURIPrefix.length));
        }
        Module["wasmTableSize"] = 0;
        Module["wasmMaxTableSize"] = 0;
        Module.asmGlobalArg = {};
        Module.asmLibraryArg = {
            enlargeMemory: enlargeMemory,
            getTotalMemory: getTotalMemory,
            abortOnCannotGrowMemory: abortOnCannotGrowMemory,
            abortStackOverflow: abortStackOverflow,
            segfault: segfault,
            alignfault: alignfault,
            ___assert_fail: ___assert_fail,
            ___errno_location: ___errno_location,
            ___setErrNo: ___setErrNo,
            _emscripten_asm_const_i: _emscripten_asm_const_i,
            _emscripten_memcpy_big: _emscripten_memcpy_big,
            DYNAMICTOP_PTR: DYNAMICTOP_PTR,
            STACKTOP: STACKTOP,
            STACK_MAX: STACK_MAX
        };
        var asm = Module["asm"](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
        var real__free = asm["_free"];
        asm["_free"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__free.apply(null, arguments);
        };
        var real__malloc = asm["_malloc"];
        asm["_malloc"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__malloc.apply(null, arguments);
        };
        var real__sbrk = asm["_sbrk"];
        asm["_sbrk"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sbrk.apply(null, arguments);
        };
        var real__sphincsjs_init = asm["_sphincsjs_init"];
        asm["_sphincsjs_init"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_init.apply(null, arguments);
        };
        var real__sphincsjs_keypair = asm["_sphincsjs_keypair"];
        asm["_sphincsjs_keypair"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_keypair.apply(null, arguments);
        };
        var real__sphincsjs_open = asm["_sphincsjs_open"];
        asm["_sphincsjs_open"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_open.apply(null, arguments);
        };
        var real__sphincsjs_public_key_bytes = asm["_sphincsjs_public_key_bytes"];
        asm["_sphincsjs_public_key_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_public_key_bytes.apply(null, arguments);
        };
        var real__sphincsjs_secret_key_bytes = asm["_sphincsjs_secret_key_bytes"];
        asm["_sphincsjs_secret_key_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_secret_key_bytes.apply(null, arguments);
        };
        var real__sphincsjs_sign = asm["_sphincsjs_sign"];
        asm["_sphincsjs_sign"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_sign.apply(null, arguments);
        };
        var real__sphincsjs_signature_bytes = asm["_sphincsjs_signature_bytes"];
        asm["_sphincsjs_signature_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_signature_bytes.apply(null, arguments);
        };
        var real_establishStackSpace = asm["establishStackSpace"];
        asm["establishStackSpace"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_establishStackSpace.apply(null, arguments);
        };
        var real_getTempRet0 = asm["getTempRet0"];
        asm["getTempRet0"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_getTempRet0.apply(null, arguments);
        };
        var real_setDynamicTop = asm["setDynamicTop"];
        asm["setDynamicTop"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_setDynamicTop.apply(null, arguments);
        };
        var real_setTempRet0 = asm["setTempRet0"];
        asm["setTempRet0"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_setTempRet0.apply(null, arguments);
        };
        var real_setThrew = asm["setThrew"];
        asm["setThrew"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_setThrew.apply(null, arguments);
        };
        var real_stackAlloc = asm["stackAlloc"];
        asm["stackAlloc"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_stackAlloc.apply(null, arguments);
        };
        var real_stackRestore = asm["stackRestore"];
        asm["stackRestore"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_stackRestore.apply(null, arguments);
        };
        var real_stackSave = asm["stackSave"];
        asm["stackSave"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_stackSave.apply(null, arguments);
        };
        Module["asm"] = asm;
        var _free = Module["_free"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_free"].apply(null, arguments);
        };
        var _malloc = Module["_malloc"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_malloc"].apply(null, arguments);
        };
        var _sbrk = Module["_sbrk"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sbrk"].apply(null, arguments);
        };
        var _sphincsjs_init = Module["_sphincsjs_init"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sphincsjs_init"].apply(null, arguments);
        };
        var _sphincsjs_keypair = Module["_sphincsjs_keypair"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sphincsjs_keypair"].apply(null, arguments);
        };
        var _sphincsjs_open = Module["_sphincsjs_open"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sphincsjs_open"].apply(null, arguments);
        };
        var _sphincsjs_public_key_bytes = Module["_sphincsjs_public_key_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sphincsjs_public_key_bytes"].apply(null, arguments);
        };
        var _sphincsjs_secret_key_bytes = Module["_sphincsjs_secret_key_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sphincsjs_secret_key_bytes"].apply(null, arguments);
        };
        var _sphincsjs_sign = Module["_sphincsjs_sign"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sphincsjs_sign"].apply(null, arguments);
        };
        var _sphincsjs_signature_bytes = Module["_sphincsjs_signature_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["_sphincsjs_signature_bytes"].apply(null, arguments);
        };
        var establishStackSpace = Module["establishStackSpace"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["establishStackSpace"].apply(null, arguments);
        };
        var getTempRet0 = Module["getTempRet0"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["getTempRet0"].apply(null, arguments);
        };
        var setDynamicTop = Module["setDynamicTop"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["setDynamicTop"].apply(null, arguments);
        };
        var setTempRet0 = Module["setTempRet0"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["setTempRet0"].apply(null, arguments);
        };
        var setThrew = Module["setThrew"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["setThrew"].apply(null, arguments);
        };
        var stackAlloc = Module["stackAlloc"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["stackAlloc"].apply(null, arguments);
        };
        var stackRestore = Module["stackRestore"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["stackRestore"].apply(null, arguments);
        };
        var stackSave = Module["stackSave"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return Module["asm"]["stackSave"].apply(null, arguments);
        };
        var MAGIC = 0;
        Math.random = function() {
            MAGIC = Math.pow(MAGIC + 1.8912, 3) % 1;
            return MAGIC;
        };
        var TIME = 1e4;
        Date.now = function() {
            return TIME++;
        };
        if (typeof performance === "object") performance.now = Date.now;
        if (!Module) Module = {};
        Module["thisProgram"] = "thisProgram";
        Module["asm"] = asm;
        if (!Module["intArrayFromString"]) Module["intArrayFromString"] = function() {
            abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["intArrayToString"]) Module["intArrayToString"] = function() {
            abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["ccall"]) Module["ccall"] = function() {
            abort("'ccall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["cwrap"]) Module["cwrap"] = function() {
            abort("'cwrap' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["setValue"]) Module["setValue"] = function() {
            abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getValue"]) Module["getValue"] = function() {
            abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["allocate"]) Module["allocate"] = function() {
            abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getMemory"]) Module["getMemory"] = function() {
            abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["Pointer_stringify"]) Module["Pointer_stringify"] = function() {
            abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["AsciiToString"]) Module["AsciiToString"] = function() {
            abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToAscii"]) Module["stringToAscii"] = function() {
            abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF8ArrayToString"]) Module["UTF8ArrayToString"] = function() {
            abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF8ToString"]) Module["UTF8ToString"] = function() {
            abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF8Array"]) Module["stringToUTF8Array"] = function() {
            abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF8"]) Module["stringToUTF8"] = function() {
            abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["lengthBytesUTF8"]) Module["lengthBytesUTF8"] = function() {
            abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF16ToString"]) Module["UTF16ToString"] = function() {
            abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF16"]) Module["stringToUTF16"] = function() {
            abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["lengthBytesUTF16"]) Module["lengthBytesUTF16"] = function() {
            abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF32ToString"]) Module["UTF32ToString"] = function() {
            abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF32"]) Module["stringToUTF32"] = function() {
            abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["lengthBytesUTF32"]) Module["lengthBytesUTF32"] = function() {
            abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["allocateUTF8"]) Module["allocateUTF8"] = function() {
            abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackTrace"]) Module["stackTrace"] = function() {
            abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnPreRun"]) Module["addOnPreRun"] = function() {
            abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnInit"]) Module["addOnInit"] = function() {
            abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnPreMain"]) Module["addOnPreMain"] = function() {
            abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnExit"]) Module["addOnExit"] = function() {
            abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnPostRun"]) Module["addOnPostRun"] = function() {
            abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["writeStringToMemory"]) Module["writeStringToMemory"] = function() {
            abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        Module["writeArrayToMemory"] = writeArrayToMemory;
        if (!Module["writeAsciiToMemory"]) Module["writeAsciiToMemory"] = function() {
            abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addRunDependency"]) Module["addRunDependency"] = function() {
            abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["removeRunDependency"]) Module["removeRunDependency"] = function() {
            abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS"]) Module["FS"] = function() {
            abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["FS_createFolder"]) Module["FS_createFolder"] = function() {
            abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createPath"]) Module["FS_createPath"] = function() {
            abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createDataFile"]) Module["FS_createDataFile"] = function() {
            abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createPreloadedFile"]) Module["FS_createPreloadedFile"] = function() {
            abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createLazyFile"]) Module["FS_createLazyFile"] = function() {
            abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createLink"]) Module["FS_createLink"] = function() {
            abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createDevice"]) Module["FS_createDevice"] = function() {
            abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_unlink"]) Module["FS_unlink"] = function() {
            abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["GL"]) Module["GL"] = function() {
            abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["staticAlloc"]) Module["staticAlloc"] = function() {
            abort("'staticAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["dynamicAlloc"]) Module["dynamicAlloc"] = function() {
            abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["warnOnce"]) Module["warnOnce"] = function() {
            abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["loadDynamicLibrary"]) Module["loadDynamicLibrary"] = function() {
            abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["loadWebAssemblyModule"]) Module["loadWebAssemblyModule"] = function() {
            abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getLEB"]) Module["getLEB"] = function() {
            abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getFunctionTables"]) Module["getFunctionTables"] = function() {
            abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["alignFunctionTables"]) Module["alignFunctionTables"] = function() {
            abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["registerFunctions"]) Module["registerFunctions"] = function() {
            abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addFunction"]) Module["addFunction"] = function() {
            abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["removeFunction"]) Module["removeFunction"] = function() {
            abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getFuncWrapper"]) Module["getFuncWrapper"] = function() {
            abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["prettyPrint"]) Module["prettyPrint"] = function() {
            abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["makeBigInt"]) Module["makeBigInt"] = function() {
            abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["dynCall"]) Module["dynCall"] = function() {
            abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getCompilerSetting"]) Module["getCompilerSetting"] = function() {
            abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackSave"]) Module["stackSave"] = function() {
            abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackRestore"]) Module["stackRestore"] = function() {
            abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackAlloc"]) Module["stackAlloc"] = function() {
            abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["intArrayFromBase64"]) Module["intArrayFromBase64"] = function() {
            abort("'intArrayFromBase64' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["tryParseAsDataURI"]) Module["tryParseAsDataURI"] = function() {
            abort("'tryParseAsDataURI' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["ALLOC_NORMAL"]) Object.defineProperty(Module, "ALLOC_NORMAL", {
            get: function() {
                abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_STACK"]) Object.defineProperty(Module, "ALLOC_STACK", {
            get: function() {
                abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_STATIC"]) Object.defineProperty(Module, "ALLOC_STATIC", {
            get: function() {
                abort("'ALLOC_STATIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_DYNAMIC"]) Object.defineProperty(Module, "ALLOC_DYNAMIC", {
            get: function() {
                abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_NONE"]) Object.defineProperty(Module, "ALLOC_NONE", {
            get: function() {
                abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        function ExitStatus(status) {
            this.name = "ExitStatus";
            this.message = "Program terminated with exit(" + status + ")";
            this.status = status;
        }
        ExitStatus.prototype = new Error();
        ExitStatus.prototype.constructor = ExitStatus;
        var initialStackTop;
        dependenciesFulfilled = function runCaller() {
            if (!Module["calledRun"]) run();
            if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
        };
        function run(args) {
            args = args || Module["arguments"];
            if (runDependencies > 0) {
                return;
            }
            writeStackCookie();
            preRun();
            if (runDependencies > 0) return;
            if (Module["calledRun"]) return;
            function doRun() {
                if (Module["calledRun"]) return;
                Module["calledRun"] = true;
                if (ABORT) return;
                ensureInitRuntime();
                preMain();
                if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
                assert(!Module["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
                postRun();
            }
            if (Module["setStatus"]) {
                Module["setStatus"]("Running...");
                setTimeout(function() {
                    setTimeout(function() {
                        Module["setStatus"]("");
                    }, 1);
                    doRun();
                }, 1);
            } else {
                doRun();
            }
            checkStackCookie();
        }
        Module["run"] = run;
        function checkUnflushedContent() {
            var print = Module["print"];
            var printErr = Module["printErr"];
            var has = false;
            Module["print"] = Module["printErr"] = function(x) {
                has = true;
            };
            try {
                var flush = null;
                if (flush) flush(0);
            } catch (e) {}
            Module["print"] = print;
            Module["printErr"] = printErr;
            if (has) {
                warnOnce("stdio streams had content in them that was not flushed. you should set NO_EXIT_RUNTIME to 0 (see the FAQ), or make sure to emit a newline when you printf etc.");
            }
        }
        function exit(status, implicit) {
            checkUnflushedContent();
            if (implicit && Module["noExitRuntime"] && status === 0) {
                return;
            }
            if (Module["noExitRuntime"]) {
                if (!implicit) {
                    Module.printErr("exit(" + status + ") called, but NO_EXIT_RUNTIME is set, so halting execution but not exiting the runtime or preventing further async execution (build with NO_EXIT_RUNTIME=0, if you want a true shutdown)");
                }
            } else {
                ABORT = true;
                EXITSTATUS = status;
                STACKTOP = initialStackTop;
                exitRuntime();
                if (Module["onExit"]) Module["onExit"](status);
            }
            if (ENVIRONMENT_IS_NODE) {
                process["exit"](status);
            }
            Module["quit"](status, new ExitStatus(status));
        }
        Module["exit"] = exit;
        var abortDecorators = [];
        function abort(what) {
            if (Module["onAbort"]) {
                Module["onAbort"](what);
            }
            if (what !== undefined) {
                Module.print(what);
                Module.printErr(what);
                what = JSON.stringify(what);
            } else {
                what = "";
            }
            ABORT = true;
            EXITSTATUS = 1;
            var extra = "";
            var output = "abort(" + what + ") at " + stackTrace() + extra;
            if (abortDecorators) {
                abortDecorators.forEach(function(decorator) {
                    output = decorator(output, what);
                });
            }
            throw output;
        }
        Module["abort"] = abort;
        if (Module["preInit"]) {
            if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
            while (Module["preInit"].length > 0) {
                Module["preInit"].pop()();
            }
        }
        Module["noExitRuntime"] = true;
        run();
    }).catch(function() {
        var Module = _Module;
        Module.onAbort = undefined;
        Module.onRuntimeInitialized = undefined;
        var Module = typeof Module !== "undefined" ? Module : {};
        var moduleOverrides = {};
        var key;
        for (key in Module) {
            if (Module.hasOwnProperty(key)) {
                moduleOverrides[key] = Module[key];
            }
        }
        Module["arguments"] = [];
        Module["thisProgram"] = "./this.program";
        Module["quit"] = function(status, toThrow) {
            throw toThrow;
        };
        Module["preRun"] = [];
        Module["postRun"] = [];
        var ENVIRONMENT_IS_WEB = false;
        var ENVIRONMENT_IS_WORKER = false;
        var ENVIRONMENT_IS_NODE = false;
        var ENVIRONMENT_IS_SHELL = false;
        if (Module["ENVIRONMENT"]) {
            if (Module["ENVIRONMENT"] === "WEB") {
                ENVIRONMENT_IS_WEB = true;
            } else if (Module["ENVIRONMENT"] === "WORKER") {
                ENVIRONMENT_IS_WORKER = true;
            } else if (Module["ENVIRONMENT"] === "NODE") {
                ENVIRONMENT_IS_NODE = true;
            } else if (Module["ENVIRONMENT"] === "SHELL") {
                ENVIRONMENT_IS_SHELL = true;
            } else {
                throw new Error("Module['ENVIRONMENT'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL.");
            }
        } else {
            ENVIRONMENT_IS_WEB = typeof window === "object";
            ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
            ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
            ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
        }
        if (ENVIRONMENT_IS_NODE) {
            var nodeFS;
            var nodePath;
            Module["read"] = function shell_read(filename, binary) {
                var ret;
                ret = tryParseAsDataURI(filename);
                if (!ret) {
                    if (!nodeFS) nodeFS = eval("require")("fs");
                    if (!nodePath) nodePath = eval("require")("path");
                    filename = nodePath["normalize"](filename);
                    ret = nodeFS["readFileSync"](filename);
                }
                return binary ? ret : ret.toString();
            };
            Module["readBinary"] = function readBinary(filename) {
                var ret = Module["read"](filename, true);
                if (!ret.buffer) {
                    ret = new Uint8Array(ret);
                }
                assert(ret.buffer);
                return ret;
            };
            if (process["argv"].length > 1) {
                Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
            }
            Module["arguments"] = process["argv"].slice(2);
            if (typeof module !== "undefined") {
                module["exports"] = Module;
            }
            process["on"]("uncaughtException", function(ex) {
                if (!(ex instanceof ExitStatus)) {
                    throw ex;
                }
            });
            process["on"]("unhandledRejection", function(reason, p) {
                Module["printErr"]("node.js exiting due to unhandled promise rejection");
                process["exit"](1);
            });
            Module["inspect"] = function() {
                return "[Emscripten Module object]";
            };
        } else if (ENVIRONMENT_IS_SHELL) {
            if (typeof read != "undefined") {
                Module["read"] = function shell_read(f) {
                    var data = tryParseAsDataURI(f);
                    if (data) {
                        return intArrayToString(data);
                    }
                    return read(f);
                };
            }
            Module["readBinary"] = function readBinary(f) {
                var data;
                data = tryParseAsDataURI(f);
                if (data) {
                    return data;
                }
                if (typeof readbuffer === "function") {
                    return new Uint8Array(readbuffer(f));
                }
                data = read(f, "binary");
                assert(typeof data === "object");
                return data;
            };
            if (typeof scriptArgs != "undefined") {
                Module["arguments"] = scriptArgs;
            } else if (typeof arguments != "undefined") {
                Module["arguments"] = arguments;
            }
            if (typeof quit === "function") {
                Module["quit"] = function(status, toThrow) {
                    quit(status);
                };
            }
        } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
            Module["read"] = function shell_read(url) {
                try {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, false);
                    xhr.send(null);
                    return xhr.responseText;
                } catch (err) {
                    var data = tryParseAsDataURI(url);
                    if (data) {
                        return intArrayToString(data);
                    }
                    throw err;
                }
            };
            if (ENVIRONMENT_IS_WORKER) {
                Module["readBinary"] = function readBinary(url) {
                    try {
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET", url, false);
                        xhr.responseType = "arraybuffer";
                        xhr.send(null);
                        return new Uint8Array(xhr.response);
                    } catch (err) {
                        var data = tryParseAsDataURI(url);
                        if (data) {
                            return data;
                        }
                        throw err;
                    }
                };
            }
            Module["readAsync"] = function readAsync(url, onload, onerror) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = function xhr_onload() {
                    if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                        onload(xhr.response);
                        return;
                    }
                    var data = tryParseAsDataURI(url);
                    if (data) {
                        onload(data.buffer);
                        return;
                    }
                    onerror();
                };
                xhr.onerror = onerror;
                xhr.send(null);
            };
            Module["setWindowTitle"] = function(title) {
                document.title = title;
            };
        } else {
            throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
        }
        Module["print"] = typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null;
        Module["printErr"] = typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn.bind(console) || Module["print"];
        Module.print = Module["print"];
        Module.printErr = Module["printErr"];
        for (key in moduleOverrides) {
            if (moduleOverrides.hasOwnProperty(key)) {
                Module[key] = moduleOverrides[key];
            }
        }
        moduleOverrides = undefined;
        var STACK_ALIGN = 16;
        stackSave = stackRestore = stackAlloc = setTempRet0 = getTempRet0 = function() {
            abort("cannot use the stack before compiled code is ready to run, and has provided stack access");
        };
        function staticAlloc(size) {
            assert(!staticSealed);
            var ret = STATICTOP;
            STATICTOP = STATICTOP + size + 15 & -16;
            return ret;
        }
        function alignMemory(size, factor) {
            if (!factor) factor = STACK_ALIGN;
            var ret = size = Math.ceil(size / factor) * factor;
            return ret;
        }
        function warnOnce(text) {
            if (!warnOnce.shown) warnOnce.shown = {};
            if (!warnOnce.shown[text]) {
                warnOnce.shown[text] = 1;
                Module.printErr(text);
            }
        }
        var asm2wasmImports = {
            "f64-rem": function(x, y) {
                return x % y;
            },
            debugger: function() {
                debugger;
            }
        };
        var functionPointers = new Array(0);
        var GLOBAL_BASE = 1024;
        function getSafeHeapType(bytes, isFloat) {
            switch (bytes) {
              case 1:
                return "i8";

              case 2:
                return "i16";

              case 4:
                return isFloat ? "float" : "i32";

              case 8:
                return "double";

              default:
                assert(0);
            }
        }
        function SAFE_HEAP_STORE(dest, value, bytes, isFloat) {
            if (dest <= 0) abort("segmentation fault storing " + bytes + " bytes to address " + dest);
            if (dest % bytes !== 0) abort("alignment error storing to address " + dest + ", which was expected to be aligned to a multiple of " + bytes);
            if (staticSealed) {
                if (dest + bytes > HEAP32[DYNAMICTOP_PTR >> 2]) abort("segmentation fault, exceeded the top of the available dynamic heap when storing " + bytes + " bytes to address " + dest + ". STATICTOP=" + STATICTOP + ", DYNAMICTOP=" + HEAP32[DYNAMICTOP_PTR >> 2]);
                assert(DYNAMICTOP_PTR);
                assert(HEAP32[DYNAMICTOP_PTR >> 2] <= TOTAL_MEMORY);
            } else {
                if (dest + bytes > STATICTOP) abort("segmentation fault, exceeded the top of the available static heap when storing " + bytes + " bytes to address " + dest + ". STATICTOP=" + STATICTOP);
            }
            setValue(dest, value, getSafeHeapType(bytes, isFloat), 1);
        }
        function SAFE_HEAP_STORE_D(dest, value, bytes) {
            SAFE_HEAP_STORE(dest, value, bytes, true);
        }
        function SAFE_HEAP_LOAD(dest, bytes, unsigned, isFloat) {
            if (dest <= 0) abort("segmentation fault loading " + bytes + " bytes from address " + dest);
            if (dest % bytes !== 0) abort("alignment error loading from address " + dest + ", which was expected to be aligned to a multiple of " + bytes);
            if (staticSealed) {
                if (dest + bytes > HEAP32[DYNAMICTOP_PTR >> 2]) abort("segmentation fault, exceeded the top of the available dynamic heap when loading " + bytes + " bytes from address " + dest + ". STATICTOP=" + STATICTOP + ", DYNAMICTOP=" + HEAP32[DYNAMICTOP_PTR >> 2]);
                assert(DYNAMICTOP_PTR);
                assert(HEAP32[DYNAMICTOP_PTR >> 2] <= TOTAL_MEMORY);
            } else {
                if (dest + bytes > STATICTOP) abort("segmentation fault, exceeded the top of the available static heap when loading " + bytes + " bytes from address " + dest + ". STATICTOP=" + STATICTOP);
            }
            var type = getSafeHeapType(bytes, isFloat);
            var ret = getValue(dest, type, 1);
            if (unsigned) ret = unSign(ret, parseInt(type.substr(1)), 1);
            return ret;
        }
        function SAFE_HEAP_LOAD_D(dest, bytes, unsigned) {
            return SAFE_HEAP_LOAD(dest, bytes, unsigned, true);
        }
        function segfault() {
            abort("segmentation fault");
        }
        function alignfault() {
            abort("alignment fault");
        }
        var ABORT = 0;
        var EXITSTATUS = 0;
        function assert(condition, text) {
            if (!condition) {
                abort("Assertion failed: " + text);
            }
        }
        function setValue(ptr, value, type, noSafe) {
            type = type || "i8";
            if (type.charAt(type.length - 1) === "*") type = "i32";
            if (noSafe) {
                switch (type) {
                  case "i1":
                    HEAP8[ptr >> 0] = value;
                    break;

                  case "i8":
                    HEAP8[ptr >> 0] = value;
                    break;

                  case "i16":
                    HEAP16[ptr >> 1] = value;
                    break;

                  case "i32":
                    HEAP32[ptr >> 2] = value;
                    break;

                  case "i64":
                    tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0) ], 
                    HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
                    break;

                  case "float":
                    HEAPF32[ptr >> 2] = value;
                    break;

                  case "double":
                    HEAPF64[ptr >> 3] = value;
                    break;

                  default:
                    abort("invalid type for setValue: " + type);
                }
            } else {
                switch (type) {
                  case "i1":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 1);
                    break;

                  case "i8":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 1);
                    break;

                  case "i16":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 2);
                    break;

                  case "i32":
                    SAFE_HEAP_STORE(ptr | 0, value | 0, 4);
                    break;

                  case "i64":
                    tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0) ], 
                    SAFE_HEAP_STORE(ptr | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(ptr + 4 | 0, tempI64[1] | 0, 4);
                    break;

                  case "float":
                    SAFE_HEAP_STORE_D(ptr | 0, Math_fround(value), 4);
                    break;

                  case "double":
                    SAFE_HEAP_STORE_D(ptr | 0, +value, 8);
                    break;

                  default:
                    abort("invalid type for setValue: " + type);
                }
            }
        }
        function getValue(ptr, type, noSafe) {
            type = type || "i8";
            if (type.charAt(type.length - 1) === "*") type = "i32";
            if (noSafe) {
                switch (type) {
                  case "i1":
                    return HEAP8[ptr >> 0];

                  case "i8":
                    return HEAP8[ptr >> 0];

                  case "i16":
                    return HEAP16[ptr >> 1];

                  case "i32":
                    return HEAP32[ptr >> 2];

                  case "i64":
                    return HEAP32[ptr >> 2];

                  case "float":
                    return HEAPF32[ptr >> 2];

                  case "double":
                    return HEAPF64[ptr >> 3];

                  default:
                    abort("invalid type for getValue: " + type);
                }
            } else {
                switch (type) {
                  case "i1":
                    return SAFE_HEAP_LOAD(ptr | 0, 1, 0) | 0;

                  case "i8":
                    return SAFE_HEAP_LOAD(ptr | 0, 1, 0) | 0;

                  case "i16":
                    return SAFE_HEAP_LOAD(ptr | 0, 2, 0) | 0;

                  case "i32":
                    return SAFE_HEAP_LOAD(ptr | 0, 4, 0) | 0;

                  case "i64":
                    return SAFE_HEAP_LOAD(ptr | 0, 8, 0) | 0;

                  case "float":
                    return Math_fround(SAFE_HEAP_LOAD_D(ptr | 0, 4, 0));

                  case "double":
                    return +SAFE_HEAP_LOAD_D(ptr | 0, 8, 0);

                  default:
                    abort("invalid type for getValue: " + type);
                }
            }
            return null;
        }
        function Pointer_stringify(ptr, length) {
            if (length === 0 || !ptr) return "";
            var hasUtf = 0;
            var t;
            var i = 0;
            while (1) {
                assert(ptr + i < TOTAL_MEMORY);
                t = SAFE_HEAP_LOAD(ptr + i | 0, 1, 1) | 0;
                hasUtf |= t;
                if (t == 0 && !length) break;
                i++;
                if (length && i == length) break;
            }
            if (!length) length = i;
            var ret = "";
            if (hasUtf < 128) {
                var MAX_CHUNK = 1024;
                var curr;
                while (length > 0) {
                    curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
                    ret = ret ? ret + curr : curr;
                    ptr += MAX_CHUNK;
                    length -= MAX_CHUNK;
                }
                return ret;
            }
            return UTF8ToString(ptr);
        }
        var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
        function UTF8ArrayToString(u8Array, idx) {
            var endPtr = idx;
            while (u8Array[endPtr]) ++endPtr;
            if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
                return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
            } else {
                var u0, u1, u2, u3, u4, u5;
                var str = "";
                while (1) {
                    u0 = u8Array[idx++];
                    if (!u0) return str;
                    if (!(u0 & 128)) {
                        str += String.fromCharCode(u0);
                        continue;
                    }
                    u1 = u8Array[idx++] & 63;
                    if ((u0 & 224) == 192) {
                        str += String.fromCharCode((u0 & 31) << 6 | u1);
                        continue;
                    }
                    u2 = u8Array[idx++] & 63;
                    if ((u0 & 240) == 224) {
                        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
                    } else {
                        u3 = u8Array[idx++] & 63;
                        if ((u0 & 248) == 240) {
                            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
                        } else {
                            u4 = u8Array[idx++] & 63;
                            if ((u0 & 252) == 248) {
                                u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
                            } else {
                                u5 = u8Array[idx++] & 63;
                                u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
                            }
                        }
                    }
                    if (u0 < 65536) {
                        str += String.fromCharCode(u0);
                    } else {
                        var ch = u0 - 65536;
                        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
                    }
                }
            }
        }
        function UTF8ToString(ptr) {
            return UTF8ArrayToString(HEAPU8, ptr);
        }
        var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;
        function demangle(func) {
            warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
            return func;
        }
        function demangleAll(text) {
            var regex = /__Z[\w\d_]+/g;
            return text.replace(regex, function(x) {
                var y = demangle(x);
                return x === y ? x : x + " [" + y + "]";
            });
        }
        function jsStackTrace() {
            var err = new Error();
            if (!err.stack) {
                try {
                    throw new Error(0);
                } catch (e) {
                    err = e;
                }
                if (!err.stack) {
                    return "(no stack trace available)";
                }
            }
            return err.stack.toString();
        }
        function stackTrace() {
            var js = jsStackTrace();
            if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
            return demangleAll(js);
        }
        var WASM_PAGE_SIZE = 65536;
        var ASMJS_PAGE_SIZE = 16777216;
        function alignUp(x, multiple) {
            if (x % multiple > 0) {
                x += multiple - x % multiple;
            }
            return x;
        }
        var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
        function updateGlobalBuffer(buf) {
            Module["buffer"] = buffer = buf;
        }
        function updateGlobalBufferViews() {
            Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
            Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
            Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
            Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
            Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
            Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
            Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
            Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
        }
        var STATIC_BASE, STATICTOP, staticSealed;
        var STACK_BASE, STACKTOP, STACK_MAX;
        var DYNAMIC_BASE, DYNAMICTOP_PTR;
        STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
        staticSealed = false;
        function writeStackCookie() {
            assert((STACK_MAX & 3) == 0);
            HEAPU32[(STACK_MAX >> 2) - 1] = 34821223;
            HEAPU32[(STACK_MAX >> 2) - 2] = 2310721022;
        }
        function checkStackCookie() {
            if (HEAPU32[(STACK_MAX >> 2) - 1] != 34821223 || HEAPU32[(STACK_MAX >> 2) - 2] != 2310721022) {
                abort("Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x" + HEAPU32[(STACK_MAX >> 2) - 2].toString(16) + " " + HEAPU32[(STACK_MAX >> 2) - 1].toString(16));
            }
            if (HEAP32[0] !== 1668509029) throw "Runtime error: The application has corrupted its heap memory area (address zero)!";
        }
        function abortStackOverflow(allocSize) {
            abort("Stack overflow! Attempted to allocate " + allocSize + " bytes on the stack, but stack has only " + (STACK_MAX - stackSave() + allocSize) + " bytes available!");
        }
        function abortOnCannotGrowMemory() {
            abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ");
        }
        function enlargeMemory() {
            abortOnCannotGrowMemory();
        }
        var TOTAL_STACK = Module["TOTAL_STACK"] || 8388608;
        var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
        if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
        assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined, "JS engine does not provide full typed array support");
        if (Module["buffer"]) {
            buffer = Module["buffer"];
            assert(buffer.byteLength === TOTAL_MEMORY, "provided buffer should be " + TOTAL_MEMORY + " bytes, but it is " + buffer.byteLength);
        } else {
            if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
                assert(TOTAL_MEMORY % WASM_PAGE_SIZE === 0);
                Module["wasmMemory"] = new WebAssembly.Memory({
                    initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
                    maximum: TOTAL_MEMORY / WASM_PAGE_SIZE
                });
                buffer = Module["wasmMemory"].buffer;
            } else {
                buffer = new ArrayBuffer(TOTAL_MEMORY);
            }
            assert(buffer.byteLength === TOTAL_MEMORY);
            Module["buffer"] = buffer;
        }
        updateGlobalBufferViews();
        function getTotalMemory() {
            return TOTAL_MEMORY;
        }
        HEAP32[0] = 1668509029;
        HEAP16[1] = 25459;
        if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw "Runtime error: expected the system to be little-endian!";
        function callRuntimeCallbacks(callbacks) {
            while (callbacks.length > 0) {
                var callback = callbacks.shift();
                if (typeof callback == "function") {
                    callback();
                    continue;
                }
                var func = callback.func;
                if (typeof func === "number") {
                    if (callback.arg === undefined) {
                        Module["dynCall_v"](func);
                    } else {
                        Module["dynCall_vi"](func, callback.arg);
                    }
                } else {
                    func(callback.arg === undefined ? null : callback.arg);
                }
            }
        }
        var __ATPRERUN__ = [];
        var __ATINIT__ = [];
        var __ATMAIN__ = [];
        var __ATEXIT__ = [];
        var __ATPOSTRUN__ = [];
        var runtimeInitialized = false;
        var runtimeExited = false;
        function preRun() {
            if (Module["preRun"]) {
                if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
                while (Module["preRun"].length) {
                    addOnPreRun(Module["preRun"].shift());
                }
            }
            callRuntimeCallbacks(__ATPRERUN__);
        }
        function ensureInitRuntime() {
            checkStackCookie();
            if (runtimeInitialized) return;
            runtimeInitialized = true;
            callRuntimeCallbacks(__ATINIT__);
        }
        function preMain() {
            checkStackCookie();
            callRuntimeCallbacks(__ATMAIN__);
        }
        function exitRuntime() {
            checkStackCookie();
            callRuntimeCallbacks(__ATEXIT__);
            runtimeExited = true;
        }
        function postRun() {
            checkStackCookie();
            if (Module["postRun"]) {
                if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
                while (Module["postRun"].length) {
                    addOnPostRun(Module["postRun"].shift());
                }
            }
            callRuntimeCallbacks(__ATPOSTRUN__);
        }
        function addOnPreRun(cb) {
            __ATPRERUN__.unshift(cb);
        }
        function addOnPostRun(cb) {
            __ATPOSTRUN__.unshift(cb);
        }
        function writeArrayToMemory(array, buffer) {
            assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
            HEAP8.set(array, buffer);
        }
        function unSign(value, bits, ignore) {
            if (value >= 0) {
                return value;
            }
            return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
        }
        assert(Math["imul"] && Math["fround"] && Math["clz32"] && Math["trunc"], "this is a legacy browser, build with LEGACY_VM_SUPPORT");
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
        var Math_round = Math.round;
        var Math_min = Math.min;
        var Math_max = Math.max;
        var Math_clz32 = Math.clz32;
        var Math_trunc = Math.trunc;
        var runDependencies = 0;
        var runDependencyWatcher = null;
        var dependenciesFulfilled = null;
        var runDependencyTracking = {};
        function addRunDependency(id) {
            runDependencies++;
            if (Module["monitorRunDependencies"]) {
                Module["monitorRunDependencies"](runDependencies);
            }
            if (id) {
                assert(!runDependencyTracking[id]);
                runDependencyTracking[id] = 1;
                if (runDependencyWatcher === null && typeof setInterval !== "undefined") {
                    runDependencyWatcher = setInterval(function() {
                        if (ABORT) {
                            clearInterval(runDependencyWatcher);
                            runDependencyWatcher = null;
                            return;
                        }
                        var shown = false;
                        for (var dep in runDependencyTracking) {
                            if (!shown) {
                                shown = true;
                                Module.printErr("still waiting on run dependencies:");
                            }
                            Module.printErr("dependency: " + dep);
                        }
                        if (shown) {
                            Module.printErr("(end of list)");
                        }
                    }, 1e4);
                }
            } else {
                Module.printErr("warning: run dependency added without ID");
            }
        }
        function removeRunDependency(id) {
            runDependencies--;
            if (Module["monitorRunDependencies"]) {
                Module["monitorRunDependencies"](runDependencies);
            }
            if (id) {
                assert(runDependencyTracking[id]);
                delete runDependencyTracking[id];
            } else {
                Module.printErr("warning: run dependency removed without ID");
            }
            if (runDependencies == 0) {
                if (runDependencyWatcher !== null) {
                    clearInterval(runDependencyWatcher);
                    runDependencyWatcher = null;
                }
                if (dependenciesFulfilled) {
                    var callback = dependenciesFulfilled;
                    dependenciesFulfilled = null;
                    callback();
                }
            }
        }
        Module["preloadedImages"] = {};
        Module["preloadedAudios"] = {};
        var FS = {
            error: function() {
                abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1");
            },
            init: function() {
                FS.error();
            },
            createDataFile: function() {
                FS.error();
            },
            createPreloadedFile: function() {
                FS.error();
            },
            createLazyFile: function() {
                FS.error();
            },
            open: function() {
                FS.error();
            },
            mkdev: function() {
                FS.error();
            },
            registerDevice: function() {
                FS.error();
            },
            analyzePath: function() {
                FS.error();
            },
            loadFilesFromDB: function() {
                FS.error();
            },
            ErrnoError: function ErrnoError() {
                FS.error();
            }
        };
        Module["FS_createDataFile"] = FS.createDataFile;
        Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
        var dataURIPrefix = "data:application/octet-stream;base64,";
        function isDataURI(filename) {
            return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0;
        }
        function integrateWasmJS() {
            var wasmTextFile = "";
            var wasmBinaryFile = "data:application/octet-stream;base64,AGFzbQEAAAABaw9gAAF/YAF/AGAAAGAEf39/fwBgAX8Bf2ADf39/AX9gAn9/AGAGf39/f39/AX9gB39/f39/f38Bf2AFf39/f38AYAl/f39/f39/f38Bf2ADf39/AGACf38Bf2AFf39/f38Bf2AEf39/fwF/AvICEQNlbnYGbWVtb3J5AgGAAoACA2Vudg5EWU5BTUlDVE9QX1BUUgN/AANlbnYIU1RBQ0tUT1ADfwADZW52CVNUQUNLX01BWAN/AANlbnYNZW5sYXJnZU1lbW9yeQAAA2Vudg5nZXRUb3RhbE1lbW9yeQAAA2VudhdhYm9ydE9uQ2Fubm90R3Jvd01lbW9yeQAAA2VudhJhYm9ydFN0YWNrT3ZlcmZsb3cAAQNlbnYIc2VnZmF1bHQAAgNlbnYKYWxpZ25mYXVsdAACA2Vudg5fX19hc3NlcnRfZmFpbAADA2VudhFfX19lcnJub19sb2NhdGlvbgAAA2VudgtfX19zZXRFcnJObwABA2VudhdfZW1zY3JpcHRlbl9hc21fY29uc3RfaQAEA2VudhZfZW1zY3JpcHRlbl9tZW1jcHlfYmlnAAUDZW52El9sbHZtX3N0YWNrcmVzdG9yZQABA2Vudg9fbGx2bV9zdGFja3NhdmUAAANDQgsFDgUFBQUEAwMODAsGAwsGDgMLBQ4GAwYHBgcAAAAAAAEBAgEGBgwNDQYLBAYDAQ4FDA0GAQwDAwEDBgkKCQMIBAYfBn8BIwALfwEjAQt/ASMCC38BQQALfwFBAAt/AUEACwfwAhYPX2JpdHNoaWZ0NjRMc2hyABAOX2JpdHNoaWZ0NjRTaGwAEQVfZnJlZQA8B19pNjRBZGQADwxfaTY0U3VidHJhY3QAFwdfbWFsbG9jAE4FX3NicmsAFA9fc3BoaW5jc2pzX2luaXQAMBJfc3BoaW5jc2pzX2tleXBhaXIANA9fc3BoaW5jc2pzX29wZW4ANhtfc3BoaW5jc2pzX3B1YmxpY19rZXlfYnl0ZXMALBtfc3BoaW5jc2pzX3NlY3JldF9rZXlfYnl0ZXMALQ9fc3BoaW5jc2pzX3NpZ24ANRpfc3BoaW5jc2pzX3NpZ25hdHVyZV9ieXRlcwArE2VzdGFibGlzaFN0YWNrU3BhY2UAMgtnZXRUZW1wUmV0MAAqDXNldER5bmFtaWNUb3AAMQtz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bVZhbHVlTm9kZUpTOyB9IGNhdGNoIChlKSB7IHRocm93ICdObyBzZWN1cmUgcmFuZG9tIG51bWJlciBnZW5lcmF0b3IgZm91bmQnOyB9IH0gfSB9AGJ1Zl9sZW4gPD0gU0laRV9NQVgAbGlic29kaXVtL3NyYy9saWJzb2RpdW0vcmFuZG9tYnl0ZXMvcmFuZG9tYnl0ZXMuYwByYW5kb21ieXRlcwAAAQIDBAUGBwgJCgsMDQ4PDgoECAkPDQYBDAACCwcFAwsIDAAFAg8NCg4DBgcBCQQHCQMBDQwLDgIGBQoEAA8ICQAFBwIECg8OAQsMBggDDQIMBgoACwgDBA0HBQ8OAQkMBQEPDg0ECgAHBgMJAggLDQsHDgwBAwkFAA8ECAYCCgYPDgkLAwAIDAINBwEECgUKAggEBwYBBQ8LCQ4DDA0AAAECAwQFBgcICQoLDA0ODw4KBAgJDw0GAQwAAgsHBQMLCAwABQIPDQoOAwYHAQkEBwkDAQ0MCw4CBgUKBAAPCIAAQasSC8ACAQIDBAUGBwgJCgsMDQ4PDgoECAkPDQYBDAACCwcFAwsIDAAFAg8NCg4DBgcBCQQHCQMBDQwLDgIGBQoEAA8ICQAFBwIECg8OAQsMBggDDQIMBgoACwgDBA0HBQ8OAQkMBQEPDg0ECgAHBgMJAggLDQsHDgwBAwkFAA8ECAYCCgYPDgkLAwAIDAINBwEECgUKAggEBwYBBQ8LCQ4DDA0AAAECAwQFBgcICQoLDA0ODw4KBAgJDw0GAQwAAgsHBQMLCAwABQIPDQoOAwYHAQkEBwkDAQ0MCw4CBgUKBAAPCAkABQcCBAoPDgELDAYIAw0CDAYKAAsIAwQNBwUPDgEJDAUBDw4NBAoABwYDCQIICw0LBw4MAQMJBQAPBAgGAgoGDw4JCwMACAwCDQcBBAoFCgIIBAcGAQUPCwkOAwwNAIAAQesVC0BleHBhbmQgMzItYnl0ZSBrZXhwYW5kIDE2LWJ5dGUga2V4cGFuZCAzMi1ieXRlIHRvIDY0LWJ5dGUgc3RhdGUh";
            var asmjsCodeFile = "data:application/octet-stream;base64,TW9kdWxlWyJhc20iXSA9ICAoLyoqIEBzdXBwcmVzcyB7dXNlbGVzc0NvZGV9ICovIGZ1bmN0aW9uKGdsb2JhbCwgZW52LCBidWZmZXIpIHsKJ2FsbW9zdCBhc20nOwoKCiAgdmFyIEhFQVA4ID0gbmV3IGdsb2JhbC5JbnQ4QXJyYXkoYnVmZmVyKTsKICB2YXIgSEVBUDE2ID0gbmV3IGdsb2JhbC5JbnQxNkFycmF5KGJ1ZmZlcik7CiAgdmFyIEhFQVAzMiA9IG5ldyBnbG9iYWwuSW50MzJBcnJheShidWZmZXIpOwogIHZhciBIRUFQVTggPSBuZXcgZ2xvYmFsLlVpbnQ4QXJyYXkoYnVmZmVyKTsKICB2YXIgSEVBUFUxNiA9IG5ldyBnbG9iYWwuVWludDE2QXJyYXkoYnVmZmVyKTsKICB2YXIgSEVBUFUzMiA9IG5ldyBnbG9iYWwuVWludDMyQXJyYXkoYnVmZmVyKTsKICB2YXIgSEVBUEYzMiA9IG5ldyBnbG9iYWwuRmxvYXQzMkFycmF5KGJ1ZmZlcik7CiAgdmFyIEhFQVBGNjQgPSBuZXcgZ2xvYmFsLkZsb2F0NjRBcnJheShidWZmZXIpOwoKICB2YXIgRFlOQU1JQ1RPUF9QVFI9ZW52LkRZTkFNSUNUT1BfUFRSfDA7CiAgdmFyIHRlbXBEb3VibGVQdHI9ZW52LnRlbXBEb3VibGVQdHJ8MDsKICB2YXIgQUJPUlQ9ZW52LkFCT1JUfDA7CiAgdmFyIFNUQUNLVE9QPWVudi5TVEFDS1RPUHwwOwogIHZhciBTVEFDS19NQVg9ZW52LlNUQUNLX01BWHwwOwoKICB2YXIgX19USFJFV19fID0gMDsKICB2YXIgdGhyZXdWYWx1ZSA9IDA7CiAgdmFyIHNldGptcElkID0gMDsKICB2YXIgdW5kZWYgPSAwOwogIHZhciBuYW4gPSBnbG9iYWwuTmFOLCBpbmYgPSBnbG9iYWwuSW5maW5pdHk7CiAgdmFyIHRlbXBJbnQgPSAwLCB0ZW1wQmlnSW50ID0gMCwgdGVtcEJpZ0ludFMgPSAwLCB0ZW1wVmFsdWUgPSAwLCB0ZW1wRG91YmxlID0gMC4wOwogIHZhciB0ZW1wUmV0MCA9IDA7CgogIHZhciBNYXRoX2Zsb29yPWdsb2JhbC5NYXRoLmZsb29yOwogIHZhciBNYXRoX2Ficz1nbG9iYWwuTWF0aC5hYnM7CiAgdmFyIE1hdGhfc3FydD1nbG9iYWwuTWF0aC5zcXJ0OwogIHZhciBNYXRoX3Bvdz1nbG9iYWwuTWF0aC5wb3c7CiAgdmFyIE1hdGhfY29zPWdsb2JhbC5NYXRoLmNvczsKICB2YXIgTWF0aF9zaW49Z2xvYmFsLk1hdGguc2luOwogIHZhciBNYXRoX3Rhbj1nbG9iYWwuTWF0aC50YW47CiAgdmFyIE1hdGhfYWNvcz1nbG9iYWwuTWF0aC5hY29zOwogIHZhciBNYXRoX2FzaW49Z2xvYmFsLk1hdGguYXNpbjsKICB2YXIgTWF0aF9hdGFuPWdsb2JhbC5NYXRoLmF0YW47CiAgdmFyIE1hdGhfYXRhbjI9Z2xvYmFsLk1hdGguYXRhbjI7CiAgdmFyIE1hdGhfZXhwPWdsb2JhbC5NYXRoLmV4cDsKICB2YXIgTWF0aF9sb2c9Z2xvYmFsLk1hdGgubG9nOwogIHZhciBNYXRoX2NlaWw9Z2xvYmFsLk1hdGguY2VpbDsKICB2YXIgTWF0aF9pbXVsPWdsb2JhbC5NYXRoLmltdWw7CiAgdmFyIE1hdGhfbWluPWdsb2JhbC5NYXRoLm1pbjsKICB2YXIgTWF0aF9tYXg9Z2xvYmFsLk1hdGgubWF4OwogIHZhciBNYXRoX2NsejMyPWdsb2JhbC5NYXRoLmNsejMyOwogIHZhciBNYXRoX2Zyb3VuZD1nbG9iYWwuTWF0aC5mcm91bmQ7CiAgdmFyIGFib3J0PWVudi5hYm9ydDsKICB2YXIgYXNzZXJ0PWVudi5hc3NlcnQ7CiAgdmFyIGVubGFyZ2VNZW1vcnk9ZW52LmVubGFyZ2VNZW1vcnk7CiAgdmFyIGdldFRvdGFsTWVtb3J5PWVudi5nZXRUb3RhbE1lbW9yeTsKICB2YXIgYWJvcnRPbkNhbm5vdEdyb3dNZW1vcnk9ZW52LmFib3J0T25DYW5ub3RHcm93TWVtb3J5OwogIHZhciBhYm9ydFN0YWNrT3ZlcmZsb3c9ZW52LmFib3J0U3RhY2tPdmVyZmxvdzsKICB2YXIgc2VnZmF1bHQ9ZW52LnNlZ2ZhdWx0OwogIHZhciBhbGlnbmZhdWx0PWVudi5hbGlnbmZhdWx0OwogIHZhciBmdGZhdWx0PWVudi5mdGZhdWx0OwogIHZhciBfX19hc3NlcnRfZmFpbD1lbnYuX19fYXNzZXJ0X2ZhaWw7CiAgdmFyIF9fX2Vycm5vX2xvY2F0aW9uPWVudi5fX19lcnJub19sb2NhdGlvbjsKICB2YXIgX19fc2V0RXJyTm89ZW52Ll9fX3NldEVyck5vOwogIHZhciBfZW1zY3JpcHRlbl9hc21fY29uc3RfaT1lbnYuX2Vtc2NyaXB0ZW5fYXNtX2NvbnN0X2k7CiAgdmFyIF9lbXNjcmlwdGVuX21lbWNweV9iaWc9ZW52Ll9lbXNjcmlwdGVuX21lbWNweV9iaWc7CiAgdmFyIF9sbHZtX3N0YWNrcmVzdG9yZT1lbnYuX2xsdm1fc3RhY2tyZXN0b3JlOwogIHZhciBfbGx2bV9zdGFja3NhdmU9ZW52Ll9sbHZtX3N0YWNrc2F2ZTsKICB2YXIgdGVtcEZsb2F0ID0gTWF0aF9mcm91bmQoMCk7CiAgY29uc3QgZjAgPSBNYXRoX2Zyb3VuZCgwKTsKCi8vIEVNU0NSSVBURU5fU1RBUlRfRlVOQ1MKCmZ1bmN0aW9uIF9tYWxsb2MoaTEpIHsKIGkxID0gaTEgfCAwOwogdmFyIGkyID0gMCwgaTMgPSAwLCBpNCA9IDAsIGk1ID0gMCwgaTYgPSAwLCBpNyA9IDAsIGk4ID0gMCwgaTkgPSAwLCBpMTAgPSAwLCBpMTEgPSAwLCBpMTIgPSAwLCBpMTMgPSAwLCBpMTQgPSAwOwogaTE0ID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgMTYgfCAwOwogaWYgKChTVEFDS1RPUCB8IDApID49IChTVEFDS19NQVggfCAwKSkgYWJvcnRTdGFja092ZXJmbG93KDE2KTsKIGRvIGlmIChpMSA+Pj4gMCA8IDI0NSkgewogIGkxMiA9IGkxID4+PiAwIDwgMTEgPyAxNiA6IGkxICsgMTEgJiAtODsKICBpMTAgPSBTQUZFX0hFQVBfTE9BRCg3MTYgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpZiAoaTEwID4+PiAoaTEyID4+PiAzKSAmIDMgfCAwKSB7CiAgIGkxID0gMjkwNCArICgoaTEwID4+PiAoaTEyID4+PiAzKSAmIDEgXiAxKSArIChpMTIgPj4+IDMpIDw8IDEgPDwgMikgfCAwOwogICBpMiA9IFNBRkVfSEVBUF9MT0FEKGkxICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgIGkzID0gU0FGRV9IRUFQX0xPQUQoaTIgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgaWYgKChpMyB8IDApID09IChpMSB8IDApKSBTQUZFX0hFQVBfU1RPUkUoNzE2ICogNCB8IDAsIGkxMCAmIH4oMSA8PCAoaTEwID4+PiAoaTEyID4+PiAzKSAmIDEgXiAxKSArIChpMTIgPj4+IDMpKSB8IDAsIDQpOyBlbHNlIHsKICAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDEyIHwgMCwgaTEgfCAwLCA0KTsKICAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDggfCAwLCBpMyB8IDAsIDQpOwogICB9CiAgIGkxMyA9IChpMTAgPj4+IChpMTIgPj4+IDMpICYgMSBeIDEpICsgKGkxMiA+Pj4gMykgPDwgMzsKICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgNCB8IDAsIGkxMyB8IDMgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgaTEzICsgNCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkyICsgaTEzICsgNCB8IDAsIDQsIDApIHwgMCB8IDEgfCAwLCA0KTsKICAgaTEzID0gaTIgKyA4IHwgMDsKICAgU1RBQ0tUT1AgPSBpMTQ7CiAgIHJldHVybiBpMTMgfCAwOwogIH0KICBpMTEgPSBTQUZFX0hFQVBfTE9BRCg3MTggKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpZiAoaTEyID4+PiAwID4gaTExID4+PiAwKSB7CiAgIGlmIChpMTAgPj4+IChpMTIgPj4+IDMpIHwgMCkgewogICAgaTEgPSBpMTAgPj4+IChpMTIgPj4+IDMpIDw8IChpMTIgPj4+IDMpICYgKDIgPDwgKGkxMiA+Pj4gMykgfCAwIC0gKDIgPDwgKGkxMiA+Pj4gMykpKTsKICAgIGk1ID0gKChpMSAmIDAgLSBpMSkgKyAtMSB8IDApID4+PiAoKChpMSAmIDAgLSBpMSkgKyAtMSB8IDApID4+PiAxMiAmIDE2KTsKICAgIGk0ID0gaTUgPj4+IChpNSA+Pj4gNSAmIDgpID4+PiAoaTUgPj4+IChpNSA+Pj4gNSAmIDgpID4+PiAyICYgNCk7CiAgICBpNCA9IChpNSA+Pj4gNSAmIDggfCAoKGkxICYgMCAtIGkxKSArIC0xIHwgMCkgPj4+IDEyICYgMTYgfCBpNSA+Pj4gKGk1ID4+PiA1ICYgOCkgPj4+IDIgJiA0IHwgaTQgPj4+IDEgJiAyIHwgaTQgPj4+IChpNCA+Pj4gMSAmIDIpID4+PiAxICYgMSkgKyAoaTQgPj4+IChpNCA+Pj4gMSAmIDIpID4+PiAoaTQgPj4+IChpNCA+Pj4gMSAmIDIpID4+PiAxICYgMSkpIHwgMDsKICAgIGk1ID0gU0FGRV9IRUFQX0xPQUQoMjkwNCArIChpNCA8PCAxIDw8IDIpICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGk1ICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpZiAoKGkxIHwgMCkgPT0gKDI5MDQgKyAoaTQgPDwgMSA8PCAyKSB8IDApKSB7CiAgICAgU0FGRV9IRUFQX1NUT1JFKDcxNiAqIDQgfCAwLCBpMTAgJiB+KDEgPDwgaTQpIHwgMCwgNCk7CiAgICAgaTEgPSBpMTAgJiB+KDEgPDwgaTQpOwogICAgfSBlbHNlIHsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgKyAxMiB8IDAsIDI5MDQgKyAoaTQgPDwgMSA8PCAyKSB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRSgyOTA0ICsgKGk0IDw8IDEgPDwgMikgKyA4IHwgMCwgaTEgfCAwLCA0KTsKICAgICBpMSA9IGkxMDsKICAgIH0KICAgIFNBRkVfSEVBUF9TVE9SRShpNSArIDQgfCAwLCBpMTIgfCAzIHwgMCwgNCk7CiAgICBTQUZFX0hFQVBfU1RPUkUoaTUgKyBpMTIgKyA0IHwgMCwgKGk0IDw8IDMpIC0gaTEyIHwgMSB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGk1ICsgKGk0IDw8IDMpIHwgMCwgKGk0IDw8IDMpIC0gaTEyIHwgMCwgNCk7CiAgICBpZiAoaTExIHwgMCkgewogICAgIGkzID0gU0FGRV9IRUFQX0xPQUQoNzIxICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgaWYgKCEoaTEgJiAxIDw8IChpMTEgPj4+IDMpKSkgewogICAgICBTQUZFX0hFQVBfU1RPUkUoNzE2ICogNCB8IDAsIGkxIHwgMSA8PCAoaTExID4+PiAzKSB8IDAsIDQpOwogICAgICBpMSA9IDI5MDQgKyAoaTExID4+PiAzIDw8IDEgPDwgMikgfCAwOwogICAgICBpMiA9IDI5MDQgKyAoaTExID4+PiAzIDw8IDEgPDwgMikgKyA4IHwgMDsKICAgICB9IGVsc2UgewogICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKDI5MDQgKyAoaTExID4+PiAzIDw8IDEgPDwgMikgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgaTIgPSAyOTA0ICsgKGkxMSA+Pj4gMyA8PCAxIDw8IDIpICsgOCB8IDA7CiAgICAgfQogICAgIFNBRkVfSEVBUF9TVE9SRShpMiB8IDAsIGkzIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGkxICsgMTIgfCAwLCBpMyB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDggfCAwLCBpMSB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDEyIHwgMCwgMjkwNCArIChpMTEgPj4+IDMgPDwgMSA8PCAyKSB8IDAsIDQpOwogICAgfQogICAgU0FGRV9IRUFQX1NUT1JFKDcxOCAqIDQgfCAwLCAoaTQgPDwgMykgLSBpMTIgfCAwLCA0KTsKICAgIFNBRkVfSEVBUF9TVE9SRSg3MjEgKiA0IHwgMCwgaTUgKyBpMTIgfCAwLCA0KTsKICAgIGkxMyA9IGk1ICsgOCB8IDA7CiAgICBTVEFDS1RPUCA9IGkxNDsKICAgIHJldHVybiBpMTMgfCAwOwogICB9CiAgIGk2ID0gU0FGRV9IRUFQX0xPQUQoNzE3ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgIGlmIChpNikgewogICAgaTIgPSAoKGk2ICYgMCAtIGk2KSArIC0xIHwgMCkgPj4+ICgoKGk2ICYgMCAtIGk2KSArIC0xIHwgMCkgPj4+IDEyICYgMTYpOwogICAgaTkgPSBpMiA+Pj4gKGkyID4+PiA1ICYgOCkgPj4+IChpMiA+Pj4gKGkyID4+PiA1ICYgOCkgPj4+IDIgJiA0KTsKICAgIGk5ID0gU0FGRV9IRUFQX0xPQUQoMzE2OCArICgoaTIgPj4+IDUgJiA4IHwgKChpNiAmIDAgLSBpNikgKyAtMSB8IDApID4+PiAxMiAmIDE2IHwgaTIgPj4+IChpMiA+Pj4gNSAmIDgpID4+PiAyICYgNCB8IGk5ID4+PiAxICYgMiB8IGk5ID4+PiAoaTkgPj4+IDEgJiAyKSA+Pj4gMSAmIDEpICsgKGk5ID4+PiAoaTkgPj4+IDEgJiAyKSA+Pj4gKGk5ID4+PiAoaTkgPj4+IDEgJiAyKSA+Pj4gMSAmIDEpKSA8PCAyKSB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpMiA9IGk5OwogICAgaTggPSBpOTsKICAgIGk5ID0gKChTQUZFX0hFQVBfTE9BRChpOSArIDQgfCAwLCA0LCAwKSB8IDApICYgLTgpIC0gaTEyIHwgMDsKICAgIHdoaWxlICgxKSB7CiAgICAgaTEgPSBTQUZFX0hFQVBfTE9BRChpMiArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICBpZiAoIWkxKSB7CiAgICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTIgKyAyMCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIGlmICghaTEpIGJyZWFrOwogICAgIH0KICAgICBpNyA9ICgoU0FGRV9IRUFQX0xPQUQoaTEgKyA0IHwgMCwgNCwgMCkgfCAwKSAmIC04KSAtIGkxMiB8IDA7CiAgICAgaTUgPSBpNyA+Pj4gMCA8IGk5ID4+PiAwOwogICAgIGkyID0gaTE7CiAgICAgaTggPSBpNSA/IGkxIDogaTg7CiAgICAgaTkgPSBpNSA/IGk3IDogaTk7CiAgICB9CiAgICBpNyA9IGk4ICsgaTEyIHwgMDsKICAgIGlmIChpNyA+Pj4gMCA+IGk4ID4+PiAwKSB7CiAgICAgaTUgPSBTQUZFX0hFQVBfTE9BRChpOCArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGk4ICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIGRvIGlmICgoaTEgfCAwKSA9PSAoaTggfCAwKSkgewogICAgICBpMiA9IGk4ICsgMjAgfCAwOwogICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkyIHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgaWYgKCFpMSkgewogICAgICAgaTIgPSBpOCArIDE2IHwgMDsKICAgICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICAgaWYgKCFpMSkgewogICAgICAgIGkyID0gMDsKICAgICAgICBicmVhazsKICAgICAgIH0KICAgICAgfQogICAgICB3aGlsZSAoMSkgewogICAgICAgaTQgPSBpMSArIDIwIHwgMDsKICAgICAgIGkzID0gU0FGRV9IRUFQX0xPQUQoaTQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICAgaWYgKCFpMykgewogICAgICAgIGk0ID0gaTEgKyAxNiB8IDA7CiAgICAgICAgaTMgPSBTQUZFX0hFQVBfTE9BRChpNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICAgaWYgKCFpMykgYnJlYWs7IGVsc2UgewogICAgICAgICBpMSA9IGkzOwogICAgICAgICBpMiA9IGk0OwogICAgICAgIH0KICAgICAgIH0gZWxzZSB7CiAgICAgICAgaTEgPSBpMzsKICAgICAgICBpMiA9IGk0OwogICAgICAgfQogICAgICB9CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpMiB8IDAsIDAgfCAwLCA0KTsKICAgICAgaTIgPSBpMTsKICAgICB9IGVsc2UgewogICAgICBpMiA9IFNBRkVfSEVBUF9MT0FEKGk4ICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpMiArIDEyIHwgMCwgaTEgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGkxICsgOCB8IDAsIGkyIHwgMCwgNCk7CiAgICAgIGkyID0gaTE7CiAgICAgfSB3aGlsZSAoMCk7CiAgICAgZG8gaWYgKGk1IHwgMCkgewogICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGk4ICsgMjggfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICBpZiAoKGk4IHwgMCkgPT0gKFNBRkVfSEVBUF9MT0FEKDMxNjggKyAoaTEgPDwgMikgfCAwLCA0LCAwKSB8IDAgfCAwKSkgewogICAgICAgU0FGRV9IRUFQX1NUT1JFKDMxNjggKyAoaTEgPDwgMikgfCAwLCBpMiB8IDAsIDQpOwogICAgICAgaWYgKCFpMikgewogICAgICAgIFNBRkVfSEVBUF9TVE9SRSg3MTcgKiA0IHwgMCwgaTYgJiB+KDEgPDwgaTEpIHwgMCwgNCk7CiAgICAgICAgYnJlYWs7CiAgICAgICB9CiAgICAgIH0gZWxzZSB7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoKChTQUZFX0hFQVBfTE9BRChpNSArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMCkgPT0gKGk4IHwgMCkgPyBpNSArIDE2IHwgMCA6IGk1ICsgMjAgfCAwKSB8IDAsIGkyIHwgMCwgNCk7CiAgICAgICBpZiAoIWkyKSBicmVhazsKICAgICAgfQogICAgICBTQUZFX0hFQVBfU1RPUkUoaTIgKyAyNCB8IDAsIGk1IHwgMCwgNCk7CiAgICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTggKyAxNiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIGlmIChpMSB8IDApIHsKICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMiArIDE2IHwgMCwgaTEgfCAwLCA0KTsKICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDI0IHwgMCwgaTIgfCAwLCA0KTsKICAgICAgfQogICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGk4ICsgMjAgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICBpZiAoaTEgfCAwKSB7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTIgKyAyMCB8IDAsIGkxIHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgKyAyNCB8IDAsIGkyIHwgMCwgNCk7CiAgICAgIH0KICAgICB9IHdoaWxlICgwKTsKICAgICBpZiAoaTkgPj4+IDAgPCAxNikgewogICAgICBpMTMgPSBpOSArIGkxMiB8IDA7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpOCArIDQgfCAwLCBpMTMgfCAzIHwgMCwgNCk7CiAgICAgIGkxMyA9IGk4ICsgaTEzICsgNCB8IDA7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpMTMgfCAwLCBTQUZFX0hFQVBfTE9BRChpMTMgfCAwLCA0LCAwKSB8IDAgfCAxIHwgMCwgNCk7CiAgICAgfSBlbHNlIHsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgNCB8IDAsIGkxMiB8IDMgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgNCB8IDAsIGk5IHwgMSB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyBpOSB8IDAsIGk5IHwgMCwgNCk7CiAgICAgIGlmIChpMTEgfCAwKSB7CiAgICAgICBpMyA9IFNBRkVfSEVBUF9MT0FEKDcyMSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICAgaWYgKCEoMSA8PCAoaTExID4+PiAzKSAmIGkxMCkpIHsKICAgICAgICBTQUZFX0hFQVBfU1RPUkUoNzE2ICogNCB8IDAsIDEgPDwgKGkxMSA+Pj4gMykgfCBpMTAgfCAwLCA0KTsKICAgICAgICBpMSA9IDI5MDQgKyAoaTExID4+PiAzIDw8IDEgPDwgMikgfCAwOwogICAgICAgIGkyID0gMjkwNCArIChpMTEgPj4+IDMgPDwgMSA8PCAyKSArIDggfCAwOwogICAgICAgfSBlbHNlIHsKICAgICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKDI5MDQgKyAoaTExID4+PiAzIDw8IDEgPDwgMikgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgICBpMiA9IDI5MDQgKyAoaTExID4+PiAzIDw8IDEgPDwgMikgKyA4IHwgMDsKICAgICAgIH0KICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMiB8IDAsIGkzIHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgKyAxMiB8IDAsIGkzIHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTMgKyA4IHwgMCwgaTEgfCAwLCA0KTsKICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDEyIHwgMCwgMjkwNCArIChpMTEgPj4+IDMgPDwgMSA8PCAyKSB8IDAsIDQpOwogICAgICB9CiAgICAgIFNBRkVfSEVBUF9TVE9SRSg3MTggKiA0IHwgMCwgaTkgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKDcyMSAqIDQgfCAwLCBpNyB8IDAsIDQpOwogICAgIH0KICAgICBpMTMgPSBpOCArIDggfCAwOwogICAgIFNUQUNLVE9QID0gaTE0OwogICAgIHJldHVybiBpMTMgfCAwOwogICAgfQogICB9CiAgfQogfSBlbHNlIGlmIChpMSA+Pj4gMCA+IDQyOTQ5NjcyMzEpIGkxMiA9IC0xOyBlbHNlIHsKICBpMTIgPSBpMSArIDExICYgLTg7CiAgaTkgPSBTQUZFX0hFQVBfTE9BRCg3MTcgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpZiAoaTkpIHsKICAgaWYgKCEoKGkxICsgMTEgfCAwKSA+Pj4gOCkpIGk3ID0gMDsgZWxzZSBpZiAoaTEyID4+PiAwID4gMTY3NzcyMTUpIGk3ID0gMzE7IGVsc2UgewogICAgaTcgPSAoaTEgKyAxMSB8IDApID4+PiA4IDw8ICgoKChpMSArIDExIHwgMCkgPj4+IDgpICsgMTA0ODMyMCB8IDApID4+PiAxNiAmIDgpOwogICAgaTcgPSAxNCAtICgoaTcgKyA1MjAxOTIgfCAwKSA+Pj4gMTYgJiA0IHwgKCgoaTEgKyAxMSB8IDApID4+PiA4KSArIDEwNDgzMjAgfCAwKSA+Pj4gMTYgJiA4IHwgKChpNyA8PCAoKGk3ICsgNTIwMTkyIHwgMCkgPj4+IDE2ICYgNCkpICsgMjQ1NzYwIHwgMCkgPj4+IDE2ICYgMikgKyAoaTcgPDwgKChpNyArIDUyMDE5MiB8IDApID4+PiAxNiAmIDQpIDw8ICgoKGk3IDw8ICgoaTcgKyA1MjAxOTIgfCAwKSA+Pj4gMTYgJiA0KSkgKyAyNDU3NjAgfCAwKSA+Pj4gMTYgJiAyKSA+Pj4gMTUpIHwgMDsKICAgIGk3ID0gaTEyID4+PiAoaTcgKyA3IHwgMCkgJiAxIHwgaTcgPDwgMTsKICAgfQogICBpMSA9IFNBRkVfSEVBUF9MT0FEKDMxNjggKyAoaTcgPDwgMikgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBMNzkgOiBkbyBpZiAoIWkxKSB7CiAgICBpMyA9IDA7CiAgICBpMSA9IDA7CiAgICBpMiA9IDAgLSBpMTIgfCAwOwogICAgaTEzID0gNjE7CiAgIH0gZWxzZSB7CiAgICBpNSA9IDA7CiAgICBpMiA9IDAgLSBpMTIgfCAwOwogICAgaTYgPSBpMTIgPDwgKChpNyB8IDApID09IDMxID8gMCA6IDI1IC0gKGk3ID4+PiAxKSB8IDApOwogICAgaTMgPSAwOwogICAgd2hpbGUgKDEpIHsKICAgICBpNCA9ICgoU0FGRV9IRUFQX0xPQUQoaTEgKyA0IHwgMCwgNCwgMCkgfCAwKSAmIC04KSAtIGkxMiB8IDA7CiAgICAgaWYgKGk0ID4+PiAwIDwgaTIgPj4+IDApIGlmICghaTQpIHsKICAgICAgaTQgPSBpMTsKICAgICAgaTIgPSAwOwogICAgICBpMyA9IGkxOwogICAgICBpMTMgPSA2NTsKICAgICAgYnJlYWsgTDc5OwogICAgIH0gZWxzZSB7CiAgICAgIGk1ID0gaTE7CiAgICAgIGkyID0gaTQ7CiAgICAgfQogICAgIGkxMyA9IFNBRkVfSEVBUF9MT0FEKGkxICsgMjAgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTEgKyAxNiArIChpNiA+Pj4gMzEgPDwgMikgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIGkzID0gKGkxMyB8IDApID09IDAgfCAoaTEzIHwgMCkgPT0gKGkxIHwgMCkgPyBpMyA6IGkxMzsKICAgICBpZiAoIWkxKSB7CiAgICAgIGkxID0gaTU7CiAgICAgIGkxMyA9IDYxOwogICAgICBicmVhazsKICAgICB9IGVsc2UgaTYgPSBpNiA8PCAxOwogICAgfQogICB9IHdoaWxlICgwKTsKICAgaWYgKChpMTMgfCAwKSA9PSA2MSkgewogICAgaWYgKChpMyB8IDApID09IDAgJiAoaTEgfCAwKSA9PSAwKSB7CiAgICAgaTEgPSAyIDw8IGk3OwogICAgIGlmICghKChpMSB8IDAgLSBpMSkgJiBpOSkpIGJyZWFrOwogICAgIGkxMCA9ICgoaTEgfCAwIC0gaTEpICYgaTkgJiAwIC0gKChpMSB8IDAgLSBpMSkgJiBpOSkpICsgLTEgfCAwOwogICAgIGkxMSA9IGkxMCA+Pj4gKGkxMCA+Pj4gMTIgJiAxNikgPj4+IChpMTAgPj4+IChpMTAgPj4+IDEyICYgMTYpID4+PiA1ICYgOCk7CiAgICAgaTMgPSBpMTEgPj4+IChpMTEgPj4+IDIgJiA0KSA+Pj4gKGkxMSA+Pj4gKGkxMSA+Pj4gMiAmIDQpID4+PiAxICYgMik7CiAgICAgaTEgPSAwOwogICAgIGkzID0gU0FGRV9IRUFQX0xPQUQoMzE2OCArICgoaTEwID4+PiAoaTEwID4+PiAxMiAmIDE2KSA+Pj4gNSAmIDggfCBpMTAgPj4+IDEyICYgMTYgfCBpMTEgPj4+IDIgJiA0IHwgaTExID4+PiAoaTExID4+PiAyICYgNCkgPj4+IDEgJiAyIHwgaTMgPj4+IDEgJiAxKSArIChpMyA+Pj4gKGkzID4+PiAxICYgMSkpIDw8IDIpIHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgIH0KICAgIGlmICghaTMpIHsKICAgICBpOCA9IGkxOwogICAgIGk2ID0gaTI7CiAgICB9IGVsc2UgewogICAgIGk0ID0gaTE7CiAgICAgaTEzID0gNjU7CiAgICB9CiAgIH0KICAgaWYgKChpMTMgfCAwKSA9PSA2NSkgd2hpbGUgKDEpIHsKICAgIGkxMSA9ICgoU0FGRV9IRUFQX0xPQUQoaTMgKyA0IHwgMCwgNCwgMCkgfCAwKSAmIC04KSAtIGkxMiB8IDA7CiAgICBpMSA9IGkxMSA+Pj4gMCA8IGkyID4+PiAwOwogICAgaTIgPSBpMSA/IGkxMSA6IGkyOwogICAgaTQgPSBpMSA/IGkzIDogaTQ7CiAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkzICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgaWYgKCFpMSkgaTEgPSBTQUZFX0hFQVBfTE9BRChpMyArIDIwIHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgIGlmICghaTEpIHsKICAgICBpOCA9IGk0OwogICAgIGk2ID0gaTI7CiAgICAgYnJlYWs7CiAgICB9IGVsc2UgaTMgPSBpMTsKICAgfQogICBpZiAoaTgpIGlmIChpNiA+Pj4gMCA8ICgoU0FGRV9IRUFQX0xPQUQoNzE4ICogNCB8IDAsIDQsIDApIHwgMCB8IDApIC0gaTEyIHwgMCkgPj4+IDApIHsKICAgIGk3ID0gaTggKyBpMTIgfCAwOwogICAgaWYgKGk3ID4+PiAwID4gaTggPj4+IDApIHsKICAgICBpNSA9IFNBRkVfSEVBUF9MT0FEKGk4ICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTggKyAxMiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgZG8gaWYgKChpMSB8IDApID09IChpOCB8IDApKSB7CiAgICAgIGkyID0gaTggKyAyMCB8IDA7CiAgICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICBpZiAoIWkxKSB7CiAgICAgICBpMiA9IGk4ICsgMTYgfCAwOwogICAgICAgaTEgPSBTQUZFX0hFQVBfTE9BRChpMiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICBpZiAoIWkxKSB7CiAgICAgICAgaTEgPSAwOwogICAgICAgIGJyZWFrOwogICAgICAgfQogICAgICB9CiAgICAgIHdoaWxlICgxKSB7CiAgICAgICBpNCA9IGkxICsgMjAgfCAwOwogICAgICAgaTMgPSBTQUZFX0hFQVBfTE9BRChpNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICBpZiAoIWkzKSB7CiAgICAgICAgaTQgPSBpMSArIDE2IHwgMDsKICAgICAgICBpMyA9IFNBRkVfSEVBUF9MT0FEKGk0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgICBpZiAoIWkzKSBicmVhazsgZWxzZSB7CiAgICAgICAgIGkxID0gaTM7CiAgICAgICAgIGkyID0gaTQ7CiAgICAgICAgfQogICAgICAgfSBlbHNlIHsKICAgICAgICBpMSA9IGkzOwogICAgICAgIGkyID0gaTQ7CiAgICAgICB9CiAgICAgIH0KICAgICAgU0FGRV9IRUFQX1NUT1JFKGkyIHwgMCwgMCB8IDAsIDQpOwogICAgIH0gZWxzZSB7CiAgICAgIGkxMyA9IFNBRkVfSEVBUF9MT0FEKGk4ICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpMTMgKyAxMiB8IDAsIGkxIHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDggfCAwLCBpMTMgfCAwLCA0KTsKICAgICB9IHdoaWxlICgwKTsKICAgICBkbyBpZiAoIWk1KSBpNCA9IGk5OyBlbHNlIHsKICAgICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpOCArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgaWYgKChpOCB8IDApID09IChTQUZFX0hFQVBfTE9BRCgzMTY4ICsgKGkyIDw8IDIpIHwgMCwgNCwgMCkgfCAwIHwgMCkpIHsKICAgICAgIFNBRkVfSEVBUF9TVE9SRSgzMTY4ICsgKGkyIDw8IDIpIHwgMCwgaTEgfCAwLCA0KTsKICAgICAgIGlmICghaTEpIHsKICAgICAgICBTQUZFX0hFQVBfU1RPUkUoNzE3ICogNCB8IDAsIGk5ICYgfigxIDw8IGkyKSB8IDAsIDQpOwogICAgICAgIGk0ID0gaTkgJiB+KDEgPDwgaTIpOwogICAgICAgIGJyZWFrOwogICAgICAgfQogICAgICB9IGVsc2UgewogICAgICAgU0FGRV9IRUFQX1NUT1JFKCgoU0FGRV9IRUFQX0xPQUQoaTUgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDApID09IChpOCB8IDApID8gaTUgKyAxNiB8IDAgOiBpNSArIDIwIHwgMCkgfCAwLCBpMSB8IDAsIDQpOwogICAgICAgaWYgKCFpMSkgewogICAgICAgIGk0ID0gaTk7CiAgICAgICAgYnJlYWs7CiAgICAgICB9CiAgICAgIH0KICAgICAgU0FGRV9IRUFQX1NUT1JFKGkxICsgMjQgfCAwLCBpNSB8IDAsIDQpOwogICAgICBpMiA9IFNBRkVfSEVBUF9MT0FEKGk4ICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICBpZiAoaTIgfCAwKSB7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgKyAxNiB8IDAsIGkyIHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTIgKyAyNCB8IDAsIGkxIHwgMCwgNCk7CiAgICAgIH0KICAgICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpOCArIDIwIHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgaWYgKCFpMikgaTQgPSBpOTsgZWxzZSB7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgKyAyMCB8IDAsIGkyIHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTIgKyAyNCB8IDAsIGkxIHwgMCwgNCk7CiAgICAgICBpNCA9IGk5OwogICAgICB9CiAgICAgfSB3aGlsZSAoMCk7CiAgICAgTDEyOCA6IGRvIGlmIChpNiA+Pj4gMCA8IDE2KSB7CiAgICAgIGkxMyA9IGk2ICsgaTEyIHwgMDsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgNCB8IDAsIGkxMyB8IDMgfCAwLCA0KTsKICAgICAgaTEzID0gaTggKyBpMTMgKyA0IHwgMDsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGkxMyB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxMyB8IDAsIDQsIDApIHwgMCB8IDEgfCAwLCA0KTsKICAgICB9IGVsc2UgewogICAgICBTQUZFX0hFQVBfU1RPUkUoaTggKyA0IHwgMCwgaTEyIHwgMyB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyA0IHwgMCwgaTYgfCAxIHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIGk2IHwgMCwgaTYgfCAwLCA0KTsKICAgICAgaTMgPSBpNiA+Pj4gMzsKICAgICAgaWYgKGk2ID4+PiAwIDwgMjU2KSB7CiAgICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKDcxNiAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICAgaWYgKCEoaTEgJiAxIDw8IGkzKSkgewogICAgICAgIFNBRkVfSEVBUF9TVE9SRSg3MTYgKiA0IHwgMCwgaTEgfCAxIDw8IGkzIHwgMCwgNCk7CiAgICAgICAgaTEgPSAyOTA0ICsgKGkzIDw8IDEgPDwgMikgfCAwOwogICAgICAgIGkyID0gMjkwNCArIChpMyA8PCAxIDw8IDIpICsgOCB8IDA7CiAgICAgICB9IGVsc2UgewogICAgICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoMjkwNCArIChpMyA8PCAxIDw8IDIpICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICAgaTIgPSAyOTA0ICsgKGkzIDw8IDEgPDwgMikgKyA4IHwgMDsKICAgICAgIH0KICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMiB8IDAsIGk3IHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgKyAxMiB8IDAsIGk3IHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyA4IHwgMCwgaTEgfCAwLCA0KTsKICAgICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDEyIHwgMCwgMjkwNCArIChpMyA8PCAxIDw8IDIpIHwgMCwgNCk7CiAgICAgICBicmVhazsKICAgICAgfQogICAgICBpMSA9IGk2ID4+PiA4OwogICAgICBpZiAoIWkxKSBpMyA9IDA7IGVsc2UgaWYgKGk2ID4+PiAwID4gMTY3NzcyMTUpIGkzID0gMzE7IGVsc2UgewogICAgICAgaTMgPSBpMSA8PCAoKGkxICsgMTA0ODMyMCB8IDApID4+PiAxNiAmIDgpIDw8ICgoKGkxIDw8ICgoaTEgKyAxMDQ4MzIwIHwgMCkgPj4+IDE2ICYgOCkpICsgNTIwMTkyIHwgMCkgPj4+IDE2ICYgNCk7CiAgICAgICBpMyA9IDE0IC0gKCgoaTEgPDwgKChpMSArIDEwNDgzMjAgfCAwKSA+Pj4gMTYgJiA4KSkgKyA1MjAxOTIgfCAwKSA+Pj4gMTYgJiA0IHwgKGkxICsgMTA0ODMyMCB8IDApID4+PiAxNiAmIDggfCAoaTMgKyAyNDU3NjAgfCAwKSA+Pj4gMTYgJiAyKSArIChpMyA8PCAoKGkzICsgMjQ1NzYwIHwgMCkgPj4+IDE2ICYgMikgPj4+IDE1KSB8IDA7CiAgICAgICBpMyA9IGk2ID4+PiAoaTMgKyA3IHwgMCkgJiAxIHwgaTMgPDwgMTsKICAgICAgfQogICAgICBpMSA9IDMxNjggKyAoaTMgPDwgMikgfCAwOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAyOCB8IDAsIGkzIHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDE2ICsgNCB8IDAsIDAgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgMTYgfCAwLCAwIHwgMCwgNCk7CiAgICAgIGkyID0gMSA8PCBpMzsKICAgICAgaWYgKCEoaTQgJiBpMikpIHsKICAgICAgIFNBRkVfSEVBUF9TVE9SRSg3MTcgKiA0IHwgMCwgaTQgfCBpMiB8IDAsIDQpOwogICAgICAgU0FGRV9IRUFQX1NUT1JFKGkxIHwgMCwgaTcgfCAwLCA0KTsKICAgICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDI0IHwgMCwgaTEgfCAwLCA0KTsKICAgICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDEyIHwgMCwgaTcgfCAwLCA0KTsKICAgICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDggfCAwLCBpNyB8IDAsIDQpOwogICAgICAgYnJlYWs7CiAgICAgIH0KICAgICAgaTEgPSBTQUZFX0hFQVBfTE9BRChpMSB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIEwxNDUgOiBkbyBpZiAoKChTQUZFX0hFQVBfTE9BRChpMSArIDQgfCAwLCA0LCAwKSB8IDApICYgLTggfCAwKSAhPSAoaTYgfCAwKSkgewogICAgICAgaTQgPSBpNiA8PCAoKGkzIHwgMCkgPT0gMzEgPyAwIDogMjUgLSAoaTMgPj4+IDEpIHwgMCk7CiAgICAgICB3aGlsZSAoMSkgewogICAgICAgIGkzID0gaTEgKyAxNiArIChpNCA+Pj4gMzEgPDwgMikgfCAwOwogICAgICAgIGkyID0gU0FGRV9IRUFQX0xPQUQoaTMgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICAgIGlmICghaTIpIGJyZWFrOwogICAgICAgIGlmICgoKFNBRkVfSEVBUF9MT0FEKGkyICsgNCB8IDAsIDQsIDApIHwgMCkgJiAtOCB8IDApID09IChpNiB8IDApKSB7CiAgICAgICAgIGkxID0gaTI7CiAgICAgICAgIGJyZWFrIEwxNDU7CiAgICAgICAgfSBlbHNlIHsKICAgICAgICAgaTQgPSBpNCA8PCAxOwogICAgICAgICBpMSA9IGkyOwogICAgICAgIH0KICAgICAgIH0KICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMyB8IDAsIGk3IHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAyNCB8IDAsIGkxIHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAxMiB8IDAsIGk3IHwgMCwgNCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyA4IHwgMCwgaTcgfCAwLCA0KTsKICAgICAgIGJyZWFrIEwxMjg7CiAgICAgIH0gd2hpbGUgKDApOwogICAgICBpMTIgPSBpMSArIDggfCAwOwogICAgICBpMTMgPSBTQUZFX0hFQVBfTE9BRChpMTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTEzICsgMTIgfCAwLCBpNyB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTEyIHwgMCwgaTcgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgOCB8IDAsIGkxMyB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAxMiB8IDAsIGkxIHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDI0IHwgMCwgMCB8IDAsIDQpOwogICAgIH0gd2hpbGUgKDApOwogICAgIGkxMyA9IGk4ICsgOCB8IDA7CiAgICAgU1RBQ0tUT1AgPSBpMTQ7CiAgICAgcmV0dXJuIGkxMyB8IDA7CiAgICB9CiAgIH0KICB9CiB9IHdoaWxlICgwKTsKIGkzID0gU0FGRV9IRUFQX0xPQUQoNzE4ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpZiAoaTMgPj4+IDAgPj0gaTEyID4+PiAwKSB7CiAgaTEgPSBpMyAtIGkxMiB8IDA7CiAgaTIgPSBTQUZFX0hFQVBfTE9BRCg3MjEgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpZiAoaTEgPj4+IDAgPiAxNSkgewogICBpMTMgPSBpMiArIGkxMiB8IDA7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MjEgKiA0IHwgMCwgaTEzIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MTggKiA0IHwgMCwgaTEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkxMyArIDQgfCAwLCBpMSB8IDEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgaTMgfCAwLCBpMSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTIgKyA0IHwgMCwgaTEyIHwgMyB8IDAsIDQpOwogIH0gZWxzZSB7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MTggKiA0IHwgMCwgMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzIxICogNCB8IDAsIDAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgNCB8IDAsIGkzIHwgMyB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTIgKyBpMyArIDQgfCAwLCBTQUZFX0hFQVBfTE9BRChpMiArIGkzICsgNCB8IDAsIDQsIDApIHwgMCB8IDEgfCAwLCA0KTsKICB9CiAgaTEzID0gaTIgKyA4IHwgMDsKICBTVEFDS1RPUCA9IGkxNDsKICByZXR1cm4gaTEzIHwgMDsKIH0KIGk1ID0gU0FGRV9IRUFQX0xPQUQoNzE5ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpZiAoaTUgPj4+IDAgPiBpMTIgPj4+IDApIHsKICBpMTEgPSBpNSAtIGkxMiB8IDA7CiAgU0FGRV9IRUFQX1NUT1JFKDcxOSAqIDQgfCAwLCBpMTEgfCAwLCA0KTsKICBpMTMgPSBTQUZFX0hFQVBfTE9BRCg3MjIgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpMTAgPSBpMTMgKyBpMTIgfCAwOwogIFNBRkVfSEVBUF9TVE9SRSg3MjIgKiA0IHwgMCwgaTEwIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxMCArIDQgfCAwLCBpMTEgfCAxIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxMyArIDQgfCAwLCBpMTIgfCAzIHwgMCwgNCk7CiAgaTEzID0gaTEzICsgOCB8IDA7CiAgU1RBQ0tUT1AgPSBpMTQ7CiAgcmV0dXJuIGkxMyB8IDA7CiB9CiBpZiAoIShTQUZFX0hFQVBfTE9BRCg4MzQgKiA0IHwgMCwgNCwgMCkgfCAwKSkgewogIFNBRkVfSEVBUF9TVE9SRSg4MzYgKiA0IHwgMCwgNDA5NiB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRSg4MzUgKiA0IHwgMCwgNDA5NiB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRSg4MzcgKiA0IHwgMCwgLTEgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoODM4ICogNCB8IDAsIC0xIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKDgzOSAqIDQgfCAwLCAwIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKDgyNyAqIDQgfCAwLCAwIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKDgzNCAqIDQgfCAwLCBpMTQgJiAtMTYgXiAxNDMxNjU1NzY4IHwgMCwgNCk7CiAgaTEgPSA0MDk2OwogfSBlbHNlIGkxID0gU0FGRV9IRUFQX0xPQUQoODM2ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpNiA9IGkxMiArIDQ4IHwgMDsKIGk3ID0gaTEyICsgNDcgfCAwOwogaTkgPSBpMSArIGk3IHwgMDsKIGk4ID0gMCAtIGkxIHwgMDsKIGlmICgoaTkgJiBpOCkgPj4+IDAgPD0gaTEyID4+PiAwKSB7CiAgaTEzID0gMDsKICBTVEFDS1RPUCA9IGkxNDsKICByZXR1cm4gaTEzIHwgMDsKIH0KIGkxID0gU0FGRV9IRUFQX0xPQUQoODI2ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpZiAoaTEgfCAwKSB7CiAgaTExID0gU0FGRV9IRUFQX0xPQUQoODI0ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgaWYgKChpMTEgKyAoaTkgJiBpOCkgfCAwKSA+Pj4gMCA8PSBpMTEgPj4+IDAgPyAxIDogKGkxMSArIChpOSAmIGk4KSB8IDApID4+PiAwID4gaTEgPj4+IDApIHsKICAgaTEzID0gMDsKICAgU1RBQ0tUT1AgPSBpMTQ7CiAgIHJldHVybiBpMTMgfCAwOwogIH0KIH0KIEwxNzggOiBkbyBpZiAoISgoU0FGRV9IRUFQX0xPQUQoODI3ICogNCB8IDAsIDQsIDApIHwgMCkgJiA0KSkgewogIGkzID0gU0FGRV9IRUFQX0xPQUQoNzIyICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgTDE4MCA6IGRvIGlmICghaTMpIGkxMyA9IDEyODsgZWxzZSB7CiAgIGkxID0gMzMxMjsKICAgd2hpbGUgKDEpIHsKICAgIGkyID0gU0FGRV9IRUFQX0xPQUQoaTEgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgaWYgKGkyID4+PiAwIDw9IGkzID4+PiAwKSBpZiAoKGkyICsgKFNBRkVfSEVBUF9MT0FEKGkxICsgNCB8IDAsIDQsIDApIHwgMCB8IDApIHwgMCkgPj4+IDAgPiBpMyA+Pj4gMCkgYnJlYWs7CiAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkxICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpZiAoIWkxKSB7CiAgICAgaTEzID0gMTI4OwogICAgIGJyZWFrIEwxODA7CiAgICB9CiAgIH0KICAgaWYgKChpOSAtIGk1ICYgaTgpID4+PiAwIDwgMjE0NzQ4MzY0NykgewogICAgaTQgPSBfc2JyayhpOSAtIGk1ICYgaTggfCAwKSB8IDA7CiAgICBpZiAoKGk0IHwgMCkgPT0gKChTQUZFX0hFQVBfTE9BRChpMSB8IDAsIDQsIDApIHwgMCB8IDApICsgKFNBRkVfSEVBUF9MT0FEKGkxICsgNCB8IDAsIDQsIDApIHwgMCB8IDApIHwgMCkpIGlmICgoaTQgfCAwKSA9PSAoLTEgfCAwKSkgaTEgPSBpOSAtIGk1ICYgaTg7IGVsc2UgewogICAgIGk2ID0gaTkgLSBpNSAmIGk4OwogICAgIGkxMyA9IDE0NTsKICAgICBicmVhayBMMTc4OwogICAgfSBlbHNlIHsKICAgICBpMyA9IGk5IC0gaTUgJiBpODsKICAgICBpMTMgPSAxMzY7CiAgICB9CiAgIH0gZWxzZSBpMSA9IDA7CiAgfSB3aGlsZSAoMCk7CiAgZG8gaWYgKChpMTMgfCAwKSA9PSAxMjgpIHsKICAgaTUgPSBfc2JyaygwKSB8IDA7CiAgIGlmICgoaTUgfCAwKSA9PSAoLTEgfCAwKSkgaTEgPSAwOyBlbHNlIHsKICAgIGkzID0gU0FGRV9IRUFQX0xPQUQoODM1ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpMyA9ICgoaTMgKyAtMSAmIGk1IHwgMCkgPT0gMCA/IDAgOiAoaTMgKyAtMSArIGk1ICYgMCAtIGkzKSAtIGk1IHwgMCkgKyAoaTkgJiBpOCkgfCAwOwogICAgaTEgPSBTQUZFX0hFQVBfTE9BRCg4MjQgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgIGlmIChpMyA+Pj4gMCA+IGkxMiA+Pj4gMCAmIGkzID4+PiAwIDwgMjE0NzQ4MzY0NykgewogICAgIGkyID0gU0FGRV9IRUFQX0xPQUQoODI2ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgaWYgKGkyIHwgMCkgaWYgKChpMyArIGkxIHwgMCkgPj4+IDAgPD0gaTEgPj4+IDAgfCAoaTMgKyBpMSB8IDApID4+PiAwID4gaTIgPj4+IDApIHsKICAgICAgaTEgPSAwOwogICAgICBicmVhazsKICAgICB9CiAgICAgaTQgPSBfc2JyayhpMyB8IDApIHwgMDsKICAgICBpZiAoKGk0IHwgMCkgPT0gKGk1IHwgMCkpIHsKICAgICAgaTYgPSBpMzsKICAgICAgaTQgPSBpNTsKICAgICAgaTEzID0gMTQ1OwogICAgICBicmVhayBMMTc4OwogICAgIH0gZWxzZSBpMTMgPSAxMzY7CiAgICB9IGVsc2UgaTEgPSAwOwogICB9CiAgfSB3aGlsZSAoMCk7CiAgZG8gaWYgKChpMTMgfCAwKSA9PSAxMzYpIHsKICAgaTIgPSAwIC0gaTMgfCAwOwogICBpZiAoIShpNiA+Pj4gMCA+IGkzID4+PiAwICYgKGkzID4+PiAwIDwgMjE0NzQ4MzY0NyAmIChpNCB8IDApICE9ICgtMSB8IDApKSkpIGlmICgoaTQgfCAwKSA9PSAoLTEgfCAwKSkgewogICAgaTEgPSAwOwogICAgYnJlYWs7CiAgIH0gZWxzZSB7CiAgICBpNiA9IGkzOwogICAgaTEzID0gMTQ1OwogICAgYnJlYWsgTDE3ODsKICAgfQogICBpMSA9IFNBRkVfSEVBUF9MT0FEKDgzNiAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBpMSA9IGk3IC0gaTMgKyBpMSAmIDAgLSBpMTsKICAgaWYgKGkxID4+PiAwID49IDIxNDc0ODM2NDcpIHsKICAgIGk2ID0gaTM7CiAgICBpMTMgPSAxNDU7CiAgICBicmVhayBMMTc4OwogICB9CiAgIGlmICgoX3NicmsoaTEgfCAwKSB8IDApID09ICgtMSB8IDApKSB7CiAgICBfc2JyayhpMiB8IDApIHwgMDsKICAgIGkxID0gMDsKICAgIGJyZWFrOwogICB9IGVsc2UgewogICAgaTYgPSBpMSArIGkzIHwgMDsKICAgIGkxMyA9IDE0NTsKICAgIGJyZWFrIEwxNzg7CiAgIH0KICB9IHdoaWxlICgwKTsKICBTQUZFX0hFQVBfU1RPUkUoODI3ICogNCB8IDAsIFNBRkVfSEVBUF9MT0FEKDgyNyAqIDQgfCAwLCA0LCAwKSB8IDAgfCA0IHwgMCwgNCk7CiAgaTEzID0gMTQzOwogfSBlbHNlIHsKICBpMSA9IDA7CiAgaTEzID0gMTQzOwogfSB3aGlsZSAoMCk7CiBpZiAoKGkxMyB8IDApID09IDE0MykgaWYgKChpOSAmIGk4KSA+Pj4gMCA8IDIxNDc0ODM2NDcpIHsKICBpNCA9IF9zYnJrKGk5ICYgaTggfCAwKSB8IDA7CiAgaTIgPSBfc2JyaygwKSB8IDA7CiAgaTMgPSAoaTIgLSBpNCB8IDApID4+PiAwID4gKGkxMiArIDQwIHwgMCkgPj4+IDA7CiAgaWYgKCEoKGk0IHwgMCkgPT0gKC0xIHwgMCkgfCBpMyBeIDEgfCBpNCA+Pj4gMCA8IGkyID4+PiAwICYgKChpNCB8IDApICE9ICgtMSB8IDApICYgKGkyIHwgMCkgIT0gKC0xIHwgMCkpIF4gMSkpIHsKICAgaTYgPSBpMyA/IGkyIC0gaTQgfCAwIDogaTE7CiAgIGkxMyA9IDE0NTsKICB9CiB9CiBpZiAoKGkxMyB8IDApID09IDE0NSkgewogIGkxID0gKFNBRkVfSEVBUF9MT0FEKDgyNCAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSArIGk2IHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoODI0ICogNCB8IDAsIGkxIHwgMCwgNCk7CiAgaWYgKGkxID4+PiAwID4gKFNBRkVfSEVBUF9MT0FEKDgyNSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMCkgU0FGRV9IRUFQX1NUT1JFKDgyNSAqIDQgfCAwLCBpMSB8IDAsIDQpOwogIGk3ID0gU0FGRV9IRUFQX0xPQUQoNzIyICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgTDIxNSA6IGRvIGlmICghaTcpIHsKICAgaTEzID0gU0FGRV9IRUFQX0xPQUQoNzIwICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgIGlmICgoaTEzIHwgMCkgPT0gMCB8IGk0ID4+PiAwIDwgaTEzID4+PiAwKSBTQUZFX0hFQVBfU1RPUkUoNzIwICogNCB8IDAsIGk0IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg4MjggKiA0IHwgMCwgaTQgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDgyOSAqIDQgfCAwLCBpNiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoODMxICogNCB8IDAsIDAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDcyNSAqIDQgfCAwLCBTQUZFX0hFQVBfTE9BRCg4MzQgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MjQgKiA0IHwgMCwgLTEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDcyOSAqIDQgfCAwLCAyOTA0IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MjggKiA0IHwgMCwgMjkwNCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzMxICogNCB8IDAsIDI5MTIgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDczMCAqIDQgfCAwLCAyOTEyIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MzMgKiA0IHwgMCwgMjkyMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzMyICogNCB8IDAsIDI5MjAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDczNSAqIDQgfCAwLCAyOTI4IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MzQgKiA0IHwgMCwgMjkyOCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzM3ICogNCB8IDAsIDI5MzYgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDczNiAqIDQgfCAwLCAyOTM2IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MzkgKiA0IHwgMCwgMjk0NCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzM4ICogNCB8IDAsIDI5NDQgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc0MSAqIDQgfCAwLCAyOTUyIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NDAgKiA0IHwgMCwgMjk1MiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzQzICogNCB8IDAsIDI5NjAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc0MiAqIDQgfCAwLCAyOTYwIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NDUgKiA0IHwgMCwgMjk2OCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzQ0ICogNCB8IDAsIDI5NjggfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc0NyAqIDQgfCAwLCAyOTc2IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NDYgKiA0IHwgMCwgMjk3NiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzQ5ICogNCB8IDAsIDI5ODQgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc0OCAqIDQgfCAwLCAyOTg0IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NTEgKiA0IHwgMCwgMjk5MiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzUwICogNCB8IDAsIDI5OTIgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc1MyAqIDQgfCAwLCAzZTMgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc1MiAqIDQgfCAwLCAzZTMgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc1NSAqIDQgfCAwLCAzMDA4IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NTQgKiA0IHwgMCwgMzAwOCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzU3ICogNCB8IDAsIDMwMTYgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc1NiAqIDQgfCAwLCAzMDE2IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NTkgKiA0IHwgMCwgMzAyNCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzU4ICogNCB8IDAsIDMwMjQgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc2MSAqIDQgfCAwLCAzMDMyIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NjAgKiA0IHwgMCwgMzAzMiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzYzICogNCB8IDAsIDMwNDAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc2MiAqIDQgfCAwLCAzMDQwIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NjUgKiA0IHwgMCwgMzA0OCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzY0ICogNCB8IDAsIDMwNDggfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc2NyAqIDQgfCAwLCAzMDU2IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NjYgKiA0IHwgMCwgMzA1NiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzY5ICogNCB8IDAsIDMwNjQgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc2OCAqIDQgfCAwLCAzMDY0IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NzEgKiA0IHwgMCwgMzA3MiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzcwICogNCB8IDAsIDMwNzIgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc3MyAqIDQgfCAwLCAzMDgwIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NzIgKiA0IHwgMCwgMzA4MCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzc1ICogNCB8IDAsIDMwODggfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc3NCAqIDQgfCAwLCAzMDg4IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NzcgKiA0IHwgMCwgMzA5NiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzc2ICogNCB8IDAsIDMwOTYgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc3OSAqIDQgfCAwLCAzMTA0IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3NzggKiA0IHwgMCwgMzEwNCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzgxICogNCB8IDAsIDMxMTIgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc4MCAqIDQgfCAwLCAzMTEyIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3ODMgKiA0IHwgMCwgMzEyMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzgyICogNCB8IDAsIDMxMjAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc4NSAqIDQgfCAwLCAzMTI4IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3ODQgKiA0IHwgMCwgMzEyOCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzg3ICogNCB8IDAsIDMxMzYgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc4NiAqIDQgfCAwLCAzMTM2IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3ODkgKiA0IHwgMCwgMzE0NCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzg4ICogNCB8IDAsIDMxNDQgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDc5MSAqIDQgfCAwLCAzMTUyIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3OTAgKiA0IHwgMCwgMzE1MiB8IDAsIDQpOwogICBpMTMgPSBpNiArIC00MCB8IDA7CiAgIGkxMSA9IGk0ICsgOCB8IDA7CiAgIGkxMSA9IChpMTEgJiA3IHwgMCkgPT0gMCA/IDAgOiAwIC0gaTExICYgNzsKICAgaTEwID0gaTQgKyBpMTEgfCAwOwogICBTQUZFX0hFQVBfU1RPUkUoNzIyICogNCB8IDAsIGkxMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzE5ICogNCB8IDAsIGkxMyAtIGkxMSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTEwICsgNCB8IDAsIGkxMyAtIGkxMSB8IDEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGk0ICsgaTEzICsgNCB8IDAsIDQwIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MjMgKiA0IHwgMCwgU0FGRV9IRUFQX0xPQUQoODM4ICogNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQpOwogIH0gZWxzZSB7CiAgIGkxID0gMzMxMjsKICAgZG8gewogICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpMSB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpMyA9IFNBRkVfSEVBUF9MT0FEKGkxICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpZiAoKGk0IHwgMCkgPT0gKGkyICsgaTMgfCAwKSkgewogICAgIGkxMyA9IDE1NDsKICAgICBicmVhazsKICAgIH0KICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTEgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgfSB3aGlsZSAoKGkxIHwgMCkgIT0gMCk7CiAgIGlmICgoaTEzIHwgMCkgPT0gMTU0KSB7CiAgICBpNSA9IGkxICsgNCB8IDA7CiAgICBpZiAoISgoU0FGRV9IRUFQX0xPQUQoaTEgKyAxMiB8IDAsIDQsIDApIHwgMCkgJiA4KSkgaWYgKGk0ID4+PiAwID4gaTcgPj4+IDAgJiBpMiA+Pj4gMCA8PSBpNyA+Pj4gMCkgewogICAgIFNBRkVfSEVBUF9TVE9SRShpNSB8IDAsIGkzICsgaTYgfCAwLCA0KTsKICAgICBpMTMgPSAoU0FGRV9IRUFQX0xPQUQoNzE5ICogNCB8IDAsIDQsIDApIHwgMCB8IDApICsgaTYgfCAwOwogICAgIGkxMSA9IChpNyArIDggJiA3IHwgMCkgPT0gMCA/IDAgOiAwIC0gKGk3ICsgOCkgJiA3OwogICAgIFNBRkVfSEVBUF9TVE9SRSg3MjIgKiA0IHwgMCwgaTcgKyBpMTEgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoNzE5ICogNCB8IDAsIGkxMyAtIGkxMSB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIGkxMSArIDQgfCAwLCBpMTMgLSBpMTEgfCAxIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgaTEzICsgNCB8IDAsIDQwIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKDcyMyAqIDQgfCAwLCBTQUZFX0hFQVBfTE9BRCg4MzggKiA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiAgICAgYnJlYWs7CiAgICB9CiAgIH0KICAgaWYgKGk0ID4+PiAwIDwgKFNBRkVfSEVBUF9MT0FEKDcyMCAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMCkgU0FGRV9IRUFQX1NUT1JFKDcyMCAqIDQgfCAwLCBpNCB8IDAsIDQpOwogICBpMiA9IGk0ICsgaTYgfCAwOwogICBpMSA9IDMzMTI7CiAgIGRvIHsKICAgIGlmICgoU0FGRV9IRUFQX0xPQUQoaTEgfCAwLCA0LCAwKSB8IDAgfCAwKSA9PSAoaTIgfCAwKSkgewogICAgIGkxMyA9IDE2MjsKICAgICBicmVhazsKICAgIH0KICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTEgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgfSB3aGlsZSAoKGkxIHwgMCkgIT0gMCk7CiAgIGlmICgoaTEzIHwgMCkgPT0gMTYyKSBpZiAoISgoU0FGRV9IRUFQX0xPQUQoaTEgKyAxMiB8IDAsIDQsIDApIHwgMCkgJiA4KSkgewogICAgU0FGRV9IRUFQX1NUT1JFKGkxIHwgMCwgaTQgfCAwLCA0KTsKICAgIGkxMCA9IGkxICsgNCB8IDA7CiAgICBTQUZFX0hFQVBfU1RPUkUoaTEwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkxMCB8IDAsIDQsIDApIHwgMCB8IDApICsgaTYgfCAwLCA0KTsKICAgIGkxMCA9IGk0ICsgOCB8IDA7CiAgICBpMTAgPSBpNCArICgoaTEwICYgNyB8IDApID09IDAgPyAwIDogMCAtIGkxMCAmIDcpIHwgMDsKICAgIGkxID0gaTIgKyAoKGkyICsgOCAmIDcgfCAwKSA9PSAwID8gMCA6IDAgLSAoaTIgKyA4KSAmIDcpIHwgMDsKICAgIGk5ID0gaTEwICsgaTEyIHwgMDsKICAgIGk4ID0gaTEgLSBpMTAgLSBpMTIgfCAwOwogICAgU0FGRV9IRUFQX1NUT1JFKGkxMCArIDQgfCAwLCBpMTIgfCAzIHwgMCwgNCk7CiAgICBMMjM4IDogZG8gaWYgKChpNyB8IDApID09IChpMSB8IDApKSB7CiAgICAgaTEzID0gKFNBRkVfSEVBUF9MT0FEKDcxOSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSArIGk4IHwgMDsKICAgICBTQUZFX0hFQVBfU1RPUkUoNzE5ICogNCB8IDAsIGkxMyB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRSg3MjIgKiA0IHwgMCwgaTkgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyA0IHwgMCwgaTEzIHwgMSB8IDAsIDQpOwogICAgfSBlbHNlIHsKICAgICBpZiAoKFNBRkVfSEVBUF9MT0FEKDcyMSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSA9PSAoaTEgfCAwKSkgewogICAgICBpMTMgPSAoU0FGRV9IRUFQX0xPQUQoNzE4ICogNCB8IDAsIDQsIDApIHwgMCB8IDApICsgaTggfCAwOwogICAgICBTQUZFX0hFQVBfU1RPUkUoNzE4ICogNCB8IDAsIGkxMyB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoNzIxICogNCB8IDAsIGk5IHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpOSArIDQgfCAwLCBpMTMgfCAxIHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpOSArIGkxMyB8IDAsIGkxMyB8IDAsIDQpOwogICAgICBicmVhazsKICAgICB9CiAgICAgaTcgPSBTQUZFX0hFQVBfTE9BRChpMSArIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIGlmICgoaTcgJiAzIHwgMCkgPT0gMSkgewogICAgICBMMjQ2IDogZG8gaWYgKGk3ID4+PiAwIDwgMjU2KSB7CiAgICAgICBpMiA9IFNBRkVfSEVBUF9MT0FEKGkxICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICBpMyA9IFNBRkVfSEVBUF9MT0FEKGkxICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICAgaWYgKChpMyB8IDApID09IChpMiB8IDApKSB7CiAgICAgICAgU0FGRV9IRUFQX1NUT1JFKDcxNiAqIDQgfCAwLCAoU0FGRV9IRUFQX0xPQUQoNzE2ICogNCB8IDAsIDQsIDApIHwgMCkgJiB+KDEgPDwgKGk3ID4+PiAzKSkgfCAwLCA0KTsKICAgICAgICBicmVhazsKICAgICAgIH0gZWxzZSB7CiAgICAgICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgMTIgfCAwLCBpMyB8IDAsIDQpOwogICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDggfCAwLCBpMiB8IDAsIDQpOwogICAgICAgIGJyZWFrOwogICAgICAgfQogICAgICB9IGVsc2UgewogICAgICAgaTYgPSBTQUZFX0hFQVBfTE9BRChpMSArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgIGkyID0gU0FGRV9IRUFQX0xPQUQoaTEgKyAxMiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICBkbyBpZiAoKGkyIHwgMCkgPT0gKGkxIHwgMCkpIHsKICAgICAgICBpMiA9IFNBRkVfSEVBUF9MT0FEKGkxICsgMTYgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgICBpZiAoIWkyKSB7CiAgICAgICAgIGkyID0gU0FGRV9IRUFQX0xPQUQoaTEgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICAgIGlmICghaTIpIHsKICAgICAgICAgIGkyID0gMDsKICAgICAgICAgIGJyZWFrOwogICAgICAgICB9IGVsc2UgaTMgPSBpMSArIDE2IHwgMDsKICAgICAgICB9IGVsc2UgaTMgPSBpMSArIDE2ICsgNCB8IDA7CiAgICAgICAgd2hpbGUgKDEpIHsKICAgICAgICAgaTUgPSBpMiArIDIwIHwgMDsKICAgICAgICAgaTQgPSBTQUZFX0hFQVBfTE9BRChpNSB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICAgIGlmICghaTQpIHsKICAgICAgICAgIGk1ID0gaTIgKyAxNiB8IDA7CiAgICAgICAgICBpNCA9IFNBRkVfSEVBUF9MT0FEKGk1IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgICAgIGlmICghaTQpIGJyZWFrOyBlbHNlIHsKICAgICAgICAgICBpMiA9IGk0OwogICAgICAgICAgIGkzID0gaTU7CiAgICAgICAgICB9CiAgICAgICAgIH0gZWxzZSB7CiAgICAgICAgICBpMiA9IGk0OwogICAgICAgICAgaTMgPSBpNTsKICAgICAgICAgfQogICAgICAgIH0KICAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTMgfCAwLCAwIHwgMCwgNCk7CiAgICAgICB9IGVsc2UgewogICAgICAgIGkxMyA9IFNBRkVfSEVBUF9MT0FEKGkxICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICAgU0FGRV9IRUFQX1NUT1JFKGkxMyArIDEyIHwgMCwgaTIgfCAwLCA0KTsKICAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTIgKyA4IHwgMCwgaTEzIHwgMCwgNCk7CiAgICAgICB9IHdoaWxlICgwKTsKICAgICAgIGlmICghaTYpIGJyZWFrOwogICAgICAgaTMgPSBTQUZFX0hFQVBfTE9BRChpMSArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgIGRvIGlmICgoU0FGRV9IRUFQX0xPQUQoMzE2OCArIChpMyA8PCAyKSB8IDAsIDQsIDApIHwgMCB8IDApID09IChpMSB8IDApKSB7CiAgICAgICAgU0FGRV9IRUFQX1NUT1JFKDMxNjggKyAoaTMgPDwgMikgfCAwLCBpMiB8IDAsIDQpOwogICAgICAgIGlmIChpMiB8IDApIGJyZWFrOwogICAgICAgIFNBRkVfSEVBUF9TVE9SRSg3MTcgKiA0IHwgMCwgKFNBRkVfSEVBUF9MT0FEKDcxNyAqIDQgfCAwLCA0LCAwKSB8IDApICYgfigxIDw8IGkzKSB8IDAsIDQpOwogICAgICAgIGJyZWFrIEwyNDY7CiAgICAgICB9IGVsc2UgewogICAgICAgIFNBRkVfSEVBUF9TVE9SRSgoKFNBRkVfSEVBUF9MT0FEKGk2ICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwKSA9PSAoaTEgfCAwKSA/IGk2ICsgMTYgfCAwIDogaTYgKyAyMCB8IDApIHwgMCwgaTIgfCAwLCA0KTsKICAgICAgICBpZiAoIWkyKSBicmVhayBMMjQ2OwogICAgICAgfSB3aGlsZSAoMCk7CiAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTIgKyAyNCB8IDAsIGk2IHwgMCwgNCk7CiAgICAgICBpMyA9IFNBRkVfSEVBUF9MT0FEKGkxICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgICAgaWYgKGkzIHwgMCkgewogICAgICAgIFNBRkVfSEVBUF9TVE9SRShpMiArIDE2IHwgMCwgaTMgfCAwLCA0KTsKICAgICAgICBTQUZFX0hFQVBfU1RPUkUoaTMgKyAyNCB8IDAsIGkyIHwgMCwgNCk7CiAgICAgICB9CiAgICAgICBpMyA9IFNBRkVfSEVBUF9MT0FEKGkxICsgMTYgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgIGlmICghaTMpIGJyZWFrOwogICAgICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgMjAgfCAwLCBpMyB8IDAsIDQpOwogICAgICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgMjQgfCAwLCBpMiB8IDAsIDQpOwogICAgICB9IHdoaWxlICgwKTsKICAgICAgaTEgPSBpMSArIChpNyAmIC04KSB8IDA7CiAgICAgIGk1ID0gKGk3ICYgLTgpICsgaTggfCAwOwogICAgIH0gZWxzZSBpNSA9IGk4OwogICAgIGkzID0gaTEgKyA0IHwgMDsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTMgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgfCAwLCA0LCAwKSB8IDApICYgLTIgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyA0IHwgMCwgaTUgfCAxIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgaTUgfCAwLCBpNSB8IDAsIDQpOwogICAgIGkzID0gaTUgPj4+IDM7CiAgICAgaWYgKGk1ID4+PiAwIDwgMjU2KSB7CiAgICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoNzE2ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIGlmICghKGkxICYgMSA8PCBpMykpIHsKICAgICAgIFNBRkVfSEVBUF9TVE9SRSg3MTYgKiA0IHwgMCwgaTEgfCAxIDw8IGkzIHwgMCwgNCk7CiAgICAgICBpMSA9IDI5MDQgKyAoaTMgPDwgMSA8PCAyKSB8IDA7CiAgICAgICBpMiA9IDI5MDQgKyAoaTMgPDwgMSA8PCAyKSArIDggfCAwOwogICAgICB9IGVsc2UgewogICAgICAgaTEgPSBTQUZFX0hFQVBfTE9BRCgyOTA0ICsgKGkzIDw8IDEgPDwgMikgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICAgIGkyID0gMjkwNCArIChpMyA8PCAxIDw8IDIpICsgOCB8IDA7CiAgICAgIH0KICAgICAgU0FGRV9IRUFQX1NUT1JFKGkyIHwgMCwgaTkgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGkxICsgMTIgfCAwLCBpOSB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyA4IHwgMCwgaTEgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgMTIgfCAwLCAyOTA0ICsgKGkzIDw8IDEgPDwgMikgfCAwLCA0KTsKICAgICAgYnJlYWs7CiAgICAgfQogICAgIGkxID0gaTUgPj4+IDg7CiAgICAgZG8gaWYgKCFpMSkgaTQgPSAwOyBlbHNlIHsKICAgICAgaWYgKGk1ID4+PiAwID4gMTY3NzcyMTUpIHsKICAgICAgIGk0ID0gMzE7CiAgICAgICBicmVhazsKICAgICAgfQogICAgICBpNCA9IGkxIDw8ICgoaTEgKyAxMDQ4MzIwIHwgMCkgPj4+IDE2ICYgOCkgPDwgKCgoaTEgPDwgKChpMSArIDEwNDgzMjAgfCAwKSA+Pj4gMTYgJiA4KSkgKyA1MjAxOTIgfCAwKSA+Pj4gMTYgJiA0KTsKICAgICAgaTQgPSAxNCAtICgoKGkxIDw8ICgoaTEgKyAxMDQ4MzIwIHwgMCkgPj4+IDE2ICYgOCkpICsgNTIwMTkyIHwgMCkgPj4+IDE2ICYgNCB8IChpMSArIDEwNDgzMjAgfCAwKSA+Pj4gMTYgJiA4IHwgKGk0ICsgMjQ1NzYwIHwgMCkgPj4+IDE2ICYgMikgKyAoaTQgPDwgKChpNCArIDI0NTc2MCB8IDApID4+PiAxNiAmIDIpID4+PiAxNSkgfCAwOwogICAgICBpNCA9IGk1ID4+PiAoaTQgKyA3IHwgMCkgJiAxIHwgaTQgPDwgMTsKICAgICB9IHdoaWxlICgwKTsKICAgICBpMSA9IDMxNjggKyAoaTQgPDwgMikgfCAwOwogICAgIFNBRkVfSEVBUF9TVE9SRShpOSArIDI4IHwgMCwgaTQgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyAxNiArIDQgfCAwLCAwIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgMTYgfCAwLCAwIHwgMCwgNCk7CiAgICAgaTIgPSBTQUZFX0hFQVBfTE9BRCg3MTcgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICBpMyA9IDEgPDwgaTQ7CiAgICAgaWYgKCEoaTIgJiBpMykpIHsKICAgICAgU0FGRV9IRUFQX1NUT1JFKDcxNyAqIDQgfCAwLCBpMiB8IGkzIHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpMSB8IDAsIGk5IHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpOSArIDI0IHwgMCwgaTEgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgMTIgfCAwLCBpOSB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyA4IHwgMCwgaTkgfCAwLCA0KTsKICAgICAgYnJlYWs7CiAgICAgfQogICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTEgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIEwyOTEgOiBkbyBpZiAoKChTQUZFX0hFQVBfTE9BRChpMSArIDQgfCAwLCA0LCAwKSB8IDApICYgLTggfCAwKSAhPSAoaTUgfCAwKSkgewogICAgICBpNCA9IGk1IDw8ICgoaTQgfCAwKSA9PSAzMSA/IDAgOiAyNSAtIChpNCA+Pj4gMSkgfCAwKTsKICAgICAgd2hpbGUgKDEpIHsKICAgICAgIGkzID0gaTEgKyAxNiArIChpNCA+Pj4gMzEgPDwgMikgfCAwOwogICAgICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpMyB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgICBpZiAoIWkyKSBicmVhazsKICAgICAgIGlmICgoKFNBRkVfSEVBUF9MT0FEKGkyICsgNCB8IDAsIDQsIDApIHwgMCkgJiAtOCB8IDApID09IChpNSB8IDApKSB7CiAgICAgICAgaTEgPSBpMjsKICAgICAgICBicmVhayBMMjkxOwogICAgICAgfSBlbHNlIHsKICAgICAgICBpNCA9IGk0IDw8IDE7CiAgICAgICAgaTEgPSBpMjsKICAgICAgIH0KICAgICAgfQogICAgICBTQUZFX0hFQVBfU1RPUkUoaTMgfCAwLCBpOSB8IDAsIDQpOwogICAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyAyNCB8IDAsIGkxIHwgMCwgNCk7CiAgICAgIFNBRkVfSEVBUF9TVE9SRShpOSArIDEyIHwgMCwgaTkgfCAwLCA0KTsKICAgICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgOCB8IDAsIGk5IHwgMCwgNCk7CiAgICAgIGJyZWFrIEwyMzg7CiAgICAgfSB3aGlsZSAoMCk7CiAgICAgaTEyID0gaTEgKyA4IHwgMDsKICAgICBpMTMgPSBTQUZFX0hFQVBfTE9BRChpMTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIFNBRkVfSEVBUF9TVE9SRShpMTMgKyAxMiB8IDAsIGk5IHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGkxMiB8IDAsIGk5IHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgOCB8IDAsIGkxMyB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRShpOSArIDEyIHwgMCwgaTEgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyAyNCB8IDAsIDAgfCAwLCA0KTsKICAgIH0gd2hpbGUgKDApOwogICAgaTEzID0gaTEwICsgOCB8IDA7CiAgICBTVEFDS1RPUCA9IGkxNDsKICAgIHJldHVybiBpMTMgfCAwOwogICB9CiAgIGkyID0gMzMxMjsKICAgd2hpbGUgKDEpIHsKICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgaWYgKGkxID4+PiAwIDw9IGk3ID4+PiAwKSB7CiAgICAgaTMgPSBpMSArIChTQUZFX0hFQVBfTE9BRChpMiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSB8IDA7CiAgICAgaWYgKGkzID4+PiAwID4gaTcgPj4+IDApIGJyZWFrOwogICAgfQogICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpMiArIDggfCAwLCA0LCAwKSB8IDAgfCAwOwogICB9CiAgIGk1ID0gaTMgKyAtNDcgKyAoKGkzICsgLTQ3ICsgOCAmIDcgfCAwKSA9PSAwID8gMCA6IDAgLSAoaTMgKyAtNDcgKyA4KSAmIDcpIHwgMDsKICAgaTUgPSBpNSA+Pj4gMCA8IChpNyArIDE2IHwgMCkgPj4+IDAgPyBpNyA6IGk1OwogICBpMSA9IGk2ICsgLTQwIHwgMDsKICAgaTEzID0gaTQgKyA4IHwgMDsKICAgaTEzID0gKGkxMyAmIDcgfCAwKSA9PSAwID8gMCA6IDAgLSBpMTMgJiA3OwogICBpMTEgPSBpNCArIGkxMyB8IDA7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MjIgKiA0IHwgMCwgaTExIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MTkgKiA0IHwgMCwgaTEgLSBpMTMgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkxMSArIDQgfCAwLCBpMSAtIGkxMyB8IDEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGk0ICsgaTEgKyA0IHwgMCwgNDAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDcyMyAqIDQgfCAwLCBTQUZFX0hFQVBfTE9BRCg4MzggKiA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpNSArIDQgfCAwLCAyNyB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTUgKyA4IHwgMCwgU0FGRV9IRUFQX0xPQUQoODI4ICogNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTUgKyA4ICsgNCB8IDAsIFNBRkVfSEVBUF9MT0FEKDgyOSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGk1ICsgOCArIDggfCAwLCBTQUZFX0hFQVBfTE9BRCg4MzAgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpNSArIDggKyAxMiB8IDAsIFNBRkVfSEVBUF9MT0FEKDgzMSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDgyOCAqIDQgfCAwLCBpNCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoODI5ICogNCB8IDAsIGk2IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRSg4MzEgKiA0IHwgMCwgMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoODMwICogNCB8IDAsIGk1ICsgOCB8IDAsIDQpOwogICBpMSA9IGk1ICsgMjQgfCAwOwogICBkbyB7CiAgICBpMTMgPSBpMTsKICAgIGkxID0gaTEgKyA0IHwgMDsKICAgIFNBRkVfSEVBUF9TVE9SRShpMSB8IDAsIDcgfCAwLCA0KTsKICAgfSB3aGlsZSAoKGkxMyArIDggfCAwKSA+Pj4gMCA8IGkzID4+PiAwKTsKICAgaWYgKChpNSB8IDApICE9IChpNyB8IDApKSB7CiAgICBTQUZFX0hFQVBfU1RPUkUoaTUgKyA0IHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk1ICsgNCB8IDAsIDQsIDApIHwgMCkgJiAtMiB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgNCB8IDAsIGk1IC0gaTcgfCAxIHwgMCwgNCk7CiAgICBTQUZFX0hFQVBfU1RPUkUoaTUgfCAwLCBpNSAtIGk3IHwgMCwgNCk7CiAgICBpZiAoKGk1IC0gaTcgfCAwKSA+Pj4gMCA8IDI1NikgewogICAgIGkzID0gMjkwNCArICgoaTUgLSBpNyB8IDApID4+PiAzIDw8IDEgPDwgMikgfCAwOwogICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoNzE2ICogNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgaWYgKCEoaTEgJiAxIDw8ICgoaTUgLSBpNyB8IDApID4+PiAzKSkpIHsKICAgICAgU0FGRV9IRUFQX1NUT1JFKDcxNiAqIDQgfCAwLCBpMSB8IDEgPDwgKChpNSAtIGk3IHwgMCkgPj4+IDMpIHwgMCwgNCk7CiAgICAgIGkxID0gaTM7CiAgICAgIGkyID0gaTMgKyA4IHwgMDsKICAgICB9IGVsc2UgewogICAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkzICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIGkyID0gaTMgKyA4IHwgMDsKICAgICB9CiAgICAgU0FGRV9IRUFQX1NUT1JFKGkyIHwgMCwgaTcgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgKyAxMiB8IDAsIGk3IHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgOCB8IDAsIGkxIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgMTIgfCAwLCBpMyB8IDAsIDQpOwogICAgIGJyZWFrOwogICAgfQogICAgaWYgKCEoKGk1IC0gaTcgfCAwKSA+Pj4gOCkpIGk0ID0gMDsgZWxzZSBpZiAoKGk1IC0gaTcgfCAwKSA+Pj4gMCA+IDE2Nzc3MjE1KSBpNCA9IDMxOyBlbHNlIHsKICAgICBpNCA9IChpNSAtIGk3IHwgMCkgPj4+IDggPDwgKCgoKGk1IC0gaTcgfCAwKSA+Pj4gOCkgKyAxMDQ4MzIwIHwgMCkgPj4+IDE2ICYgOCk7CiAgICAgaTQgPSAxNCAtICgoaTQgKyA1MjAxOTIgfCAwKSA+Pj4gMTYgJiA0IHwgKCgoaTUgLSBpNyB8IDApID4+PiA4KSArIDEwNDgzMjAgfCAwKSA+Pj4gMTYgJiA4IHwgKChpNCA8PCAoKGk0ICsgNTIwMTkyIHwgMCkgPj4+IDE2ICYgNCkpICsgMjQ1NzYwIHwgMCkgPj4+IDE2ICYgMikgKyAoaTQgPDwgKChpNCArIDUyMDE5MiB8IDApID4+PiAxNiAmIDQpIDw8ICgoKGk0IDw8ICgoaTQgKyA1MjAxOTIgfCAwKSA+Pj4gMTYgJiA0KSkgKyAyNDU3NjAgfCAwKSA+Pj4gMTYgJiAyKSA+Pj4gMTUpIHwgMDsKICAgICBpNCA9IChpNSAtIGk3IHwgMCkgPj4+IChpNCArIDcgfCAwKSAmIDEgfCBpNCA8PCAxOwogICAgfQogICAgaTEgPSAzMTY4ICsgKGk0IDw8IDIpIHwgMDsKICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDI4IHwgMCwgaTQgfCAwLCA0KTsKICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDIwIHwgMCwgMCB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgMTYgfCAwLCAwIHwgMCwgNCk7CiAgICBpMiA9IFNBRkVfSEVBUF9MT0FEKDcxNyAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgaTMgPSAxIDw8IGk0OwogICAgaWYgKCEoaTIgJiBpMykpIHsKICAgICBTQUZFX0hFQVBfU1RPUkUoNzE3ICogNCB8IDAsIGkyIHwgaTMgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTEgfCAwLCBpNyB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDI0IHwgMCwgaTEgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAxMiB8IDAsIGk3IHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgOCB8IDAsIGk3IHwgMCwgNCk7CiAgICAgYnJlYWs7CiAgICB9CiAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkxIHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgIEwzMjUgOiBkbyBpZiAoKChTQUZFX0hFQVBfTE9BRChpMSArIDQgfCAwLCA0LCAwKSB8IDApICYgLTggfCAwKSAhPSAoaTUgLSBpNyB8IDApKSB7CiAgICAgaTQgPSBpNSAtIGk3IDw8ICgoaTQgfCAwKSA9PSAzMSA/IDAgOiAyNSAtIChpNCA+Pj4gMSkgfCAwKTsKICAgICB3aGlsZSAoMSkgewogICAgICBpMyA9IGkxICsgMTYgKyAoaTQgPj4+IDMxIDw8IDIpIHwgMDsKICAgICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpMyB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIGlmICghaTIpIGJyZWFrOwogICAgICBpZiAoKChTQUZFX0hFQVBfTE9BRChpMiArIDQgfCAwLCA0LCAwKSB8IDApICYgLTggfCAwKSA9PSAoaTUgLSBpNyB8IDApKSB7CiAgICAgICBpMSA9IGkyOwogICAgICAgYnJlYWsgTDMyNTsKICAgICAgfSBlbHNlIHsKICAgICAgIGk0ID0gaTQgPDwgMTsKICAgICAgIGkxID0gaTI7CiAgICAgIH0KICAgICB9CiAgICAgU0FGRV9IRUFQX1NUT1JFKGkzIHwgMCwgaTcgfCAwLCA0KTsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAyNCB8IDAsIGkxIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgMTIgfCAwLCBpNyB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRShpNyArIDggfCAwLCBpNyB8IDAsIDQpOwogICAgIGJyZWFrIEwyMTU7CiAgICB9IHdoaWxlICgwKTsKICAgIGkxMSA9IGkxICsgOCB8IDA7CiAgICBpMTMgPSBTQUZFX0hFQVBfTE9BRChpMTEgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgU0FGRV9IRUFQX1NUT1JFKGkxMyArIDEyIHwgMCwgaTcgfCAwLCA0KTsKICAgIFNBRkVfSEVBUF9TVE9SRShpMTEgfCAwLCBpNyB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgOCB8IDAsIGkxMyB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgMTIgfCAwLCBpMSB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgMjQgfCAwLCAwIHwgMCwgNCk7CiAgIH0KICB9IHdoaWxlICgwKTsKICBpMSA9IFNBRkVfSEVBUF9MT0FEKDcxOSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogIGlmIChpMSA+Pj4gMCA+IGkxMiA+Pj4gMCkgewogICBpMTEgPSBpMSAtIGkxMiB8IDA7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MTkgKiA0IHwgMCwgaTExIHwgMCwgNCk7CiAgIGkxMyA9IFNBRkVfSEVBUF9MT0FEKDcyMiAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBpMTAgPSBpMTMgKyBpMTIgfCAwOwogICBTQUZFX0hFQVBfU1RPUkUoNzIyICogNCB8IDAsIGkxMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTEwICsgNCB8IDAsIGkxMSB8IDEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkxMyArIDQgfCAwLCBpMTIgfCAzIHwgMCwgNCk7CiAgIGkxMyA9IGkxMyArIDggfCAwOwogICBTVEFDS1RPUCA9IGkxNDsKICAgcmV0dXJuIGkxMyB8IDA7CiAgfQogfQogU0FGRV9IRUFQX1NUT1JFKF9fX2Vycm5vX2xvY2F0aW9uKCkgfCAwIHwgMCwgMTIgfCAwLCA0KTsKIGkxMyA9IDA7CiBTVEFDS1RPUCA9IGkxNDsKIHJldHVybiBpMTMgfCAwOwp9CgpmdW5jdGlvbiBfYmxha2U1MTJfY29tcHJlc3MoaTM1LCBpMSkgewogaTM1ID0gaTM1IHwgMDsKIGkxID0gaTEgfCAwOwogdmFyIGkyID0gMCwgaTMgPSAwLCBpNCA9IDAsIGk1ID0gMCwgaTYgPSAwLCBpNyA9IDAsIGk4ID0gMCwgaTkgPSAwLCBpMTAgPSAwLCBpMTEgPSAwLCBpMTIgPSAwLCBpMTMgPSAwLCBpMTQgPSAwLCBpMTUgPSAwLCBpMTYgPSAwLCBpMTcgPSAwLCBpMTggPSAwLCBpMTkgPSAwLCBpMjAgPSAwLCBpMjEgPSAwLCBpMjIgPSAwLCBpMjMgPSAwLCBpMjQgPSAwLCBpMjUgPSAwLCBpMjYgPSAwLCBpMjcgPSAwLCBpMjggPSAwLCBpMjkgPSAwLCBpMzAgPSAwLCBpMzEgPSAwLCBpMzIgPSAwLCBpMzMgPSAwLCBpMzQgPSAwLCBpMzYgPSAwLCBpMzcgPSAwLCBpMzggPSAwLCBpMzkgPSAwLCBpNDAgPSAwLCBpNDEgPSAwLCBpNDIgPSAwLCBpNDMgPSAwLCBpNDQgPSAwLCBpNDUgPSAwLCBpNDYgPSAwLCBpNDcgPSAwLCBpNDggPSAwLCBpNDkgPSAwLCBpNTAgPSAwLCBpNTEgPSAwLCBpNTIgPSAwLCBpNTMgPSAwLCBpNTQgPSAwLCBpNTUgPSAwLCBpNTYgPSAwLCBpNTcgPSAwLCBpNTggPSAwLCBpNTkgPSAwLCBpNjAgPSAwLCBpNjEgPSAwLCBpNjIgPSAwLCBpNjMgPSAwLCBpNjQgPSAwLCBpNjUgPSAwLCBpNjYgPSAwLCBpNjcgPSAwLCBpNjggPSAwLCBpNjkgPSAwLCBpNzAgPSAwLCBpNzEgPSAwLCBpNzIgPSAwLCBpNzMgPSAwLCBpNzQgPSAwLCBpNzUgPSAwLCBpNzYgPSAwLCBpNzcgPSAwLCBpNzggPSAwLCBpNzkgPSAwLCBpODAgPSAwOwogaTM2ID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgMjU2IHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdygyNTYpOwogaTIgPSAwOwogaTMgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoIShpMiA+Pj4gMCA8IDAgfCAoaTIgfCAwKSA9PSAwICYgaTMgPj4+IDAgPCAxNikpIGJyZWFrOwogIGkzMiA9IGkxICsgKGkzIDw8IDMpIHwgMDsKICBpMzQgPSAoU0FGRV9IRUFQX0xPQUQoaTMyICsgMSA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkgPDwgMTYgfCAoU0FGRV9IRUFQX0xPQUQoaTMyID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSA8PCAyNCB8IChTQUZFX0hFQVBfTE9BRChpMzIgKyAyID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSA8PCA4IHwgKFNBRkVfSEVBUF9MT0FEKGkzMiArIDMgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApOwogIGkzMyA9IGkzNiArIChpMyA8PCAzKSB8IDA7CiAgU0FGRV9IRUFQX1NUT1JFKGkzMyB8IDAsIChTQUZFX0hFQVBfTE9BRChpMzIgKyA0ICsgMSA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkgPDwgMTYgfCAoU0FGRV9IRUFQX0xPQUQoaTMyICsgNCA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkgPDwgMjQgfCAoU0FGRV9IRUFQX0xPQUQoaTMyICsgNCArIDIgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTMyICsgNCArIDMgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkzMyArIDQgfCAwLCBpMzQgfCAwLCA0KTsKICBpMzQgPSBfaTY0QWRkKGkzIHwgMCwgaTIgfCAwLCAxLCAwKSB8IDA7CiAgaTIgPSB0ZW1wUmV0MDsKICBpMyA9IGkzNDsKIH0KIGkxID0gMDsKIGkyID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKCEoaTEgPj4+IDAgPCAwIHwgKGkxIHwgMCkgPT0gMCAmIGkyID4+PiAwIDwgOCkpIGJyZWFrOwogIGkzMiA9IGkzNSArIChpMiA8PCAzKSB8IDA7CiAgaTM0ID0gU0FGRV9IRUFQX0xPQUQoaTMyICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgaTMzID0gaTM2ICsgMTI4ICsgKGkyIDw8IDMpIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTMzIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTMyIHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkzMyArIDQgfCAwLCBpMzQgfCAwLCA0KTsKICBpMzQgPSBfaTY0QWRkKGkyIHwgMCwgaTEgfCAwLCAxLCAwKSB8IDA7CiAgaTEgPSB0ZW1wUmV0MDsKICBpMiA9IGkzNDsKIH0KIGkzID0gKFNBRkVfSEVBUF9MT0FEKGkzNSArIDY0IHwgMCwgNCwgMCkgfCAwKSBeIC0yMDUyOTEyOTQxOwogaTQgPSAoU0FGRV9IRUFQX0xPQUQoaTM1ICsgNjQgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIDYwODEzNTgxNjsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA2NCB8IDAsIGkzIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgNjQgKyA0IHwgMCwgaTQgfCAwLCA0KTsKIGk3ID0gKFNBRkVfSEVBUF9MT0FEKGkzNSArIDcyIHwgMCwgNCwgMCkgfCAwKSBeIDU3NzAxMTg4OwogaTggPSAoU0FGRV9IRUFQX0xPQUQoaTM1ICsgNzIgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIDMyMDQ0MDg3ODsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA3MiB8IDAsIGk3IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgNzIgKyA0IHwgMCwgaTggfCAwLCA0KTsKIGkxOSA9IChTQUZFX0hFQVBfTE9BRChpMzUgKyA4MCB8IDAsIDQsIDApIHwgMCkgXiA2OTgyOTg4MzI7CiBpMTQgPSAoU0FGRV9IRUFQX0xPQUQoaTM1ICsgODAgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIC0xNTQyODk5Njc4OwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDgwIHwgMCwgaTE5IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgODAgKyA0IHwgMCwgaTE0IHwgMCwgNCk7CiBpMTAgPSAoU0FGRV9IRUFQX0xPQUQoaTM1ICsgODggfCAwLCA0LCAwKSB8IDApIF4gLTMzMDQwNDcyNzsKIGk5ID0gKFNBRkVfSEVBUF9MT0FEKGkzNSArIDg4ICsgNCB8IDAsIDQsIDApIHwgMCkgXiAxMzcyOTY1MzY7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgODggfCAwLCBpMTAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA4OCArIDQgfCAwLCBpOSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDk2IHwgMCwgOTUzMTYwNTY3IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgOTYgKyA0IHwgMCwgMTE2MDI1ODAyMiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDEwNCB8IDAsIDg4NzY4ODMwMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDEwNCArIDQgfCAwLCAtMTEwMTc2NDkxMyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDExMiB8IDAsIC05MTQ1OTk3MTUgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyAxMTIgKyA0IHwgMCwgLTEwNjI0NTg5NTMgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyAxMjAgfCAwLCAtMTI1MzYzNTgxNyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDEyMCArIDQgfCAwLCAxMDY1NjcwMDY5IHwgMCwgNCk7CiBpZiAoIShTQUZFX0hFQVBfTE9BRChpMzUgKyAxMTYgfCAwLCA0LCAwKSB8IDApKSB7CiAgaTEgPSBTQUZFX0hFQVBfTE9BRChpMzUgKyA5NiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgaTIgPSBTQUZFX0hFQVBfTE9BRChpMzUgKyA5NiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA5NiB8IDAsIGkxIF4gOTUzMTYwNTY3IHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDk2ICsgNCB8IDAsIGkyIF4gMTE2MDI1ODAyMiB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyAxMDQgfCAwLCBpMSBeIDg4NzY4ODMwMCB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyAxMDQgKyA0IHwgMCwgaTIgXiAtMTEwMTc2NDkxMyB8IDAsIDQpOwogIGkxMyA9IFNBRkVfSEVBUF9MT0FEKGkzNSArIDEwNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgaTE1ID0gU0FGRV9IRUFQX0xPQUQoaTM1ICsgMTA0ICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDExMiB8IDAsIGkxMyBeIC05MTQ1OTk3MTUgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgMTEyICsgNCB8IDAsIGkxNSBeIC0xMDYyNDU4OTUzIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDEyMCB8IDAsIGkxMyBeIC0xMjUzNjM1ODE3IHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDEyMCArIDQgfCAwLCBpMTUgXiAxMDY1NjcwMDY5IHwgMCwgNCk7CiAgaTEyID0gaTEzIF4gLTEyNTM2MzU4MTc7CiAgaTExID0gaTE1IF4gMTA2NTY3MDA2OTsKICBpMTMgPSBpMTMgXiAtOTE0NTk5NzE1OwogIGkxNSA9IGkxNSBeIC0xMDYyNDU4OTUzOwogIGk1ID0gaTEgXiA4ODc2ODgzMDA7CiAgaTYgPSBpMiBeIC0xMTAxNzY0OTEzOwogIGkxID0gaTEgXiA5NTMxNjA1Njc7CiAgaTIgPSBpMiBeIDExNjAyNTgwMjI7CiB9IGVsc2UgewogIGkxMiA9IC0xMjUzNjM1ODE3OwogIGkxMSA9IDEwNjU2NzAwNjk7CiAgaTEzID0gLTkxNDU5OTcxNTsKICBpMTUgPSAtMTA2MjQ1ODk1MzsKICBpNSA9IDg4NzY4ODMwMDsKICBpNiA9IC0xMTAxNzY0OTEzOwogIGkxID0gOTUzMTYwNTY3OwogIGkyID0gMTE2MDI1ODAyMjsKIH0KIGkyOSA9IDA7CiBpMzAgPSAwOwogaTMxID0gU0FGRV9IRUFQX0xPQUQoaTM2ICsgMTI4ICsgMzIgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTMyID0gU0FGRV9IRUFQX0xPQUQoaTM2ICsgMTI4ICsgMzIgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkzMyA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMzQgPSBTQUZFX0hFQVBfTE9BRChpMzYgKyAxMjggKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkyNSA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCArIDQwIHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkyNiA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCArIDQwICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMjcgPSBTQUZFX0hFQVBfTE9BRChpMzYgKyAxMjggKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkyOCA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCArIDggKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkyMSA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCArIDQ4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkyMiA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCArIDQ4ICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMjMgPSBTQUZFX0hFQVBfTE9BRChpMzYgKyAxMjggKyAxNiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMjQgPSBTQUZFX0hFQVBfTE9BRChpMzYgKyAxMjggKyAxNiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTIwID0gaTE1OwogaTE1ID0gU0FGRV9IRUFQX0xPQUQoaTM2ICsgMTI4ICsgNTYgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTE2ID0gU0FGRV9IRUFQX0xPQUQoaTM2ICsgMTI4ICsgNTYgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNyA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxOCA9IFNBRkVfSEVBUF9MT0FEKGkzNiArIDEyOCArIDI0ICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiB3aGlsZSAoMSkgewogIGlmICghKGkyOSA+Pj4gMCA8IDAgfCAoaTI5IHwgMCkgPT0gMCAmIGkzMCA+Pj4gMCA8IDE2KSkgYnJlYWs7CiAgaTUyID0gU0FGRV9IRUFQX0xPQUQoMjM0NiArIChpMzAgPDwgNCkgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTY1ID0gU0FGRV9IRUFQX0xPQUQoMjM0NiArIChpMzAgPDwgNCkgKyAxID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGk3OSA9IF9pNjRBZGQoKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTY1IDw8IDMpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTUyIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSB8IDAsIChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk2NSA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNTIgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSB8IDAsIGkzMSB8IDAsIGkzMiB8IDApIHwgMDsKICBpNzkgPSBfaTY0QWRkKGk3OSB8IDAsIHRlbXBSZXQwIHwgMCwgaTMzIHwgMCwgaTM0IHwgMCkgfCAwOwogIGk1NiA9IHRlbXBSZXQwOwogIGk3MCA9IGkxIF4gaTc5OwogIGk0OSA9IGkyIF4gaTU2OwogIGk2NyA9IF9pNjRBZGQoaTQ5IHwgMCwgaTcwIHwgMCwgaTMgfCAwLCBpNCB8IDApIHwgMDsKICBpNjggPSB0ZW1wUmV0MDsKICBpNjMgPSBpNjcgXiBpMzE7CiAgaTYyID0gaTY4IF4gaTMyOwogIGk1NSA9IF9iaXRzaGlmdDY0U2hsKGk2MyB8IDAsIGk2MiB8IDAsIDM5KSB8IDA7CiAgaTUxID0gdGVtcFJldDA7CiAgaTYyID0gX2JpdHNoaWZ0NjRMc2hyKGk2MyB8IDAsIGk2MiB8IDAsIDI1KSB8IDA7CiAgaTUxID0gaTUxIHwgdGVtcFJldDA7CiAgaTYzID0gKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTUyIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTY1IDw8IDMpIHwgMCwgNCwgMCkgfCAwKTsKICBpNjUgPSAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNTIgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTY1IDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCk7CiAgaTU2ID0gX2k2NEFkZChpNTUgfCBpNjIgfCAwLCBpNTEgfCAwLCBpNzkgfCAwLCBpNTYgfCAwKSB8IDA7CiAgaTY1ID0gX2k2NEFkZChpNTYgfCAwLCB0ZW1wUmV0MCB8IDAsIGk2MyB8IDAsIGk2NSB8IDApIHwgMDsKICBpNjMgPSB0ZW1wUmV0MDsKICBpNTYgPSBfYml0c2hpZnQ2NFNobChpNjUgXiBpNDkgfCAwLCBpNjMgXiBpNzAgfCAwLCA0OCkgfCAwOwogIGk3OSA9IHRlbXBSZXQwOwogIGk3MCA9IF9iaXRzaGlmdDY0THNocihpNjUgXiBpNDkgfCAwLCBpNjMgXiBpNzAgfCAwLCAxNikgfCAwOwogIGk3OSA9IGk3OSB8IHRlbXBSZXQwOwogIGk2OCA9IF9pNjRBZGQoaTU2IHwgaTcwIHwgMCwgaTc5IHwgMCwgaTY3IHwgMCwgaTY4IHwgMCkgfCAwOwogIGk2NyA9IHRlbXBSZXQwOwogIGk0OSA9IF9iaXRzaGlmdDY0U2hsKGk2OCBeIChpNTUgfCBpNjIpIHwgMCwgaTY3IF4gaTUxIHwgMCwgNTMpIHwgMDsKICBpNTIgPSB0ZW1wUmV0MDsKICBpNTEgPSBfYml0c2hpZnQ2NExzaHIoaTY4IF4gKGk1NSB8IGk2MikgfCAwLCBpNjcgXiBpNTEgfCAwLCAxMSkgfCAwOwogIGk1MiA9IGk1MiB8IHRlbXBSZXQwOwogIGk2MiA9IFNBRkVfSEVBUF9MT0FEKDIzNDYgKyAoaTMwIDw8IDQpICsgMiA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpNTUgPSBTQUZFX0hFQVBfTE9BRCgyMzQ2ICsgKGkzMCA8PCA0KSArIDMgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTU0ID0gX2k2NEFkZCgoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNTUgPDwgMykgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNjIgPDwgMykgfCAwLCA0LCAwKSB8IDApIHwgMCwgKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTU1IDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk2MiA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApIHwgMCwgaTI1IHwgMCwgaTI2IHwgMCkgfCAwOwogIGk1NCA9IF9pNjRBZGQoaTU0IHwgMCwgdGVtcFJldDAgfCAwLCBpMjcgfCAwLCBpMjggfCAwKSB8IDA7CiAgaTQ2ID0gdGVtcFJldDA7CiAgaTYwID0gaTUgXiBpNTQ7CiAgaTM5ID0gaTYgXiBpNDY7CiAgaTU3ID0gX2k2NEFkZChpMzkgfCAwLCBpNjAgfCAwLCBpNyB8IDAsIGk4IHwgMCkgfCAwOwogIGk1OCA9IHRlbXBSZXQwOwogIGk3OCA9IGk1NyBeIGkyNTsKICBpNzcgPSBpNTggXiBpMjY7CiAgaTQ1ID0gX2JpdHNoaWZ0NjRTaGwoaTc4IHwgMCwgaTc3IHwgMCwgMzkpIHwgMDsKICBpNDEgPSB0ZW1wUmV0MDsKICBpNzcgPSBfYml0c2hpZnQ2NExzaHIoaTc4IHwgMCwgaTc3IHwgMCwgMjUpIHwgMDsKICBpNDEgPSBpNDEgfCB0ZW1wUmV0MDsKICBpNzggPSAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNjIgPDwgMykgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNTUgPDwgMykgfCAwLCA0LCAwKSB8IDApOwogIGk1NSA9IChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk2MiA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNTUgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKTsKICBpNDYgPSBfaTY0QWRkKGk0NSB8IGk3NyB8IDAsIGk0MSB8IDAsIGk1NCB8IDAsIGk0NiB8IDApIHwgMDsKICBpNTUgPSBfaTY0QWRkKGk0NiB8IDAsIHRlbXBSZXQwIHwgMCwgaTc4IHwgMCwgaTU1IHwgMCkgfCAwOwogIGk3OCA9IHRlbXBSZXQwOwogIGk0NiA9IF9iaXRzaGlmdDY0U2hsKGk1NSBeIGkzOSB8IDAsIGk3OCBeIGk2MCB8IDAsIDQ4KSB8IDA7CiAgaTU0ID0gdGVtcFJldDA7CiAgaTYwID0gX2JpdHNoaWZ0NjRMc2hyKGk1NSBeIGkzOSB8IDAsIGk3OCBeIGk2MCB8IDAsIDE2KSB8IDA7CiAgaTU0ID0gaTU0IHwgdGVtcFJldDA7CiAgaTU4ID0gX2k2NEFkZChpNDYgfCBpNjAgfCAwLCBpNTQgfCAwLCBpNTcgfCAwLCBpNTggfCAwKSB8IDA7CiAgaTU3ID0gdGVtcFJldDA7CiAgaTM5ID0gX2JpdHNoaWZ0NjRTaGwoaTU4IF4gKGk0NSB8IGk3NykgfCAwLCBpNTcgXiBpNDEgfCAwLCA1MykgfCAwOwogIGk2MiA9IHRlbXBSZXQwOwogIGk0MSA9IF9iaXRzaGlmdDY0THNocihpNTggXiAoaTQ1IHwgaTc3KSB8IDAsIGk1NyBeIGk0MSB8IDAsIDExKSB8IDA7CiAgaTYyID0gaTYyIHwgdGVtcFJldDA7CiAgaTc3ID0gU0FGRV9IRUFQX0xPQUQoMjM0NiArIChpMzAgPDwgNCkgKyA0ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGk0NSA9IFNBRkVfSEVBUF9MT0FEKDIzNDYgKyAoaTMwIDw8IDQpICsgNSA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpNjQgPSBfaTY0QWRkKChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk0NSA8PCAzKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk3NyA8PCAzKSB8IDAsIDQsIDApIHwgMCkgfCAwLCAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNDUgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTc3IDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgfCAwLCBpMjEgfCAwLCBpMjIgfCAwKSB8IDA7CiAgaTY0ID0gX2k2NEFkZChpNjQgfCAwLCB0ZW1wUmV0MCB8IDAsIGkyMyB8IDAsIGkyNCB8IDApIHwgMDsKICBpNzYgPSB0ZW1wUmV0MDsKICBpNTAgPSBpMTMgXiBpNjQ7CiAgaTY5ID0gaTIwIF4gaTc2OwogIGk0NyA9IF9pNjRBZGQoaTY5IHwgMCwgaTUwIHwgMCwgaTE5IHwgMCwgaTE0IHwgMCkgfCAwOwogIGk0OCA9IHRlbXBSZXQwOwogIGk3MyA9IGk0NyBeIGkyMTsKICBpNzIgPSBpNDggXiBpMjI7CiAgaTc1ID0gX2JpdHNoaWZ0NjRTaGwoaTczIHwgMCwgaTcyIHwgMCwgMzkpIHwgMDsKICBpNzEgPSB0ZW1wUmV0MDsKICBpNzIgPSBfYml0c2hpZnQ2NExzaHIoaTczIHwgMCwgaTcyIHwgMCwgMjUpIHwgMDsKICBpNzEgPSBpNzEgfCB0ZW1wUmV0MDsKICBpNzMgPSAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNzcgPDwgMykgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNDUgPDwgMykgfCAwLCA0LCAwKSB8IDApOwogIGk0NSA9IChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk3NyA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNDUgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKTsKICBpNzYgPSBfaTY0QWRkKGk3NSB8IGk3MiB8IDAsIGk3MSB8IDAsIGk2NCB8IDAsIGk3NiB8IDApIHwgMDsKICBpNDUgPSBfaTY0QWRkKGk3NiB8IDAsIHRlbXBSZXQwIHwgMCwgaTczIHwgMCwgaTQ1IHwgMCkgfCAwOwogIGk3MyA9IHRlbXBSZXQwOwogIGk3NiA9IF9iaXRzaGlmdDY0U2hsKGk0NSBeIGk2OSB8IDAsIGk3MyBeIGk1MCB8IDAsIDQ4KSB8IDA7CiAgaTY0ID0gdGVtcFJldDA7CiAgaTUwID0gX2JpdHNoaWZ0NjRMc2hyKGk0NSBeIGk2OSB8IDAsIGk3MyBeIGk1MCB8IDAsIDE2KSB8IDA7CiAgaTY0ID0gaTY0IHwgdGVtcFJldDA7CiAgaTQ4ID0gX2k2NEFkZChpNzYgfCBpNTAgfCAwLCBpNjQgfCAwLCBpNDcgfCAwLCBpNDggfCAwKSB8IDA7CiAgaTQ3ID0gdGVtcFJldDA7CiAgaTY5ID0gX2JpdHNoaWZ0NjRTaGwoaTQ4IF4gKGk3NSB8IGk3MikgfCAwLCBpNDcgXiBpNzEgfCAwLCA1MykgfCAwOwogIGk3NyA9IHRlbXBSZXQwOwogIGk3MSA9IF9iaXRzaGlmdDY0THNocihpNDggXiAoaTc1IHwgaTcyKSB8IDAsIGk0NyBeIGk3MSB8IDAsIDExKSB8IDA7CiAgaTc3ID0gaTc3IHwgdGVtcFJldDA7CiAgaTcyID0gU0FGRV9IRUFQX0xPQUQoMjM0NiArIChpMzAgPDwgNCkgKyA2ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGk3NSA9IFNBRkVfSEVBUF9MT0FEKDIzNDYgKyAoaTMwIDw8IDQpICsgNyA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpODAgPSBfaTY0QWRkKChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk3NSA8PCAzKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk3MiA8PCAzKSB8IDAsIDQsIDApIHwgMCkgfCAwLCAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNzUgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTcyIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgfCAwLCBpMTUgfCAwLCBpMTYgfCAwKSB8IDA7CiAgaTgwID0gX2k2NEFkZChpODAgfCAwLCB0ZW1wUmV0MCB8IDAsIGkxNyB8IDAsIGkxOCB8IDApIHwgMDsKICBpNjYgPSB0ZW1wUmV0MDsKICBpNDAgPSBpMTIgXiBpODA7CiAgaTU5ID0gaTExIF4gaTY2OwogIGkzNyA9IF9pNjRBZGQoaTU5IHwgMCwgaTQwIHwgMCwgaTEwIHwgMCwgaTkgfCAwKSB8IDA7CiAgaTM4ID0gdGVtcFJldDA7CiAgaTUzID0gaTM3IF4gaTE1OwogIGk0MiA9IGkzOCBeIGkxNjsKICBpNDMgPSBfYml0c2hpZnQ2NFNobChpNTMgfCAwLCBpNDIgfCAwLCAzOSkgfCAwOwogIGk2MSA9IHRlbXBSZXQwOwogIGk0MiA9IF9iaXRzaGlmdDY0THNocihpNTMgfCAwLCBpNDIgfCAwLCAyNSkgfCAwOwogIGk2MSA9IGk2MSB8IHRlbXBSZXQwOwogIGk1MyA9IChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk3MiA8PCAzKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk3NSA8PCAzKSB8IDAsIDQsIDApIHwgMCk7CiAgaTc1ID0gKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTcyIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk3NSA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApOwogIGk2NiA9IF9pNjRBZGQoaTQzIHwgaTQyIHwgMCwgaTYxIHwgMCwgaTgwIHwgMCwgaTY2IHwgMCkgfCAwOwogIGk3NSA9IF9pNjRBZGQoaTY2IHwgMCwgdGVtcFJldDAgfCAwLCBpNTMgfCAwLCBpNzUgfCAwKSB8IDA7CiAgaTUzID0gdGVtcFJldDA7CiAgaTY2ID0gX2JpdHNoaWZ0NjRTaGwoaTc1IF4gaTU5IHwgMCwgaTUzIF4gaTQwIHwgMCwgNDgpIHwgMDsKICBpODAgPSB0ZW1wUmV0MDsKICBpNDAgPSBfYml0c2hpZnQ2NExzaHIoaTc1IF4gaTU5IHwgMCwgaTUzIF4gaTQwIHwgMCwgMTYpIHwgMDsKICBpODAgPSBpODAgfCB0ZW1wUmV0MDsKICBpMzggPSBfaTY0QWRkKGk2NiB8IGk0MCB8IDAsIGk4MCB8IDAsIGkzNyB8IDAsIGkzOCB8IDApIHwgMDsKICBpMzcgPSB0ZW1wUmV0MDsKICBpNTkgPSBfYml0c2hpZnQ2NFNobChpMzggXiAoaTQzIHwgaTQyKSB8IDAsIGkzNyBeIGk2MSB8IDAsIDUzKSB8IDA7CiAgaTcyID0gdGVtcFJldDA7CiAgaTYxID0gX2JpdHNoaWZ0NjRMc2hyKGkzOCBeIChpNDMgfCBpNDIpIHwgMCwgaTM3IF4gaTYxIHwgMCwgMTEpIHwgMDsKICBpNzIgPSBpNzIgfCB0ZW1wUmV0MDsKICBpNDIgPSBTQUZFX0hFQVBfTE9BRCgyMzQ2ICsgKGkzMCA8PCA0KSArIDE0ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGk0MyA9IFNBRkVfSEVBUF9MT0FEKDIzNDYgKyAoaTMwIDw8IDQpICsgMTUgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTQ0ID0gKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTQzIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTQyIDw8IDMpIHwgMCwgNCwgMCkgfCAwKTsKICBpNzQgPSAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNDMgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTQyIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCk7CiAgaTUzID0gX2k2NEFkZChpNzUgfCAwLCBpNTMgfCAwLCBpNDkgfCBpNTEgfCAwLCBpNTIgfCAwKSB8IDA7CiAgaTc0ID0gX2k2NEFkZChpNTMgfCAwLCB0ZW1wUmV0MCB8IDAsIGk0NCB8IDAsIGk3NCB8IDApIHwgMDsKICBpNDQgPSB0ZW1wUmV0MDsKICBpNTcgPSBfaTY0QWRkKGk0NCBeIGk2NCB8IDAsIGk3NCBeIChpNzYgfCBpNTApIHwgMCwgaTU4IHwgMCwgaTU3IHwgMCkgfCAwOwogIGk1OCA9IHRlbXBSZXQwOwogIGk1MyA9IF9iaXRzaGlmdDY0U2hsKGk1NyBeIChpNDkgfCBpNTEpIHwgMCwgaTU4IF4gaTUyIHwgMCwgMzkpIHwgMDsKICBpNzUgPSB0ZW1wUmV0MDsKICBpNTIgPSBfYml0c2hpZnQ2NExzaHIoaTU3IF4gKGk0OSB8IGk1MSkgfCAwLCBpNTggXiBpNTIgfCAwLCAyNSkgfCAwOwogIGk3NSA9IGk3NSB8IHRlbXBSZXQwOwogIGk0MyA9IF9pNjRBZGQoKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTQyIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTQzIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSB8IDAsIChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk0MiA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNDMgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSB8IDAsIGk3NCB8IDAsIGk0NCB8IDApIHwgMDsKICBpNDMgPSBfaTY0QWRkKGk0MyB8IDAsIHRlbXBSZXQwIHwgMCwgaTUzIHwgaTUyIHwgMCwgaTc1IHwgMCkgfCAwOwogIGk0MiA9IHRlbXBSZXQwOwogIGk1MSA9IF9iaXRzaGlmdDY0U2hsKGk0MyBeIChpNDQgXiBpNjQpIHwgMCwgaTQyIF4gKGk3NCBeIChpNzYgfCBpNTApKSB8IDAsIDQ4KSB8IDA7CiAgaTQ5ID0gdGVtcFJldDA7CiAgaTUwID0gX2JpdHNoaWZ0NjRMc2hyKGk0MyBeIChpNDQgXiBpNjQpIHwgMCwgaTQyIF4gKGk3NCBeIChpNzYgfCBpNTApKSB8IDAsIDE2KSB8IDA7CiAgaTQ5ID0gaTQ5IHwgdGVtcFJldDA7CiAgaTU4ID0gX2k2NEFkZChpNTEgfCBpNTAgfCAwLCBpNDkgfCAwLCBpNTcgfCAwLCBpNTggfCAwKSB8IDA7CiAgaTU3ID0gdGVtcFJldDA7CiAgaTc2ID0gX2JpdHNoaWZ0NjRTaGwoaTU4IF4gKGk1MyB8IGk1MikgfCAwLCBpNTcgXiBpNzUgfCAwLCA1MykgfCAwOwogIGk3NCA9IHRlbXBSZXQwOwogIGk3NSA9IF9iaXRzaGlmdDY0THNocihpNTggXiAoaTUzIHwgaTUyKSB8IDAsIGk1NyBeIGk3NSB8IDAsIDExKSB8IDA7CiAgaTc0ID0gaTc0IHwgdGVtcFJldDA7CiAgaTUyID0gU0FGRV9IRUFQX0xPQUQoMjM0NiArIChpMzAgPDwgNCkgKyAxMiA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpNTMgPSBTQUZFX0hFQVBfTE9BRCgyMzQ2ICsgKGkzMCA8PCA0KSArIDEzID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGk2NCA9IChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk1MyA8PCAzKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk1MiA8PCAzKSB8IDAsIDQsIDApIHwgMCk7CiAgaTQ0ID0gKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTUzIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk1MiA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApOwogIGk3MyA9IF9pNjRBZGQoaTU5IHwgaTYxIHwgMCwgaTcyIHwgMCwgaTQ1IHwgMCwgaTczIHwgMCkgfCAwOwogIGk0NCA9IF9pNjRBZGQoaTczIHwgMCwgdGVtcFJldDAgfCAwLCBpNjQgfCAwLCBpNDQgfCAwKSB8IDA7CiAgaTY0ID0gdGVtcFJldDA7CiAgaTY3ID0gX2k2NEFkZChpNjQgXiBpNTQgfCAwLCBpNDQgXiAoaTQ2IHwgaTYwKSB8IDAsIGk2OCB8IDAsIGk2NyB8IDApIHwgMDsKICBpNjggPSB0ZW1wUmV0MDsKICBpNzMgPSBfYml0c2hpZnQ2NFNobChpNjcgXiAoaTU5IHwgaTYxKSB8IDAsIGk2OCBeIGk3MiB8IDAsIDM5KSB8IDA7CiAgaTQ1ID0gdGVtcFJldDA7CiAgaTcyID0gX2JpdHNoaWZ0NjRMc2hyKGk2NyBeIChpNTkgfCBpNjEpIHwgMCwgaTY4IF4gaTcyIHwgMCwgMjUpIHwgMDsKICBpNDUgPSBpNDUgfCB0ZW1wUmV0MDsKICBpNTMgPSBfaTY0QWRkKChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk1MiA8PCAzKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk1MyA8PCAzKSB8IDAsIDQsIDApIHwgMCkgfCAwLCAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNTIgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTUzIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgfCAwLCBpNDQgfCAwLCBpNjQgfCAwKSB8IDA7CiAgaTUzID0gX2k2NEFkZChpNTMgfCAwLCB0ZW1wUmV0MCB8IDAsIGk3MyB8IGk3MiB8IDAsIGk0NSB8IDApIHwgMDsKICBpNTIgPSB0ZW1wUmV0MDsKICBpNjEgPSBfYml0c2hpZnQ2NFNobChpNTMgXiAoaTY0IF4gaTU0KSB8IDAsIGk1MiBeIChpNDQgXiAoaTQ2IHwgaTYwKSkgfCAwLCA0OCkgfCAwOwogIGk1OSA9IHRlbXBSZXQwOwogIGk2MCA9IF9iaXRzaGlmdDY0THNocihpNTMgXiAoaTY0IF4gaTU0KSB8IDAsIGk1MiBeIChpNDQgXiAoaTQ2IHwgaTYwKSkgfCAwLCAxNikgfCAwOwogIGk1OSA9IGk1OSB8IHRlbXBSZXQwOwogIGk2OCA9IF9pNjRBZGQoaTYxIHwgaTYwIHwgMCwgaTU5IHwgMCwgaTY3IHwgMCwgaTY4IHwgMCkgfCAwOwogIGk2NyA9IHRlbXBSZXQwOwogIGk0NiA9IF9iaXRzaGlmdDY0U2hsKGk2OCBeIChpNzMgfCBpNzIpIHwgMCwgaTY3IF4gaTQ1IHwgMCwgNTMpIHwgMDsKICBpNDQgPSB0ZW1wUmV0MDsKICBpNDUgPSBfYml0c2hpZnQ2NExzaHIoaTY4IF4gKGk3MyB8IGk3MikgfCAwLCBpNjcgXiBpNDUgfCAwLCAxMSkgfCAwOwogIGk0NCA9IGk0NCB8IHRlbXBSZXQwOwogIGk3MiA9IFNBRkVfSEVBUF9MT0FEKDIzNDYgKyAoaTMwIDw8IDQpICsgOCA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpNzMgPSBTQUZFX0hFQVBfTE9BRCgyMzQ2ICsgKGkzMCA8PCA0KSArIDkgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTU0ID0gKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTczIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTcyIDw8IDMpIHwgMCwgNCwgMCkgfCAwKTsKICBpNjQgPSAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNzMgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTcyIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCk7CiAgaTYzID0gX2k2NEFkZChpMzkgfCBpNDEgfCAwLCBpNjIgfCAwLCBpNjUgfCAwLCBpNjMgfCAwKSB8IDA7CiAgaTY0ID0gX2k2NEFkZChpNjMgfCAwLCB0ZW1wUmV0MCB8IDAsIGk1NCB8IDAsIGk2NCB8IDApIHwgMDsKICBpNTQgPSB0ZW1wUmV0MDsKICBpNDcgPSBfaTY0QWRkKGk1NCBeIGk4MCB8IDAsIGk2NCBeIChpNjYgfCBpNDApIHwgMCwgaTQ4IHwgMCwgaTQ3IHwgMCkgfCAwOwogIGk0OCA9IHRlbXBSZXQwOwogIGk2MyA9IF9iaXRzaGlmdDY0U2hsKGk0NyBeIChpMzkgfCBpNDEpIHwgMCwgaTQ4IF4gaTYyIHwgMCwgMzkpIHwgMDsKICBpNjUgPSB0ZW1wUmV0MDsKICBpNjIgPSBfYml0c2hpZnQ2NExzaHIoaTQ3IF4gKGkzOSB8IGk0MSkgfCAwLCBpNDggXiBpNjIgfCAwLCAyNSkgfCAwOwogIGk2NSA9IGk2NSB8IHRlbXBSZXQwOwogIGk3MyA9IF9pNjRBZGQoKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTcyIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTczIDw8IDMpIHwgMCwgNCwgMCkgfCAwKSB8IDAsIChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk3MiA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzNiArIChpNzMgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSB8IDAsIGk2NCB8IDAsIGk1NCB8IDApIHwgMDsKICBpNzMgPSBfaTY0QWRkKGk3MyB8IDAsIHRlbXBSZXQwIHwgMCwgaTYzIHwgaTYyIHwgMCwgaTY1IHwgMCkgfCAwOwogIGk3MiA9IHRlbXBSZXQwOwogIGk0MSA9IF9iaXRzaGlmdDY0U2hsKGk3MyBeIChpNTQgXiBpODApIHwgMCwgaTcyIF4gKGk2NCBeIChpNjYgfCBpNDApKSB8IDAsIDQ4KSB8IDA7CiAgaTM5ID0gdGVtcFJldDA7CiAgaTQwID0gX2JpdHNoaWZ0NjRMc2hyKGk3MyBeIChpNTQgXiBpODApIHwgMCwgaTcyIF4gKGk2NCBeIChpNjYgfCBpNDApKSB8IDAsIDE2KSB8IDA7CiAgaTM5ID0gaTM5IHwgdGVtcFJldDA7CiAgaTQ4ID0gX2k2NEFkZChpNDEgfCBpNDAgfCAwLCBpMzkgfCAwLCBpNDcgfCAwLCBpNDggfCAwKSB8IDA7CiAgaTQ3ID0gdGVtcFJldDA7CiAgaTY2ID0gX2JpdHNoaWZ0NjRTaGwoaTQ4IF4gKGk2MyB8IGk2MikgfCAwLCBpNDcgXiBpNjUgfCAwLCA1MykgfCAwOwogIGk2NCA9IHRlbXBSZXQwOwogIGk2NSA9IF9iaXRzaGlmdDY0THNocihpNDggXiAoaTYzIHwgaTYyKSB8IDAsIGk0NyBeIGk2NSB8IDAsIDExKSB8IDA7CiAgaTY0ID0gaTY0IHwgdGVtcFJldDA7CiAgaTYyID0gU0FGRV9IRUFQX0xPQUQoMjM0NiArIChpMzAgPDwgNCkgKyAxMCA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpNjMgPSBTQUZFX0hFQVBfTE9BRCgyMzQ2ICsgKGkzMCA8PCA0KSArIDExID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGk4MCA9IChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk2MyA8PCAzKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk2MiA8PCAzKSB8IDAsIDQsIDApIHwgMCk7CiAgaTU0ID0gKFNBRkVfSEVBUF9MT0FEKDEwMjQgKyAoaTYzIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk2MiA8PCAzKSArIDQgfCAwLCA0LCAwKSB8IDApOwogIGk3OCA9IF9pNjRBZGQoaTY5IHwgaTcxIHwgMCwgaTc3IHwgMCwgaTU1IHwgMCwgaTc4IHwgMCkgfCAwOwogIGk1NCA9IF9pNjRBZGQoaTc4IHwgMCwgdGVtcFJldDAgfCAwLCBpODAgfCAwLCBpNTQgfCAwKSB8IDA7CiAgaTgwID0gdGVtcFJldDA7CiAgaTM3ID0gX2k2NEFkZChpODAgXiBpNzkgfCAwLCBpNTQgXiAoaTU2IHwgaTcwKSB8IDAsIGkzOCB8IDAsIGkzNyB8IDApIHwgMDsKICBpMzggPSB0ZW1wUmV0MDsKICBpNzggPSBfYml0c2hpZnQ2NFNobChpMzcgXiAoaTY5IHwgaTcxKSB8IDAsIGkzOCBeIGk3NyB8IDAsIDM5KSB8IDA7CiAgaTU1ID0gdGVtcFJldDA7CiAgaTc3ID0gX2JpdHNoaWZ0NjRMc2hyKGkzNyBeIChpNjkgfCBpNzEpIHwgMCwgaTM4IF4gaTc3IHwgMCwgMjUpIHwgMDsKICBpNTUgPSBpNTUgfCB0ZW1wUmV0MDsKICBpNjMgPSBfaTY0QWRkKChTQUZFX0hFQVBfTE9BRCgxMDI0ICsgKGk2MiA8PCAzKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTM2ICsgKGk2MyA8PCAzKSB8IDAsIDQsIDApIHwgMCkgfCAwLCAoU0FGRV9IRUFQX0xPQUQoMTAyNCArIChpNjIgPDwgMykgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMzYgKyAoaTYzIDw8IDMpICsgNCB8IDAsIDQsIDApIHwgMCkgfCAwLCBpNTQgfCAwLCBpODAgfCAwKSB8IDA7CiAgaTYzID0gX2k2NEFkZChpNjMgfCAwLCB0ZW1wUmV0MCB8IDAsIGk3OCB8IGk3NyB8IDAsIGk1NSB8IDApIHwgMDsKICBpNjIgPSB0ZW1wUmV0MDsKICBpNzEgPSBfYml0c2hpZnQ2NFNobChpNjMgXiAoaTgwIF4gaTc5KSB8IDAsIGk2MiBeIChpNTQgXiAoaTU2IHwgaTcwKSkgfCAwLCA0OCkgfCAwOwogIGk2OSA9IHRlbXBSZXQwOwogIGk3MCA9IF9iaXRzaGlmdDY0THNocihpNjMgXiAoaTgwIF4gaTc5KSB8IDAsIGk2MiBeIChpNTQgXiAoaTU2IHwgaTcwKSkgfCAwLCAxNikgfCAwOwogIGk2OSA9IGk2OSB8IHRlbXBSZXQwOwogIGkzOCA9IF9pNjRBZGQoaTcxIHwgaTcwIHwgMCwgaTY5IHwgMCwgaTM3IHwgMCwgaTM4IHwgMCkgfCAwOwogIGkzNyA9IHRlbXBSZXQwOwogIGk1NiA9IF9iaXRzaGlmdDY0U2hsKGkzOCBeIChpNzggfCBpNzcpIHwgMCwgaTM3IF4gaTU1IHwgMCwgNTMpIHwgMDsKICBpNTQgPSB0ZW1wUmV0MDsKICBpNTUgPSBfYml0c2hpZnQ2NExzaHIoaTM4IF4gKGk3OCB8IGk3NykgfCAwLCBpMzcgXiBpNTUgfCAwLCAxMSkgfCAwOwogIGk1NCA9IGk1NCB8IHRlbXBSZXQwOwogIGk3NyA9IF9pNjRBZGQoaTMwIHwgMCwgaTI5IHwgMCwgMSwgMCkgfCAwOwogIGkyOSA9IHRlbXBSZXQwOwogIGkzMCA9IGk3NzsKICBpMzEgPSBpNzYgfCBpNzU7CiAgaTMyID0gaTc0OwogIGkzMyA9IGk3MzsKICBpMzQgPSBpNzI7CiAgaTEgPSBpNzEgfCBpNzA7CiAgaTIgPSBpNjk7CiAgaTMgPSBpNjg7CiAgaTQgPSBpNjc7CiAgaTI1ID0gaTY2IHwgaTY1OwogIGkyNiA9IGk2NDsKICBpMjcgPSBpNjM7CiAgaTI4ID0gaTYyOwogIGk1ID0gaTYxIHwgaTYwOwogIGk2ID0gaTU5OwogIGk3ID0gaTU4OwogIGk4ID0gaTU3OwogIGkyMSA9IGk1NiB8IGk1NTsKICBpMjIgPSBpNTQ7CiAgaTIzID0gaTUzOwogIGkyNCA9IGk1MjsKICBpMTMgPSBpNTEgfCBpNTA7CiAgaTIwID0gaTQ5OwogIGkxOSA9IGk0ODsKICBpMTQgPSBpNDc7CiAgaTE1ID0gaTQ2IHwgaTQ1OwogIGkxNiA9IGk0NDsKICBpMTcgPSBpNDM7CiAgaTE4ID0gaTQyOwogIGkxMiA9IGk0MSB8IGk0MDsKICBpMTEgPSBpMzk7CiAgaTEwID0gaTM4OwogIGk5ID0gaTM3OwogfQogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDMyIHwgMCwgaTMxIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgMzIgKyA0IHwgMCwgaTMyIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4IHwgMCwgaTMzIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgNCB8IDAsIGkzNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDk2IHwgMCwgaTEgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA5NiArIDQgfCAwLCBpMiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDY0IHwgMCwgaTMgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA2NCArIDQgfCAwLCBpNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDQwIHwgMCwgaTI1IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgNDAgKyA0IHwgMCwgaTI2IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgOCB8IDAsIGkyNyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDggKyA0IHwgMCwgaTI4IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgMTA0IHwgMCwgaTUgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyAxMDQgKyA0IHwgMCwgaTYgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA3MiB8IDAsIGk3IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgNzIgKyA0IHwgMCwgaTggfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA0OCB8IDAsIGkyMSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDQ4ICsgNCB8IDAsIGkyMiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDE2IHwgMCwgaTIzIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgMTYgKyA0IHwgMCwgaTI0IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgMTEyIHwgMCwgaTEzIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgMTEyICsgNCB8IDAsIGkyMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDgwIHwgMCwgaTE5IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgODAgKyA0IHwgMCwgaTE0IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTM2ICsgMTI4ICsgNTYgfCAwLCBpMTUgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA1NiArIDQgfCAwLCBpMTYgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyAyNCB8IDAsIGkxNyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDI0ICsgNCB8IDAsIGkxOCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDEyMCB8IDAsIGkxMiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDEyMCArIDQgfCAwLCBpMTEgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMzYgKyAxMjggKyA4OCB8IDAsIGkxMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkzNiArIDEyOCArIDg4ICsgNCB8IDAsIGk5IHwgMCwgNCk7CiBpMSA9IDA7CiBpMiA9IDA7CiB3aGlsZSAoMSkgewogIGlmICghKGkxID4+PiAwIDwgMCB8IChpMSB8IDApID09IDAgJiBpMiA+Pj4gMCA8IDE2KSkgYnJlYWs7CiAgaTc4ID0gaTM2ICsgMTI4ICsgKGkyIDw8IDMpIHwgMDsKICBpNzkgPSBpMzUgKyAoKGkyICYgNykgPDwgMykgfCAwOwogIGk4MCA9IChTQUZFX0hFQVBfTE9BRChpNzkgKyA0IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpNzggKyA0IHwgMCwgNCwgMCkgfCAwKTsKICBTQUZFX0hFQVBfU1RPUkUoaTc5IHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk3OSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTc4IHwgMCwgNCwgMCkgfCAwKSB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpNzkgKyA0IHwgMCwgaTgwIHwgMCwgNCk7CiAgaTgwID0gX2k2NEFkZChpMiB8IDAsIGkxIHwgMCwgMSwgMCkgfCAwOwogIGkxID0gdGVtcFJldDA7CiAgaTIgPSBpODA7CiB9CiBpMSA9IDA7CiBpMiA9IDA7CiB3aGlsZSAoMSkgewogIGlmICghKGkxID4+PiAwIDwgMCB8IChpMSB8IDApID09IDAgJiBpMiA+Pj4gMCA8IDgpKSBicmVhazsKICBpNzggPSBpMzUgKyA2NCArICgoaTIgJiAzKSA8PCAzKSB8IDA7CiAgaTc5ID0gaTM1ICsgKGkyIDw8IDMpIHwgMDsKICBpODAgPSAoU0FGRV9IRUFQX0xPQUQoaTc5ICsgNCB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTc4ICsgNCB8IDAsIDQsIDApIHwgMCk7CiAgU0FGRV9IRUFQX1NUT1JFKGk3OSB8IDAsIChTQUZFX0hFQVBfTE9BRChpNzkgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGk3OCB8IDAsIDQsIDApIHwgMCkgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTc5ICsgNCB8IDAsIGk4MCB8IDAsIDQpOwogIGk4MCA9IF9pNjRBZGQoaTIgfCAwLCBpMSB8IDAsIDEsIDApIHwgMDsKICBpMSA9IHRlbXBSZXQwOwogIGkyID0gaTgwOwogfQogU1RBQ0tUT1AgPSBpMzY7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9ibGFrZTUxMl9maW5hbChpNCwgaTUpIHsKIGk0ID0gaTQgfCAwOwogaTUgPSBpNSB8IDA7CiB2YXIgaTEgPSAwLCBpMiA9IDAsIGkzID0gMCwgaTYgPSAwLCBpNyA9IDAsIGk4ID0gMCwgaTkgPSAwLCBpMTAgPSAwLCBpMTEgPSAwOwogaTYgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyAzMiB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coMzIpOwogU0FGRV9IRUFQX1NUT1JFKGk2ICsgMSA+PiAwIHwgMCwgMSB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk2ID4+IDAgfCAwLCAtMTI3IHwgMCwgMSk7CiBpMyA9IFNBRkVfSEVBUF9MT0FEKGk0ICsgOTYgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTEgPSBTQUZFX0hFQVBfTE9BRChpNCArIDk2ICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMiA9IFNBRkVfSEVBUF9MT0FEKGk0ICsgMTEyIHwgMCwgNCwgMCkgfCAwIHwgMDsKIGk3ID0gX2k2NEFkZChpMyB8IDAsIGkxIHwgMCwgaTIgfCAwLCAoKGkyIHwgMCkgPCAwKSA8PCAzMSA+PiAzMSB8IDApIHwgMDsKIGk4ID0gdGVtcFJldDA7CiBpOSA9IF9pNjRBZGQoU0FGRV9IRUFQX0xPQUQoaTQgKyAxMDQgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDEwNCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAoaTggPj4+IDAgPCAoKGkyIHwgMCkgPCAwKSA8PCAzMSA+PiAzMSA+Pj4gMCB8IChpOCB8IDApID09ICgoKGkyIHwgMCkgPCAwKSA8PCAzMSA+PiAzMSB8IDApICYgaTcgPj4+IDAgPCBpMiA+Pj4gMCkgJiAxIHwgMCwgMCkgfCAwOwogaTEwID0gdGVtcFJldDA7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoaTkgfCAwLCBpMTAgfCAwLCA1NikgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk2ICsgOCA+PiAwIHwgMCwgaTExIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoaTkgfCAwLCBpMTAgfCAwLCA0OCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk2ICsgOCArIDEgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKGk5IHwgMCwgaTEwIHwgMCwgNDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNiArIDggKyAyID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNiArIDggKyAzID4+IDAgfCAwLCBpMTAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNiArIDggKyA0ID4+IDAgfCAwLCBpOSA+Pj4gMjQgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNiArIDggKyA1ID4+IDAgfCAwLCBpOSA+Pj4gMTYgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNiArIDggKyA2ID4+IDAgfCAwLCBpOSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk2ICsgOCArIDcgPj4gMCB8IDAsIGk5IHwgMCwgMSk7CiBpOSA9IF9iaXRzaGlmdDY0THNocihpNyB8IDAsIGk4IHwgMCwgNTYpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNiArIDggKyA4ID4+IDAgfCAwLCBpOSB8IDAsIDEpOwogaTkgPSBfYml0c2hpZnQ2NExzaHIoaTcgfCAwLCBpOCB8IDAsIDQ4KSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTYgKyA4ICsgOSA+PiAwIHwgMCwgaTkgfCAwLCAxKTsKIGk5ID0gX2JpdHNoaWZ0NjRMc2hyKGk3IHwgMCwgaTggfCAwLCA0MCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk2ICsgOCArIDEwID4+IDAgfCAwLCBpOSB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk2ICsgOCArIDExID4+IDAgfCAwLCBpOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk2ICsgOCArIDEyID4+IDAgfCAwLCBpNyA+Pj4gMjQgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNiArIDggKyAxMyA+PiAwIHwgMCwgaTcgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTYgKyA4ICsgMTQgPj4gMCB8IDAsIGk3ID4+PiA4IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTYgKyA4ICsgMTUgPj4gMCB8IDAsIGk3IHwgMCwgMSk7CiBpZiAoKGkyIHwgMCkgPT0gODg4KSB7CiAgaTEgPSBfaTY0QWRkKGkzIHwgMCwgaTEgfCAwLCAtOCwgLTEpIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTQgKyA5NiB8IDAsIGkxIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGk0ICsgOTYgKyA0IHwgMCwgdGVtcFJldDAgfCAwLCA0KTsKICBfYmxha2U1MTJfdXBkYXRlKGk0LCBpNiwgOCwgMCk7CiAgaTEgPSBTQUZFX0hFQVBfTE9BRChpNCArIDk2IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpMiA9IFNBRkVfSEVBUF9MT0FEKGk0ICsgOTYgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIH0gZWxzZSB7CiAgaWYgKChpMiB8IDApIDwgODg4KSB7CiAgIGlmICghaTIpIFNBRkVfSEVBUF9TVE9SRShpNCArIDExNiB8IDAsIDEgfCAwLCA0KTsKICAgaTExID0gX2k2NFN1YnRyYWN0KGkzIHwgMCwgaTEgfCAwLCA4ODggLSBpMiB8IDAsICgoODg4IC0gaTIgfCAwKSA8IDApIDw8IDMxID4+IDMxIHwgMCkgfCAwOwogICBTQUZFX0hFQVBfU1RPUkUoaTQgKyA5NiB8IDAsIGkxMSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTQgKyA5NiArIDQgfCAwLCB0ZW1wUmV0MCB8IDAsIDQpOwogICBfYmxha2U1MTJfdXBkYXRlKGk0LCAyNjY2LCA4ODggLSBpMiB8IDAsICgoODg4IC0gaTIgfCAwKSA8IDApIDw8IDMxID4+IDMxKTsKICB9IGVsc2UgewogICBpMTEgPSBfaTY0U3VidHJhY3QoaTMgfCAwLCBpMSB8IDAsIDEwMjQgLSBpMiB8IDAsICgoMTAyNCAtIGkyIHwgMCkgPCAwKSA8PCAzMSA+PiAzMSB8IDApIHwgMDsKICAgU0FGRV9IRUFQX1NUT1JFKGk0ICsgOTYgfCAwLCBpMTEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGk0ICsgOTYgKyA0IHwgMCwgdGVtcFJldDAgfCAwLCA0KTsKICAgX2JsYWtlNTEyX3VwZGF0ZShpNCwgMjY2NiwgMTAyNCAtIGkyIHwgMCwgKCgxMDI0IC0gaTIgfCAwKSA8IDApIDw8IDMxID4+IDMxKTsKICAgaTExID0gX2k2NEFkZChTQUZFX0hFQVBfTE9BRChpNCArIDk2IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA5NiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAtODg4LCAtMSkgfCAwOwogICBTQUZFX0hFQVBfU1RPUkUoaTQgKyA5NiB8IDAsIGkxMSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTQgKyA5NiArIDQgfCAwLCB0ZW1wUmV0MCB8IDAsIDQpOwogICBfYmxha2U1MTJfdXBkYXRlKGk0LCAyNjY3LCA4ODgsIDApOwogICBTQUZFX0hFQVBfU1RPUkUoaTQgKyAxMTYgfCAwLCAxIHwgMCwgNCk7CiAgfQogIF9ibGFrZTUxMl91cGRhdGUoaTQsIGk2ICsgMSB8IDAsIDgsIDApOwogIGkxID0gX2k2NEFkZChTQUZFX0hFQVBfTE9BRChpNCArIDk2IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA5NiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAtOCwgLTEpIHwgMDsKICBpMiA9IHRlbXBSZXQwOwogIFNBRkVfSEVBUF9TVE9SRShpNCArIDk2IHwgMCwgaTEgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTQgKyA5NiArIDQgfCAwLCBpMiB8IDAsIDQpOwogfQogaTExID0gX2k2NEFkZChpMSB8IDAsIGkyIHwgMCwgLTEyOCwgLTEpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDk2IHwgMCwgaTExIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyA5NiArIDQgfCAwLCB0ZW1wUmV0MCB8IDAsIDQpOwogX2JsYWtlNTEyX3VwZGF0ZShpNCwgaTYgKyA4IHwgMCwgMTI4LCAwKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDU2KSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNDgpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDEgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDIgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMyA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA0ID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMjQgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDUgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAxNiB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNiA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDggfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDcgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0IHwgMCwgNCwgMCkgfCAwIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoU0FGRV9IRUFQX0xPQUQoaTQgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA4ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDU2KSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA4ID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCArIDggfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDggKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNDgpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDkgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0ICsgOCB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0MCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMTAgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDEyID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDI0IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAxMyA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgOCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAxNiB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMTQgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCArIDggfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMTUgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgOCB8IDAsIDQsIDApIHwgMCB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0ICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDE2ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDU2KSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAxNiA+PiAwIHwgMCwgaTExIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoU0FGRV9IRUFQX0xPQUQoaTQgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgMTYgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNDgpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDE3ID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyAxNiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0MCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMTggPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMTkgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgMTYgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAyMCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMjQgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDIxID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAxNiB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMjIgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDggfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDIzID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoU0FGRV9IRUFQX0xPQUQoaTQgKyAyNCB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgMjQgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNTYpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDI0ID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyAyNCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0OCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMjUgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0ICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDI0ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQwKSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAyNiA+PiAwIHwgMCwgaTExIHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAyNyA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyAyNCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDI4ID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyAyNCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMjkgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAzMCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMzEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCArIDMyIHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyAzMiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA1NikgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMzIgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0ICsgMzIgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDMyICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQ4KSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAzMyA+PiAwIHwgMCwgaTExIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoU0FGRV9IRUFQX0xPQUQoaTQgKyAzMiB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgMzIgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDM0ID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDM1ID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDMyICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgMzYgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCArIDMyIHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDI0IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAzNyA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgMzIgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMTYgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDM4ID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyAzMiB8IDAsIDQsIDApIHwgMCB8IDApID4+PiA4IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAzOSA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyAzMiB8IDAsIDQsIDApIHwgMCB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0ICsgNDAgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDQwICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDU2KSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA0MCA+PiAwIHwgMCwgaTExIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoU0FGRV9IRUFQX0xPQUQoaTQgKyA0MCB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgNDAgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNDgpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDQxID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCArIDQwIHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA0MCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0MCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNDIgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNDMgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgNDAgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA0NCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgNDAgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMjQgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDQ1ID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA0MCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAxNiB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNDYgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCArIDQwIHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDggfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDQ3ID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDQwIHwgMCwgNCwgMCkgfCAwIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoU0FGRV9IRUFQX0xPQUQoaTQgKyA0OCB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgNDggKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNTYpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDQ4ID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCArIDQ4IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA0OCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0OCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNDkgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0ICsgNDggfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDQ4ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQwKSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA1MCA+PiAwIHwgMCwgaTExIHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA1MSA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA0OCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDUyID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA0OCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNTMgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCArIDQ4IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA1NCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgNDggfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNTUgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgNDggfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIGkxMSA9IF9iaXRzaGlmdDY0THNocihTQUZFX0hFQVBfTE9BRChpNCArIDU2IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA1NiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA1NikgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNTYgPj4gMCB8IDAsIGkxMSB8IDAsIDEpOwogaTExID0gX2JpdHNoaWZ0NjRMc2hyKFNBRkVfSEVBUF9MT0FEKGk0ICsgNTYgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDU2ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQ4KSB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA1NyA+PiAwIHwgMCwgaTExIHwgMCwgMSk7CiBpMTEgPSBfYml0c2hpZnQ2NExzaHIoU0FGRV9IRUFQX0xPQUQoaTQgKyA1NiB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgNTYgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgNDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDU4ID4+IDAgfCAwLCBpMTEgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDU5ID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIDU2ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgNjAgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNCArIDU2IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDI0IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA2MSA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgNTYgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMTYgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDYyID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA1NiB8IDAsIDQsIDApIHwgMCB8IDApID4+PiA4IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA2MyA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyA1NiB8IDAsIDQsIDApIHwgMCB8IDAsIDEpOwogU1RBQ0tUT1AgPSBpNjsKIHJldHVybjsKfQoKZnVuY3Rpb24gX2JsYWtlMjU2X2NvbXByZXNzKGkxOCwgaTIpIHsKIGkxOCA9IGkxOCB8IDA7CiBpMiA9IGkyIHwgMDsKIHZhciBpMSA9IDAsIGkzID0gMCwgaTQgPSAwLCBpNSA9IDAsIGk2ID0gMCwgaTcgPSAwLCBpOCA9IDAsIGk5ID0gMCwgaTEwID0gMCwgaTExID0gMCwgaTEyID0gMCwgaTEzID0gMCwgaTE0ID0gMCwgaTE1ID0gMCwgaTE2ID0gMCwgaTE3ID0gMCwgaTE5ID0gMCwgaTIwID0gMCwgaTIxID0gMCwgaTIyID0gMCwgaTIzID0gMCwgaTI0ID0gMCwgaTI1ID0gMCwgaTI2ID0gMCwgaTI3ID0gMCwgaTI4ID0gMCwgaTI5ID0gMCwgaTMwID0gMCwgaTMxID0gMCwgaTMyID0gMCwgaTMzID0gMCwgaTM0ID0gMCwgaTM1ID0gMCwgaTM2ID0gMCwgaTM3ID0gMCwgaTM4ID0gMDsKIGkxOSA9IFNUQUNLVE9QOwogU1RBQ0tUT1AgPSBTVEFDS1RPUCArIDEyOCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coMTI4KTsKIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDE2KSBicmVhazsKICBpMTcgPSBpMiArIChpMSA8PCAyKSB8IDA7CiAgU0FGRV9IRUFQX1NUT1JFKGkxOSArIChpMSA8PCAyKSB8IDAsIChTQUZFX0hFQVBfTE9BRChpMTcgKyAxID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSA8PCAxNiB8IChTQUZFX0hFQVBfTE9BRChpMTcgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIDw8IDI0IHwgKFNBRkVfSEVBUF9MT0FEKGkxNyArIDIgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTE3ICsgMyA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkgfCAwLCA0KTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSA4KSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyAoaTEgPDwgMikgfCAwLCBTQUZFX0hFQVBfTE9BRChpMTggKyAoaTEgPDwgMikgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBpNSA9IChTQUZFX0hFQVBfTE9BRChpMTggKyAzMiB8IDAsIDQsIDApIHwgMCkgXiA2MDgxMzU4MTY7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyAzMiB8IDAsIGk1IHwgMCwgNCk7CiBpMiA9IChTQUZFX0hFQVBfTE9BRChpMTggKyAzNiB8IDAsIDQsIDApIHwgMCkgXiAtMjA1MjkxMjk0MTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDM2IHwgMCwgaTIgfCAwLCA0KTsKIGk0ID0gKFNBRkVfSEVBUF9MT0FEKGkxOCArIDQwIHwgMCwgNCwgMCkgfCAwKSBeIDMyMDQ0MDg3ODsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDQwIHwgMCwgaTQgfCAwLCA0KTsKIGk4ID0gKFNBRkVfSEVBUF9MT0FEKGkxOCArIDQ0IHwgMCwgNCwgMCkgfCAwKSBeIDU3NzAxMTg4OwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgNDQgfCAwLCBpOCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgNDggfCAwLCAtMTU0Mjg5OTY3OCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgNTIgfCAwLCA2OTgyOTg4MzIgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDU2IHwgMCwgMTM3Mjk2NTM2IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyA2MCB8IDAsIC0zMzA0MDQ3MjcgfCAwLCA0KTsKIGlmICghKFNBRkVfSEVBUF9MT0FEKGkxOCArIDYwIHwgMCwgNCwgMCkgfCAwKSkgewogIGkxID0gU0FGRV9IRUFQX0xPQUQoaTE4ICsgNDggfCAwLCA0LCAwKSB8IDAgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDQ4IHwgMCwgaTEgXiAtMTU0Mjg5OTY3OCB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDUyIHwgMCwgaTEgXiA2OTgyOTg4MzIgfCAwLCA0KTsKICBpNyA9IFNBRkVfSEVBUF9MT0FEKGkxOCArIDUyIHwgMCwgNCwgMCkgfCAwIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyA1NiB8IDAsIGk3IF4gMTM3Mjk2NTM2IHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgNjAgfCAwLCBpNyBeIC0zMzA0MDQ3MjcgfCAwLCA0KTsKICBpNiA9IGkxIF4gLTE1NDI4OTk2Nzg7CiAgaTEgPSBpMSBeIDY5ODI5ODgzMjsKICBpMyA9IGk3IF4gMTM3Mjk2NTM2OwogIGk3ID0gaTcgXiAtMzMwNDA0NzI3OwogfSBlbHNlIHsKICBpNiA9IC0xNTQyODk5Njc4OwogIGkxID0gNjk4Mjk4ODMyOwogIGkzID0gMTM3Mjk2NTM2OwogIGk3ID0gLTMzMDQwNDcyNzsKIH0KIGkxNSA9IDA7CiBpMTYgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyA2NCArIDIwIHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNyA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDY0ICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTMgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyA2NCArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNCA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDY0ICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTEgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyA2NCArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxMiA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDY0ICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTkgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyA2NCArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxMCA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDY0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMTUgfCAwKSA9PSAxNCkgYnJlYWs7CiAgaTIzID0gU0FGRV9IRUFQX0xPQUQoMjA1OCArIChpMTUgPDwgNCkgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTI2ID0gU0FGRV9IRUFQX0xPQUQoMjA1OCArIChpMTUgPDwgNCkgKyAxID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGkzNiA9ICgoU0FGRV9IRUFQX0xPQUQoMTE1MiArIChpMjYgPDwgMikgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkxOSArIChpMjMgPDwgMikgfCAwLCA0LCAwKSB8IDApKSArIGk5ICsgaTEwIHwgMDsKICBpMjIgPSBpNiBeIGkzNjsKICBpMjAgPSAoaTIyIDw8IDE2IHwgaTIyID4+PiAxNikgKyBpNSB8IDA7CiAgaTI0ID0gaTIwIF4gaTk7CiAgaTI2ID0gKGkyNCA8PCAyMCB8IGkyNCA+Pj4gMTIpICsgaTM2ICsgKChTQUZFX0hFQVBfTE9BRCgxMTUyICsgKGkyMyA8PCAyKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTE5ICsgKGkyNiA8PCAyKSB8IDAsIDQsIDApIHwgMCkpIHwgMDsKICBpMjIgPSAoaTI2IF4gKGkyMiA8PCAxNiB8IGkyMiA+Pj4gMTYpKSA8PCAyNCB8IChpMjYgXiAoaTIyIDw8IDE2IHwgaTIyID4+PiAxNikpID4+PiA4OwogIGkyNCA9IChpMjIgKyBpMjAgXiAoaTI0IDw8IDIwIHwgaTI0ID4+PiAxMikpIDw8IDI1IHwgKGkyMiArIGkyMCBeIChpMjQgPDwgMjAgfCBpMjQgPj4+IDEyKSkgPj4+IDc7CiAgaTIzID0gU0FGRV9IRUFQX0xPQUQoMjA1OCArIChpMTUgPDwgNCkgKyAyID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGkzNiA9IFNBRkVfSEVBUF9MT0FEKDIwNTggKyAoaTE1IDw8IDQpICsgMyA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpMzcgPSAoKFNBRkVfSEVBUF9MT0FEKDExNTIgKyAoaTM2IDw8IDIpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMTkgKyAoaTIzIDw8IDIpIHwgMCwgNCwgMCkgfCAwKSkgKyBpMTYgKyBpMTcgfCAwOwogIGkyMSA9IGkxIF4gaTM3OwogIGkzMyA9IChpMjEgPDwgMTYgfCBpMjEgPj4+IDE2KSArIGkyIHwgMDsKICBpMzUgPSBpMzMgXiBpMTY7CiAgaTM2ID0gKGkzNSA8PCAyMCB8IGkzNSA+Pj4gMTIpICsgaTM3ICsgKChTQUZFX0hFQVBfTE9BRCgxMTUyICsgKGkyMyA8PCAyKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTE5ICsgKGkzNiA8PCAyKSB8IDAsIDQsIDApIHwgMCkpIHwgMDsKICBpMjEgPSAoaTM2IF4gKGkyMSA8PCAxNiB8IGkyMSA+Pj4gMTYpKSA8PCAyNCB8IChpMzYgXiAoaTIxIDw8IDE2IHwgaTIxID4+PiAxNikpID4+PiA4OwogIGkzNSA9IChpMjEgKyBpMzMgXiAoaTM1IDw8IDIwIHwgaTM1ID4+PiAxMikpIDw8IDI1IHwgKGkyMSArIGkzMyBeIChpMzUgPDwgMjAgfCBpMzUgPj4+IDEyKSkgPj4+IDc7CiAgaTIzID0gU0FGRV9IRUFQX0xPQUQoMjA1OCArIChpMTUgPDwgNCkgKyA0ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGkzNyA9IFNBRkVfSEVBUF9MT0FEKDIwNTggKyAoaTE1IDw8IDQpICsgNSA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpMzAgPSAoKFNBRkVfSEVBUF9MT0FEKDExNTIgKyAoaTM3IDw8IDIpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMTkgKyAoaTIzIDw8IDIpIHwgMCwgNCwgMCkgfCAwKSkgKyBpMTMgKyBpMTQgfCAwOwogIGkzNCA9IGkzIF4gaTMwOwogIGkyOSA9IChpMzQgPDwgMTYgfCBpMzQgPj4+IDE2KSArIGk0IHwgMDsKICBpMzIgPSBpMjkgXiBpMTM7CiAgaTM3ID0gKGkzMiA8PCAyMCB8IGkzMiA+Pj4gMTIpICsgaTMwICsgKChTQUZFX0hFQVBfTE9BRCgxMTUyICsgKGkyMyA8PCAyKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTE5ICsgKGkzNyA8PCAyKSB8IDAsIDQsIDApIHwgMCkpIHwgMDsKICBpMzQgPSAoaTM3IF4gKGkzNCA8PCAxNiB8IGkzNCA+Pj4gMTYpKSA8PCAyNCB8IChpMzcgXiAoaTM0IDw8IDE2IHwgaTM0ID4+PiAxNikpID4+PiA4OwogIGkzMiA9IChpMzQgKyBpMjkgXiAoaTMyIDw8IDIwIHwgaTMyID4+PiAxMikpIDw8IDI1IHwgKGkzNCArIGkyOSBeIChpMzIgPDwgMjAgfCBpMzIgPj4+IDEyKSkgPj4+IDc7CiAgaTIzID0gU0FGRV9IRUFQX0xPQUQoMjA1OCArIChpMTUgPDwgNCkgKyA2ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGkzMCA9IFNBRkVfSEVBUF9MT0FEKDIwNTggKyAoaTE1IDw8IDQpICsgNyA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpMjcgPSAoKFNBRkVfSEVBUF9MT0FEKDExNTIgKyAoaTMwIDw8IDIpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMTkgKyAoaTIzIDw8IDIpIHwgMCwgNCwgMCkgfCAwKSkgKyBpMTEgKyBpMTIgfCAwOwogIGkzOCA9IGk3IF4gaTI3OwogIGkyNSA9IChpMzggPDwgMTYgfCBpMzggPj4+IDE2KSArIGk4IHwgMDsKICBpMjggPSBpMjUgXiBpMTE7CiAgaTMwID0gKGkyOCA8PCAyMCB8IGkyOCA+Pj4gMTIpICsgaTI3ICsgKChTQUZFX0hFQVBfTE9BRCgxMTUyICsgKGkyMyA8PCAyKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTE5ICsgKGkzMCA8PCAyKSB8IDAsIDQsIDApIHwgMCkpIHwgMDsKICBpMzggPSAoaTMwIF4gKGkzOCA8PCAxNiB8IGkzOCA+Pj4gMTYpKSA8PCAyNCB8IChpMzAgXiAoaTM4IDw8IDE2IHwgaTM4ID4+PiAxNikpID4+PiA4OwogIGkyOCA9IChpMzggKyBpMjUgXiAoaTI4IDw8IDIwIHwgaTI4ID4+PiAxMikpIDw8IDI1IHwgKGkzOCArIGkyNSBeIChpMjggPDwgMjAgfCBpMjggPj4+IDEyKSkgPj4+IDc7CiAgaTIzID0gU0FGRV9IRUFQX0xPQUQoMjA1OCArIChpMTUgPDwgNCkgKyAxNCA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpMjcgPSBTQUZFX0hFQVBfTE9BRCgyMDU4ICsgKGkxNSA8PCA0KSArIDE1ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGkzMCA9IGkzMCArIGkyNCArICgoU0FGRV9IRUFQX0xPQUQoMTE1MiArIChpMjcgPDwgMikgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkxOSArIChpMjMgPDwgMikgfCAwLCA0LCAwKSB8IDApKSB8IDA7CiAgaTMzID0gKChpMzAgXiBpMzQpIDw8IDE2IHwgKGkzMCBeIGkzNCkgPj4+IDE2KSArIChpMjEgKyBpMzMpIHwgMDsKICBpMjcgPSAoKFNBRkVfSEVBUF9MT0FEKDExNTIgKyAoaTIzIDw8IDIpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMTkgKyAoaTI3IDw8IDIpIHwgMCwgNCwgMCkgfCAwKSkgKyBpMzAgKyAoKGkzMyBeIGkyNCkgPDwgMjAgfCAoaTMzIF4gaTI0KSA+Pj4gMTIpIHwgMDsKICBpMzAgPSAoaTI3IF4gKChpMzAgXiBpMzQpIDw8IDE2IHwgKGkzMCBeIGkzNCkgPj4+IDE2KSkgPDwgMjQgfCAoaTI3IF4gKChpMzAgXiBpMzQpIDw8IDE2IHwgKGkzMCBeIGkzNCkgPj4+IDE2KSkgPj4+IDg7CiAgaTI0ID0gaTMwICsgaTMzIF4gKChpMzMgXiBpMjQpIDw8IDIwIHwgKGkzMyBeIGkyNCkgPj4+IDEyKTsKICBpMjMgPSBTQUZFX0hFQVBfTE9BRCgyMDU4ICsgKGkxNSA8PCA0KSArIDEyID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGkzMSA9IFNBRkVfSEVBUF9MT0FEKDIwNTggKyAoaTE1IDw8IDQpICsgMTMgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTM3ID0gaTI4ICsgaTM3ICsgKChTQUZFX0hFQVBfTE9BRCgxMTUyICsgKGkzMSA8PCAyKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTE5ICsgKGkyMyA8PCAyKSB8IDAsIDQsIDApIHwgMCkpIHwgMDsKICBpMjAgPSAoKGkzNyBeIGkyMSkgPDwgMTYgfCAoaTM3IF4gaTIxKSA+Pj4gMTYpICsgKGkyMiArIGkyMCkgfCAwOwogIGkzMSA9ICgoU0FGRV9IRUFQX0xPQUQoMTE1MiArIChpMjMgPDwgMikgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkxOSArIChpMzEgPDwgMikgfCAwLCA0LCAwKSB8IDApKSArIGkzNyArICgoaTIwIF4gaTI4KSA8PCAyMCB8IChpMjAgXiBpMjgpID4+PiAxMikgfCAwOwogIGkyMSA9IChpMzEgXiAoKGkzNyBeIGkyMSkgPDwgMTYgfCAoaTM3IF4gaTIxKSA+Pj4gMTYpKSA8PCAyNCB8IChpMzEgXiAoKGkzNyBeIGkyMSkgPDwgMTYgfCAoaTM3IF4gaTIxKSA+Pj4gMTYpKSA+Pj4gODsKICBpMjggPSBpMjEgKyBpMjAgXiAoKGkyMCBeIGkyOCkgPDwgMjAgfCAoaTIwIF4gaTI4KSA+Pj4gMTIpOwogIGkzNyA9IFNBRkVfSEVBUF9MT0FEKDIwNTggKyAoaTE1IDw8IDQpICsgOCA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpMjMgPSBTQUZFX0hFQVBfTE9BRCgyMDU4ICsgKGkxNSA8PCA0KSArIDkgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTI2ID0gaTM1ICsgaTI2ICsgKChTQUZFX0hFQVBfTE9BRCgxMTUyICsgKGkyMyA8PCAyKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTE5ICsgKGkzNyA8PCAyKSB8IDAsIDQsIDApIHwgMCkpIHwgMDsKICBpMjkgPSAoKGkyNiBeIGkzOCkgPDwgMTYgfCAoaTI2IF4gaTM4KSA+Pj4gMTYpICsgKGkzNCArIGkyOSkgfCAwOwogIGkyMyA9ICgoU0FGRV9IRUFQX0xPQUQoMTE1MiArIChpMzcgPDwgMikgfCAwLCA0LCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkxOSArIChpMjMgPDwgMikgfCAwLCA0LCAwKSB8IDApKSArIGkyNiArICgoaTI5IF4gaTM1KSA8PCAyMCB8IChpMjkgXiBpMzUpID4+PiAxMikgfCAwOwogIGkyNiA9IChpMjMgXiAoKGkyNiBeIGkzOCkgPDwgMTYgfCAoaTI2IF4gaTM4KSA+Pj4gMTYpKSA8PCAyNCB8IChpMjMgXiAoKGkyNiBeIGkzOCkgPDwgMTYgfCAoaTI2IF4gaTM4KSA+Pj4gMTYpKSA+Pj4gODsKICBpMzUgPSBpMjYgKyBpMjkgXiAoKGkyOSBeIGkzNSkgPDwgMjAgfCAoaTI5IF4gaTM1KSA+Pj4gMTIpOwogIGkzNyA9IFNBRkVfSEVBUF9MT0FEKDIwNTggKyAoaTE1IDw8IDQpICsgMTAgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDA7CiAgaTM0ID0gU0FGRV9IRUFQX0xPQUQoMjA1OCArIChpMTUgPDwgNCkgKyAxMSA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMDsKICBpMzYgPSBpMzIgKyBpMzYgKyAoKFNBRkVfSEVBUF9MT0FEKDExNTIgKyAoaTM0IDw8IDIpIHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMTkgKyAoaTM3IDw8IDIpIHwgMCwgNCwgMCkgfCAwKSkgfCAwOwogIGkyNSA9ICgoaTM2IF4gaTIyKSA8PCAxNiB8IChpMzYgXiBpMjIpID4+PiAxNikgKyAoaTM4ICsgaTI1KSB8IDA7CiAgaTM0ID0gKChTQUZFX0hFQVBfTE9BRCgxMTUyICsgKGkzNyA8PCAyKSB8IDAsIDQsIDApIHwgMCkgXiAoU0FGRV9IRUFQX0xPQUQoaTE5ICsgKGkzNCA8PCAyKSB8IDAsIDQsIDApIHwgMCkpICsgaTM2ICsgKChpMjUgXiBpMzIpIDw8IDIwIHwgKGkyNSBeIGkzMikgPj4+IDEyKSB8IDA7CiAgaTIyID0gKGkzNCBeICgoaTM2IF4gaTIyKSA8PCAxNiB8IChpMzYgXiBpMjIpID4+PiAxNikpIDw8IDI0IHwgKGkzNCBeICgoaTM2IF4gaTIyKSA8PCAxNiB8IChpMzYgXiBpMjIpID4+PiAxNikpID4+PiA4OwogIGkzMiA9IGkyMiArIGkyNSBeICgoaTI1IF4gaTMyKSA8PCAyMCB8IChpMjUgXiBpMzIpID4+PiAxMik7CiAgaTE1ID0gaTE1ICsgMSB8IDA7CiAgaTE2ID0gaTM1IDw8IDI1IHwgaTM1ID4+PiA3OwogIGkxNyA9IGkzNDsKICBpMSA9IGkyMTsKICBpMiA9IGkzMCArIGkzMyB8IDA7CiAgaTEzID0gaTMyIDw8IDI1IHwgaTMyID4+PiA3OwogIGkxNCA9IGkzMTsKICBpMyA9IGkzMDsKICBpNCA9IGkyNiArIGkyOSB8IDA7CiAgaTExID0gaTI4IDw8IDI1IHwgaTI4ID4+PiA3OwogIGkxMiA9IGkyNzsKICBpNyA9IGkyNjsKICBpOCA9IGkyMiArIGkyNSB8IDA7CiAgaTkgPSBpMjQgPDwgMjUgfCBpMjQgPj4+IDc7CiAgaTEwID0gaTIzOwogIGk2ID0gaTIyOwogIGk1ID0gaTIxICsgaTIwIHwgMDsKIH0KIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDE2IHwgMCwgaTkgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCB8IDAsIGkxMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgNDggfCAwLCBpNiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgMzIgfCAwLCBpNSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgMjAgfCAwLCBpMTYgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDQgfCAwLCBpMTcgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDUyIHwgMCwgaTEgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDM2IHwgMCwgaTIgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDI0IHwgMCwgaTEzIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyA4IHwgMCwgaTE0IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyA1NiB8IDAsIGkzIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyA0MCB8IDAsIGk0IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjQgKyAyOCB8IDAsIGkxMSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDY0ICsgMTIgfCAwLCBpMTIgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDYwIHwgMCwgaTcgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyA2NCArIDQ0IHwgMCwgaTggfCAwLCA0KTsKIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDE2KSBicmVhazsKICBpMzggPSBpMTggKyAoKGkxICYgNykgPDwgMikgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpMzggfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTM4IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMTkgKyA2NCArIChpMSA8PCAyKSB8IDAsIDQsIDApIHwgMCkgfCAwLCA0KTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSA4KSBicmVhazsKICBpMzggPSBpMTggKyAoaTEgPDwgMikgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpMzggfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTM4IHwgMCwgNCwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMTggKyAzMiArICgoaTEgJiAzKSA8PCAyKSB8IDAsIDQsIDApIHwgMCkgfCAwLCA0KTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBTVEFDS1RPUCA9IGkxOTsKIHJldHVybjsKfQoKZnVuY3Rpb24gX2ZyZWUoaTIpIHsKIGkyID0gaTIgfCAwOwogdmFyIGkxID0gMCwgaTMgPSAwLCBpNCA9IDAsIGk1ID0gMCwgaTYgPSAwLCBpNyA9IDAsIGk4ID0gMCwgaTkgPSAwOwogaWYgKCFpMikgcmV0dXJuOwogaTEgPSBTQUZFX0hFQVBfTE9BRCg3MjAgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkzID0gU0FGRV9IRUFQX0xPQUQoaTIgKyAtNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpOSA9IGkyICsgLTggKyAoaTMgJiAtOCkgfCAwOwogZG8gaWYgKCEoaTMgJiAxKSkgewogIGk0ID0gU0FGRV9IRUFQX0xPQUQoaTIgKyAtOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgaWYgKCEoaTMgJiAzKSkgcmV0dXJuOwogIGk3ID0gaTIgKyAtOCArICgwIC0gaTQpIHwgMDsKICBpNiA9IGk0ICsgKGkzICYgLTgpIHwgMDsKICBpZiAoaTcgPj4+IDAgPCBpMSA+Pj4gMCkgcmV0dXJuOwogIGlmICgoU0FGRV9IRUFQX0xPQUQoNzIxICogNCB8IDAsIDQsIDApIHwgMCB8IDApID09IChpNyB8IDApKSB7CiAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTkgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgaWYgKChpMSAmIDMgfCAwKSAhPSAzKSB7CiAgICBpOCA9IGk3OwogICAgaTEgPSBpNjsKICAgIGJyZWFrOwogICB9CiAgIFNBRkVfSEVBUF9TVE9SRSg3MTggKiA0IHwgMCwgaTYgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgNCB8IDAsIGkxICYgLTIgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgNCB8IDAsIGk2IHwgMSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTcgKyBpNiB8IDAsIGk2IHwgMCwgNCk7CiAgIHJldHVybjsKICB9CiAgaWYgKGk0ID4+PiAwIDwgMjU2KSB7CiAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTcgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpNyArIDEyIHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgaWYgKChpMiB8IDApID09IChpMSB8IDApKSB7CiAgICBTQUZFX0hFQVBfU1RPUkUoNzE2ICogNCB8IDAsIChTQUZFX0hFQVBfTE9BRCg3MTYgKiA0IHwgMCwgNCwgMCkgfCAwKSAmIH4oMSA8PCAoaTQgPj4+IDMpKSB8IDAsIDQpOwogICAgaTggPSBpNzsKICAgIGkxID0gaTY7CiAgICBicmVhazsKICAgfSBlbHNlIHsKICAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDEyIHwgMCwgaTIgfCAwLCA0KTsKICAgIFNBRkVfSEVBUF9TVE9SRShpMiArIDggfCAwLCBpMSB8IDAsIDQpOwogICAgaTggPSBpNzsKICAgIGkxID0gaTY7CiAgICBicmVhazsKICAgfQogIH0KICBpNSA9IFNBRkVfSEVBUF9MT0FEKGk3ICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwOwogIGkxID0gU0FGRV9IRUFQX0xPQUQoaTcgKyAxMiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgZG8gaWYgKChpMSB8IDApID09IChpNyB8IDApKSB7CiAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTcgKyAxNiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBpZiAoIWkxKSB7CiAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGk3ICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgaWYgKCFpMSkgewogICAgIGkxID0gMDsKICAgICBicmVhazsKICAgIH0gZWxzZSBpMiA9IGk3ICsgMTYgfCAwOwogICB9IGVsc2UgaTIgPSBpNyArIDE2ICsgNCB8IDA7CiAgIHdoaWxlICgxKSB7CiAgICBpNCA9IGkxICsgMjAgfCAwOwogICAgaTMgPSBTQUZFX0hFQVBfTE9BRChpNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpZiAoIWkzKSB7CiAgICAgaTQgPSBpMSArIDE2IHwgMDsKICAgICBpMyA9IFNBRkVfSEVBUF9MT0FEKGk0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgICBpZiAoIWkzKSBicmVhazsgZWxzZSB7CiAgICAgIGkxID0gaTM7CiAgICAgIGkyID0gaTQ7CiAgICAgfQogICAgfSBlbHNlIHsKICAgICBpMSA9IGkzOwogICAgIGkyID0gaTQ7CiAgICB9CiAgIH0KICAgU0FGRV9IRUFQX1NUT1JFKGkyIHwgMCwgMCB8IDAsIDQpOwogIH0gZWxzZSB7CiAgIGk4ID0gU0FGRV9IRUFQX0xPQUQoaTcgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgMTIgfCAwLCBpMSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTEgKyA4IHwgMCwgaTggfCAwLCA0KTsKICB9IHdoaWxlICgwKTsKICBpZiAoIWk1KSB7CiAgIGk4ID0gaTc7CiAgIGkxID0gaTY7CiAgfSBlbHNlIHsKICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpNyArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgaWYgKChTQUZFX0hFQVBfTE9BRCgzMTY4ICsgKGkyIDw8IDIpIHwgMCwgNCwgMCkgfCAwIHwgMCkgPT0gKGk3IHwgMCkpIHsKICAgIFNBRkVfSEVBUF9TVE9SRSgzMTY4ICsgKGkyIDw8IDIpIHwgMCwgaTEgfCAwLCA0KTsKICAgIGlmICghaTEpIHsKICAgICBTQUZFX0hFQVBfU1RPUkUoNzE3ICogNCB8IDAsIChTQUZFX0hFQVBfTE9BRCg3MTcgKiA0IHwgMCwgNCwgMCkgfCAwKSAmIH4oMSA8PCBpMikgfCAwLCA0KTsKICAgICBpOCA9IGk3OwogICAgIGkxID0gaTY7CiAgICAgYnJlYWs7CiAgICB9CiAgIH0gZWxzZSB7CiAgICBTQUZFX0hFQVBfU1RPUkUoKChTQUZFX0hFQVBfTE9BRChpNSArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMCkgPT0gKGk3IHwgMCkgPyBpNSArIDE2IHwgMCA6IGk1ICsgMjAgfCAwKSB8IDAsIGkxIHwgMCwgNCk7CiAgICBpZiAoIWkxKSB7CiAgICAgaTggPSBpNzsKICAgICBpMSA9IGk2OwogICAgIGJyZWFrOwogICAgfQogICB9CiAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDI0IHwgMCwgaTUgfCAwLCA0KTsKICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpNyArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgaWYgKGkyIHwgMCkgewogICAgU0FGRV9IRUFQX1NUT1JFKGkxICsgMTYgfCAwLCBpMiB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgMjQgfCAwLCBpMSB8IDAsIDQpOwogICB9CiAgIGkyID0gU0FGRV9IRUFQX0xPQUQoaTcgKyAxNiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBpZiAoIWkyKSB7CiAgICBpOCA9IGk3OwogICAgaTEgPSBpNjsKICAgfSBlbHNlIHsKICAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDIwIHwgMCwgaTIgfCAwLCA0KTsKICAgIFNBRkVfSEVBUF9TVE9SRShpMiArIDI0IHwgMCwgaTEgfCAwLCA0KTsKICAgIGk4ID0gaTc7CiAgICBpMSA9IGk2OwogICB9CiAgfQogfSBlbHNlIHsKICBpOCA9IGkyICsgLTggfCAwOwogIGkxID0gaTMgJiAtODsKICBpNyA9IGkyICsgLTggfCAwOwogfSB3aGlsZSAoMCk7CiBpZiAoaTcgPj4+IDAgPj0gaTkgPj4+IDApIHJldHVybjsKIGkzID0gU0FGRV9IRUFQX0xPQUQoaTkgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGlmICghKGkzICYgMSkpIHJldHVybjsKIGlmICghKGkzICYgMikpIHsKICBpZiAoKFNBRkVfSEVBUF9MT0FEKDcyMiAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSA9PSAoaTkgfCAwKSkgewogICBpOSA9IChTQUZFX0hFQVBfTE9BRCg3MTkgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMCkgKyBpMSB8IDA7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MTkgKiA0IHwgMCwgaTkgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDcyMiAqIDQgfCAwLCBpOCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTggKyA0IHwgMCwgaTkgfCAxIHwgMCwgNCk7CiAgIGlmICgoaTggfCAwKSAhPSAoU0FGRV9IRUFQX0xPQUQoNzIxICogNCB8IDAsIDQsIDApIHwgMCB8IDApKSByZXR1cm47CiAgIFNBRkVfSEVBUF9TVE9SRSg3MjEgKiA0IHwgMCwgMCB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoNzE4ICogNCB8IDAsIDAgfCAwLCA0KTsKICAgcmV0dXJuOwogIH0KICBpZiAoKFNBRkVfSEVBUF9MT0FEKDcyMSAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSA9PSAoaTkgfCAwKSkgewogICBpOSA9IChTQUZFX0hFQVBfTE9BRCg3MTggKiA0IHwgMCwgNCwgMCkgfCAwIHwgMCkgKyBpMSB8IDA7CiAgIFNBRkVfSEVBUF9TVE9SRSg3MTggKiA0IHwgMCwgaTkgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKDcyMSAqIDQgfCAwLCBpNyB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTggKyA0IHwgMCwgaTkgfCAxIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpNyArIGk5IHwgMCwgaTkgfCAwLCA0KTsKICAgcmV0dXJuOwogIH0KICBpNSA9IChpMyAmIC04KSArIGkxIHwgMDsKICBkbyBpZiAoaTMgPj4+IDAgPCAyNTYpIHsKICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpOSArIDggfCAwLCA0LCAwKSB8IDAgfCAwOwogICBpMSA9IFNBRkVfSEVBUF9MT0FEKGk5ICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBpZiAoKGkxIHwgMCkgPT0gKGkyIHwgMCkpIHsKICAgIFNBRkVfSEVBUF9TVE9SRSg3MTYgKiA0IHwgMCwgKFNBRkVfSEVBUF9MT0FEKDcxNiAqIDQgfCAwLCA0LCAwKSB8IDApICYgfigxIDw8IChpMyA+Pj4gMykpIHwgMCwgNCk7CiAgICBicmVhazsKICAgfSBlbHNlIHsKICAgIFNBRkVfSEVBUF9TVE9SRShpMiArIDEyIHwgMCwgaTEgfCAwLCA0KTsKICAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDggfCAwLCBpMiB8IDAsIDQpOwogICAgYnJlYWs7CiAgIH0KICB9IGVsc2UgewogICBpNiA9IFNBRkVfSEVBUF9MT0FEKGk5ICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBpMSA9IFNBRkVfSEVBUF9MT0FEKGk5ICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwOwogICBkbyBpZiAoKGkxIHwgMCkgPT0gKGk5IHwgMCkpIHsKICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTkgKyAxNiArIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgaWYgKCFpMSkgewogICAgIGkxID0gU0FGRV9IRUFQX0xPQUQoaTkgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgaWYgKCFpMSkgewogICAgICBpMiA9IDA7CiAgICAgIGJyZWFrOwogICAgIH0gZWxzZSBpMiA9IGk5ICsgMTYgfCAwOwogICAgfSBlbHNlIGkyID0gaTkgKyAxNiArIDQgfCAwOwogICAgd2hpbGUgKDEpIHsKICAgICBpNCA9IGkxICsgMjAgfCAwOwogICAgIGkzID0gU0FGRV9IRUFQX0xPQUQoaTQgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgIGlmICghaTMpIHsKICAgICAgaTQgPSBpMSArIDE2IHwgMDsKICAgICAgaTMgPSBTQUZFX0hFQVBfTE9BRChpNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICAgIGlmICghaTMpIGJyZWFrOyBlbHNlIHsKICAgICAgIGkxID0gaTM7CiAgICAgICBpMiA9IGk0OwogICAgICB9CiAgICAgfSBlbHNlIHsKICAgICAgaTEgPSBpMzsKICAgICAgaTIgPSBpNDsKICAgICB9CiAgICB9CiAgICBTQUZFX0hFQVBfU1RPUkUoaTIgfCAwLCAwIHwgMCwgNCk7CiAgICBpMiA9IGkxOwogICB9IGVsc2UgewogICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpOSArIDggfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgMTIgfCAwLCBpMSB8IDAsIDQpOwogICAgU0FGRV9IRUFQX1NUT1JFKGkxICsgOCB8IDAsIGkyIHwgMCwgNCk7CiAgICBpMiA9IGkxOwogICB9IHdoaWxlICgwKTsKICAgaWYgKGk2IHwgMCkgewogICAgaTEgPSBTQUZFX0hFQVBfTE9BRChpOSArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgIGlmICgoU0FGRV9IRUFQX0xPQUQoMzE2OCArIChpMSA8PCAyKSB8IDAsIDQsIDApIHwgMCB8IDApID09IChpOSB8IDApKSB7CiAgICAgU0FGRV9IRUFQX1NUT1JFKDMxNjggKyAoaTEgPDwgMikgfCAwLCBpMiB8IDAsIDQpOwogICAgIGlmICghaTIpIHsKICAgICAgU0FGRV9IRUFQX1NUT1JFKDcxNyAqIDQgfCAwLCAoU0FGRV9IRUFQX0xPQUQoNzE3ICogNCB8IDAsIDQsIDApIHwgMCkgJiB+KDEgPDwgaTEpIHwgMCwgNCk7CiAgICAgIGJyZWFrOwogICAgIH0KICAgIH0gZWxzZSB7CiAgICAgU0FGRV9IRUFQX1NUT1JFKCgoU0FGRV9IRUFQX0xPQUQoaTYgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDApID09IChpOSB8IDApID8gaTYgKyAxNiB8IDAgOiBpNiArIDIwIHwgMCkgfCAwLCBpMiB8IDAsIDQpOwogICAgIGlmICghaTIpIGJyZWFrOwogICAgfQogICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgMjQgfCAwLCBpNiB8IDAsIDQpOwogICAgaTEgPSBTQUZFX0hFQVBfTE9BRChpOSArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgIGlmIChpMSB8IDApIHsKICAgICBTQUZFX0hFQVBfU1RPUkUoaTIgKyAxNiB8IDAsIGkxIHwgMCwgNCk7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGkxICsgMjQgfCAwLCBpMiB8IDAsIDQpOwogICAgfQogICAgaTEgPSBTQUZFX0hFQVBfTE9BRChpOSArIDE2ICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpZiAoaTEgfCAwKSB7CiAgICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgMjAgfCAwLCBpMSB8IDAsIDQpOwogICAgIFNBRkVfSEVBUF9TVE9SRShpMSArIDI0IHwgMCwgaTIgfCAwLCA0KTsKICAgIH0KICAgfQogIH0gd2hpbGUgKDApOwogIFNBRkVfSEVBUF9TVE9SRShpOCArIDQgfCAwLCBpNSB8IDEgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTcgKyBpNSB8IDAsIGk1IHwgMCwgNCk7CiAgaWYgKChpOCB8IDApID09IChTQUZFX0hFQVBfTE9BRCg3MjEgKiA0IHwgMCwgNCwgMCkgfCAwIHwgMCkpIHsKICAgU0FGRV9IRUFQX1NUT1JFKDcxOCAqIDQgfCAwLCBpNSB8IDAsIDQpOwogICByZXR1cm47CiAgfQogfSBlbHNlIHsKICBTQUZFX0hFQVBfU1RPUkUoaTkgKyA0IHwgMCwgaTMgJiAtMiB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpOCArIDQgfCAwLCBpMSB8IDEgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTcgKyBpMSB8IDAsIGkxIHwgMCwgNCk7CiAgaTUgPSBpMTsKIH0KIGkzID0gaTUgPj4+IDM7CiBpZiAoaTUgPj4+IDAgPCAyNTYpIHsKICBpMSA9IFNBRkVfSEVBUF9MT0FEKDcxNiAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogIGlmICghKGkxICYgMSA8PCBpMykpIHsKICAgU0FGRV9IRUFQX1NUT1JFKDcxNiAqIDQgfCAwLCBpMSB8IDEgPDwgaTMgfCAwLCA0KTsKICAgaTEgPSAyOTA0ICsgKGkzIDw8IDEgPDwgMikgfCAwOwogICBpMiA9IDI5MDQgKyAoaTMgPDwgMSA8PCAyKSArIDggfCAwOwogIH0gZWxzZSB7CiAgIGkxID0gU0FGRV9IRUFQX0xPQUQoMjkwNCArIChpMyA8PCAxIDw8IDIpICsgOCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgIGkyID0gMjkwNCArIChpMyA8PCAxIDw8IDIpICsgOCB8IDA7CiAgfQogIFNBRkVfSEVBUF9TVE9SRShpMiB8IDAsIGk4IHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxICsgMTIgfCAwLCBpOCB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpOCArIDggfCAwLCBpMSB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpOCArIDEyIHwgMCwgMjkwNCArIChpMyA8PCAxIDw8IDIpIHwgMCwgNCk7CiAgcmV0dXJuOwogfQogaTEgPSBpNSA+Pj4gODsKIGlmICghaTEpIGk0ID0gMDsgZWxzZSBpZiAoaTUgPj4+IDAgPiAxNjc3NzIxNSkgaTQgPSAzMTsgZWxzZSB7CiAgaTQgPSBpMSA8PCAoKGkxICsgMTA0ODMyMCB8IDApID4+PiAxNiAmIDgpIDw8ICgoKGkxIDw8ICgoaTEgKyAxMDQ4MzIwIHwgMCkgPj4+IDE2ICYgOCkpICsgNTIwMTkyIHwgMCkgPj4+IDE2ICYgNCk7CiAgaTQgPSAxNCAtICgoKGkxIDw8ICgoaTEgKyAxMDQ4MzIwIHwgMCkgPj4+IDE2ICYgOCkpICsgNTIwMTkyIHwgMCkgPj4+IDE2ICYgNCB8IChpMSArIDEwNDgzMjAgfCAwKSA+Pj4gMTYgJiA4IHwgKGk0ICsgMjQ1NzYwIHwgMCkgPj4+IDE2ICYgMikgKyAoaTQgPDwgKChpNCArIDI0NTc2MCB8IDApID4+PiAxNiAmIDIpID4+PiAxNSkgfCAwOwogIGk0ID0gaTUgPj4+IChpNCArIDcgfCAwKSAmIDEgfCBpNCA8PCAxOwogfQogaTEgPSAzMTY4ICsgKGk0IDw8IDIpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpOCArIDI4IHwgMCwgaTQgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpOCArIDIwIHwgMCwgMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGk4ICsgMTYgfCAwLCAwIHwgMCwgNCk7CiBpMiA9IFNBRkVfSEVBUF9MT0FEKDcxNyAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTMgPSAxIDw8IGk0OwogTDExMiA6IGRvIGlmICghKGkyICYgaTMpKSB7CiAgU0FGRV9IRUFQX1NUT1JFKDcxNyAqIDQgfCAwLCBpMiB8IGkzIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxIHwgMCwgaTggfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTggKyAyNCB8IDAsIGkxIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgMTIgfCAwLCBpOCB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpOCArIDggfCAwLCBpOCB8IDAsIDQpOwogfSBlbHNlIHsKICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkxIHwgMCwgNCwgMCkgfCAwIHwgMDsKICBMMTE1IDogZG8gaWYgKCgoU0FGRV9IRUFQX0xPQUQoaTEgKyA0IHwgMCwgNCwgMCkgfCAwKSAmIC04IHwgMCkgIT0gKGk1IHwgMCkpIHsKICAgaTQgPSBpNSA8PCAoKGk0IHwgMCkgPT0gMzEgPyAwIDogMjUgLSAoaTQgPj4+IDEpIHwgMCk7CiAgIHdoaWxlICgxKSB7CiAgICBpMyA9IGkxICsgMTYgKyAoaTQgPj4+IDMxIDw8IDIpIHwgMDsKICAgIGkyID0gU0FGRV9IRUFQX0xPQUQoaTMgfCAwLCA0LCAwKSB8IDAgfCAwOwogICAgaWYgKCFpMikgYnJlYWs7CiAgICBpZiAoKChTQUZFX0hFQVBfTE9BRChpMiArIDQgfCAwLCA0LCAwKSB8IDApICYgLTggfCAwKSA9PSAoaTUgfCAwKSkgewogICAgIGkxID0gaTI7CiAgICAgYnJlYWsgTDExNTsKICAgIH0gZWxzZSB7CiAgICAgaTQgPSBpNCA8PCAxOwogICAgIGkxID0gaTI7CiAgICB9CiAgIH0KICAgU0FGRV9IRUFQX1NUT1JFKGkzIHwgMCwgaTggfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgMjQgfCAwLCBpMSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTggKyAxMiB8IDAsIGk4IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpOCArIDggfCAwLCBpOCB8IDAsIDQpOwogICBicmVhayBMMTEyOwogIH0gd2hpbGUgKDApOwogIGk3ID0gaTEgKyA4IHwgMDsKICBpOSA9IFNBRkVfSEVBUF9MT0FEKGk3IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTkgKyAxMiB8IDAsIGk4IHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGk3IHwgMCwgaTggfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTggKyA4IHwgMCwgaTkgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTggKyAxMiB8IDAsIGkxIHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgMjQgfCAwLCAwIHwgMCwgNCk7CiB9IHdoaWxlICgwKTsKIGk5ID0gKFNBRkVfSEVBUF9MT0FEKDcyNCAqIDQgfCAwLCA0LCAwKSB8IDAgfCAwKSArIC0xIHwgMDsKIFNBRkVfSEVBUF9TVE9SRSg3MjQgKiA0IHwgMCwgaTkgfCAwLCA0KTsKIGlmIChpOSB8IDApIHJldHVybjsKIGkxID0gMzMyMDsKIHdoaWxlICgxKSB7CiAgaTEgPSBTQUZFX0hFQVBfTE9BRChpMSB8IDAsIDQsIDApIHwgMCB8IDA7CiAgaWYgKCFpMSkgYnJlYWs7IGVsc2UgaTEgPSBpMSArIDggfCAwOwogfQogU0FGRV9IRUFQX1NUT1JFKDcyNCAqIDQgfCAwLCAtMSB8IDAsIDQpOwogcmV0dXJuOwp9CgpmdW5jdGlvbiBfc2Fsc2EyMF93b3JkdG9ieXRlKGkxOSwgaTE4KSB7CiBpMTkgPSBpMTkgfCAwOwogaTE4ID0gaTE4IHwgMDsKIHZhciBpMSA9IDAsIGkyID0gMCwgaTMgPSAwLCBpNCA9IDAsIGk1ID0gMCwgaTYgPSAwLCBpNyA9IDAsIGk4ID0gMCwgaTkgPSAwLCBpMTAgPSAwLCBpMTEgPSAwLCBpMTIgPSAwLCBpMTMgPSAwLCBpMTQgPSAwLCBpMTUgPSAwLCBpMTYgPSAwLCBpMTcgPSAwLCBpMjAgPSAwLCBpMjEgPSAwLCBpMjIgPSAwLCBpMjMgPSAwLCBpMjQgPSAwLCBpMjUgPSAwLCBpMjYgPSAwLCBpMjcgPSAwLCBpMjggPSAwLCBpMjkgPSAwLCBpMzAgPSAwLCBpMzEgPSAwLCBpMzIgPSAwLCBpMzMgPSAwLCBpMzQgPSAwLCBpMzUgPSAwLCBpMzYgPSAwLCBpMzcgPSAwLCBpMzggPSAwLCBpMzkgPSAwLCBpNDAgPSAwLCBpNDEgPSAwOwogaTIwID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgNjQgfCAwOwogaWYgKChTVEFDS1RPUCB8IDApID49IChTVEFDS19NQVggfCAwKSkgYWJvcnRTdGFja092ZXJmbG93KDY0KTsKIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDE2KSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTIwICsgKGkxIDw8IDIpIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTE4ICsgKGkxIDw8IDIpIHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogaTEgPSAxMjsKIGkyID0gU0FGRV9IRUFQX0xPQUQoaTIwICsgNDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTMgPSBTQUZFX0hFQVBfTE9BRChpMjAgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTQgPSBTQUZFX0hFQVBfTE9BRChpMjAgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpNSA9IFNBRkVfSEVBUF9MT0FEKGkyMCArIDQ4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGk2ID0gU0FGRV9IRUFQX0xPQUQoaTIwICsgMzIgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTcgPSBTQUZFX0hFQVBfTE9BRChpMjAgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGk4ID0gU0FGRV9IRUFQX0xPQUQoaTIwICsgMjAgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTkgPSBTQUZFX0hFQVBfTE9BRChpMjAgKyA1MiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTAgPSBTQUZFX0hFQVBfTE9BRChpMjAgKyAzNiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTEgPSBTQUZFX0hFQVBfTE9BRChpMjAgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxMiA9IFNBRkVfSEVBUF9MT0FEKGkyMCArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxMyA9IFNBRkVfSEVBUF9MT0FEKGkyMCArIDU2IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNCA9IFNBRkVfSEVBUF9MT0FEKGkyMCArIDQwIHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNSA9IFNBRkVfSEVBUF9MT0FEKGkyMCArIDEyIHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNiA9IFNBRkVfSEVBUF9MT0FEKGkyMCArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNyA9IFNBRkVfSEVBUF9MT0FEKGkyMCArIDYwIHwgMCwgNCwgMCkgfCAwIHwgMDsKIHdoaWxlICgxKSB7CiAgaWYgKCFpMSkgYnJlYWs7CiAgaTM2ID0gaTQgKyBpMyB8IDA7CiAgaTM5ID0gaTUgXiBpMzY7CiAgaTIzID0gKGkzOSA8PCAxNiB8IGkzOSA+Pj4gMTYpICsgaTYgfCAwOwogIGkzNSA9IGkyMyBeIGk0OwogIGkzOSA9IChpMzUgPDwgMTIgfCBpMzUgPj4+IDIwKSArIGkzNiBeIChpMzkgPDwgMTYgfCBpMzkgPj4+IDE2KTsKICBpMjUgPSAoaTM5IDw8IDggfCBpMzkgPj4+IDI0KSArIGkyMyBeIChpMzUgPDwgMTIgfCBpMzUgPj4+IDIwKTsKICBpMzQgPSBpOCArIGk3IHwgMDsKICBpMzcgPSBpOSBeIGkzNDsKICBpMzEgPSAoaTM3IDw8IDE2IHwgaTM3ID4+PiAxNikgKyBpMTAgfCAwOwogIGkyOSA9IGkzMSBeIGk4OwogIGkzNyA9IChpMjkgPDwgMTIgfCBpMjkgPj4+IDIwKSArIGkzNCBeIChpMzcgPDwgMTYgfCBpMzcgPj4+IDE2KTsKICBpMzMgPSAoaTM3IDw8IDggfCBpMzcgPj4+IDI0KSArIGkzMSBeIChpMjkgPDwgMTIgfCBpMjkgPj4+IDIwKTsKICBpMzAgPSBpMTIgKyBpMTEgfCAwOwogIGkzOCA9IGkxMyBeIGkzMDsKICBpMjYgPSAoaTM4IDw8IDE2IHwgaTM4ID4+PiAxNikgKyBpMTQgfCAwOwogIGk0MCA9IGkyNiBeIGkxMjsKICBpMzggPSAoaTQwIDw8IDEyIHwgaTQwID4+PiAyMCkgKyBpMzAgXiAoaTM4IDw8IDE2IHwgaTM4ID4+PiAxNik7CiAgaTI4ID0gKGkzOCA8PCA4IHwgaTM4ID4+PiAyNCkgKyBpMjYgXiAoaTQwIDw8IDEyIHwgaTQwID4+PiAyMCk7CiAgaTI0ID0gaTE2ICsgaTE1IHwgMDsKICBpNDEgPSBpMTcgXiBpMjQ7CiAgaTMyID0gKGk0MSA8PCAxNiB8IGk0MSA+Pj4gMTYpICsgaTIgfCAwOwogIGkyNyA9IGkzMiBeIGkxNjsKICBpNDEgPSAoaTI3IDw8IDEyIHwgaTI3ID4+PiAyMCkgKyBpMjQgXiAoaTQxIDw8IDE2IHwgaTQxID4+PiAxNik7CiAgaTIyID0gKGk0MSA8PCA4IHwgaTQxID4+PiAyNCkgKyBpMzIgXiAoaTI3IDw8IDEyIHwgaTI3ID4+PiAyMCk7CiAgaTM2ID0gKGkzMyA8PCA3IHwgaTMzID4+PiAyNSkgKyAoKGkzNSA8PCAxMiB8IGkzNSA+Pj4gMjApICsgaTM2KSB8IDA7CiAgaTM1ID0gKChpNDEgPDwgOCB8IGk0MSA+Pj4gMjQpIF4gaTM2KSA8PCAxNiB8ICgoaTQxIDw8IDggfCBpNDEgPj4+IDI0KSBeIGkzNikgPj4+IDE2OwogIGkzMyA9IGkzNSArICgoaTM4IDw8IDggfCBpMzggPj4+IDI0KSArIGkyNikgXiAoaTMzIDw8IDcgfCBpMzMgPj4+IDI1KTsKICBpMjEgPSAoKGkzMyA8PCAxMiB8IGkzMyA+Pj4gMjApICsgaTM2IF4gaTM1KSA8PCA4IHwgKChpMzMgPDwgMTIgfCBpMzMgPj4+IDIwKSArIGkzNiBeIGkzNSkgPj4+IDI0OwogIGkyNiA9IGkyMSArIChpMzUgKyAoKGkzOCA8PCA4IHwgaTM4ID4+PiAyNCkgKyBpMjYpKSB8IDA7CiAgaTM0ID0gKGkyOCA8PCA3IHwgaTI4ID4+PiAyNSkgKyAoKGkyOSA8PCAxMiB8IGkyOSA+Pj4gMjApICsgaTM0KSB8IDA7CiAgaTI5ID0gKGkzNCBeIChpMzkgPDwgOCB8IGkzOSA+Pj4gMjQpKSA8PCAxNiB8IChpMzQgXiAoaTM5IDw8IDggfCBpMzkgPj4+IDI0KSkgPj4+IDE2OwogIGkyOCA9IChpNDEgPDwgOCB8IGk0MSA+Pj4gMjQpICsgaTMyICsgaTI5IF4gKGkyOCA8PCA3IHwgaTI4ID4+PiAyNSk7CiAgaTM1ID0gKChpMjggPDwgMTIgfCBpMjggPj4+IDIwKSArIGkzNCBeIGkyOSkgPDwgOCB8ICgoaTI4IDw8IDEyIHwgaTI4ID4+PiAyMCkgKyBpMzQgXiBpMjkpID4+PiAyNDsKICBpMjkgPSBpMzUgKyAoKGk0MSA8PCA4IHwgaTQxID4+PiAyNCkgKyBpMzIgKyBpMjkpIHwgMDsKICBpMzAgPSAoaTIyIDw8IDcgfCBpMjIgPj4+IDI1KSArICgoaTQwIDw8IDEyIHwgaTQwID4+PiAyMCkgKyBpMzApIHwgMDsKICBpNDAgPSAoaTMwIF4gKGkzNyA8PCA4IHwgaTM3ID4+PiAyNCkpIDw8IDE2IHwgKGkzMCBeIChpMzcgPDwgOCB8IGkzNyA+Pj4gMjQpKSA+Pj4gMTY7CiAgaTIyID0gaTQwICsgKChpMzkgPDwgOCB8IGkzOSA+Pj4gMjQpICsgaTIzKSBeIChpMjIgPDwgNyB8IGkyMiA+Pj4gMjUpOwogIGkzMiA9ICgoaTIyIDw8IDEyIHwgaTIyID4+PiAyMCkgKyBpMzAgXiBpNDApIDw8IDggfCAoKGkyMiA8PCAxMiB8IGkyMiA+Pj4gMjApICsgaTMwIF4gaTQwKSA+Pj4gMjQ7CiAgaTIzID0gaTMyICsgKGk0MCArICgoaTM5IDw8IDggfCBpMzkgPj4+IDI0KSArIGkyMykpIHwgMDsKICBpMjQgPSAoaTI3IDw8IDEyIHwgaTI3ID4+PiAyMCkgKyBpMjQgKyAoaTI1IDw8IDcgfCBpMjUgPj4+IDI1KSB8IDA7CiAgaTM4ID0gKGkyNCBeIChpMzggPDwgOCB8IGkzOCA+Pj4gMjQpKSA8PCAxNiB8IChpMjQgXiAoaTM4IDw8IDggfCBpMzggPj4+IDI0KSkgPj4+IDE2OwogIGkyNSA9IGkzOCArICgoaTM3IDw8IDggfCBpMzcgPj4+IDI0KSArIGkzMSkgXiAoaTI1IDw8IDcgfCBpMjUgPj4+IDI1KTsKICBpMjcgPSAoKGkyNSA8PCAxMiB8IGkyNSA+Pj4gMjApICsgaTI0IF4gaTM4KSA8PCA4IHwgKChpMjUgPDwgMTIgfCBpMjUgPj4+IDIwKSArIGkyNCBeIGkzOCkgPj4+IDI0OwogIGkzMSA9IGkyNyArIChpMzggKyAoKGkzNyA8PCA4IHwgaTM3ID4+PiAyNCkgKyBpMzEpKSB8IDA7CiAgaTEgPSBpMSArIC0yIHwgMDsKICBpMiA9IGkyOTsKICBpMyA9IChpMzMgPDwgMTIgfCBpMzMgPj4+IDIwKSArIGkzNiB8IDA7CiAgaTQgPSAoaTMxIF4gKGkyNSA8PCAxMiB8IGkyNSA+Pj4gMjApKSA8PCA3IHwgKGkzMSBeIChpMjUgPDwgMTIgfCBpMjUgPj4+IDIwKSkgPj4+IDI1OwogIGk1ID0gaTM1OwogIGk2ID0gaTIzOwogIGk3ID0gKGkyOCA8PCAxMiB8IGkyOCA+Pj4gMjApICsgaTM0IHwgMDsKICBpOCA9IChpMjYgXiAoaTMzIDw8IDEyIHwgaTMzID4+PiAyMCkpIDw8IDcgfCAoaTI2IF4gKGkzMyA8PCAxMiB8IGkzMyA+Pj4gMjApKSA+Pj4gMjU7CiAgaTkgPSBpMzI7CiAgaTEwID0gaTMxOwogIGkxMSA9IChpMjIgPDwgMTIgfCBpMjIgPj4+IDIwKSArIGkzMCB8IDA7CiAgaTEyID0gKGkyOSBeIChpMjggPDwgMTIgfCBpMjggPj4+IDIwKSkgPDwgNyB8IChpMjkgXiAoaTI4IDw8IDEyIHwgaTI4ID4+PiAyMCkpID4+PiAyNTsKICBpMTMgPSBpMjc7CiAgaTE0ID0gaTI2OwogIGkxNSA9IChpMjUgPDwgMTIgfCBpMjUgPj4+IDIwKSArIGkyNCB8IDA7CiAgaTE2ID0gKGkyMyBeIChpMjIgPDwgMTIgfCBpMjIgPj4+IDIwKSkgPDwgNyB8IChpMjMgXiAoaTIyIDw8IDEyIHwgaTIyID4+PiAyMCkpID4+PiAyNTsKICBpMTcgPSBpMjE7CiB9CiBTQUZFX0hFQVBfU1RPUkUoaTIwIHwgMCwgaTMgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMjAgKyAxNiB8IDAsIGk0IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTIwICsgNDggfCAwLCBpNSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkyMCArIDMyIHwgMCwgaTYgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMjAgKyA0IHwgMCwgaTcgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMjAgKyAyMCB8IDAsIGk4IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTIwICsgNTIgfCAwLCBpOSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkyMCArIDM2IHwgMCwgaTEwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTIwICsgOCB8IDAsIGkxMSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkyMCArIDI0IHwgMCwgaTEyIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTIwICsgNTYgfCAwLCBpMTMgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMjAgKyA0MCB8IDAsIGkxNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkyMCArIDEyIHwgMCwgaTE1IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTIwICsgMjggfCAwLCBpMTYgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMjAgKyA2MCB8IDAsIGkxNyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkyMCArIDQ0IHwgMCwgaTIgfCAwLCA0KTsKIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDE2KSBicmVhazsKICBpNDEgPSBpMjAgKyAoaTEgPDwgMikgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpNDEgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTE4ICsgKGkxIDw8IDIpIHwgMCwgNCwgMCkgfCAwIHwgMCkgKyAoU0FGRV9IRUFQX0xPQUQoaTQxIHwgMCwgNCwgMCkgfCAwIHwgMCkgfCAwLCA0KTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSAxNikgYnJlYWs7CiAgaTQxID0gU0FGRV9IRUFQX0xPQUQoaTIwICsgKGkxIDw8IDIpIHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpNDAgPSBpMTkgKyAoaTEgPDwgMikgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpNDAgPj4gMCB8IDAsIGk0MSB8IDAsIDEpOwogIFNBRkVfSEVBUF9TVE9SRShpNDAgKyAxID4+IDAgfCAwLCBpNDEgPj4+IDggfCAwLCAxKTsKICBTQUZFX0hFQVBfU1RPUkUoaTQwICsgMiA+PiAwIHwgMCwgaTQxID4+PiAxNiB8IDAsIDEpOwogIFNBRkVfSEVBUF9TVE9SRShpNDAgKyAzID4+IDAgfCAwLCBpNDEgPj4+IDI0IHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogU1RBQ0tUT1AgPSBpMjA7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9jaGFjaGFfcGVybXV0ZShpMTgsIGkyKSB7CiBpMTggPSBpMTggfCAwOwogaTIgPSBpMiB8IDA7CiB2YXIgaTEgPSAwLCBpMyA9IDAsIGk0ID0gMCwgaTUgPSAwLCBpNiA9IDAsIGk3ID0gMCwgaTggPSAwLCBpOSA9IDAsIGkxMCA9IDAsIGkxMSA9IDAsIGkxMiA9IDAsIGkxMyA9IDAsIGkxNCA9IDAsIGkxNSA9IDAsIGkxNiA9IDAsIGkxNyA9IDAsIGkxOSA9IDAsIGkyMCA9IDAsIGkyMSA9IDAsIGkyMiA9IDAsIGkyMyA9IDAsIGkyNCA9IDAsIGkyNSA9IDAsIGkyNiA9IDAsIGkyNyA9IDAsIGkyOCA9IDAsIGkyOSA9IDAsIGkzMCA9IDAsIGkzMSA9IDAsIGkzMiA9IDAsIGkzMyA9IDAsIGkzNCA9IDAsIGkzNSA9IDAsIGkzNiA9IDAsIGkzNyA9IDAsIGkzOCA9IDAsIGkzOSA9IDAsIGk0MCA9IDA7CiBpMTkgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA2NCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coNjQpOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMTYpIGJyZWFrOwogIGkxNyA9IGkxIDw8IDI7CiAgU0FGRV9IRUFQX1NUT1JFKGkxOSArIChpMSA8PCAyKSB8IDAsICgoKFNBRkVfSEVBUF9MT0FEKGkyICsgKGkxNyB8IDMpID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSA8PCA4IHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgKGkxNyB8IDIpID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSkgPDwgOCB8IChTQUZFX0hFQVBfTE9BRChpMiArIChpMTcgfCAxKSA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkpIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyBpMTcgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIHwgMCwgNCk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogaTEgPSAxMjsKIGkyID0gU0FGRV9IRUFQX0xPQUQoaTE5ICsgNDAgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTMgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyAxMiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpNCA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGk1ID0gU0FGRV9IRUFQX0xPQUQoaTE5ICsgNjAgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTYgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyA0NCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpNyA9IFNBRkVfSEVBUF9MT0FEKGkxOSB8IDAsIDQsIDApIHwgMCB8IDA7CiBpOCA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGk5ID0gU0FGRV9IRUFQX0xPQUQoaTE5ICsgNDggfCAwLCA0LCAwKSB8IDAgfCAwOwogaTEwID0gU0FGRV9IRUFQX0xPQUQoaTE5ICsgMzIgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTExID0gU0FGRV9IRUFQX0xPQUQoaTE5ICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTIgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyAyMCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTMgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyA1MiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTQgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyAzNiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMTUgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNiA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkxNyA9IFNBRkVfSEVBUF9MT0FEKGkxOSArIDU2IHwgMCwgNCwgMCkgfCAwIHwgMDsKIHdoaWxlICgxKSB7CiAgaWYgKCFpMSkgYnJlYWs7CiAgaTMzID0gaTggKyBpNyB8IDA7CiAgaTM4ID0gaTkgXiBpMzM7CiAgaTMwID0gKGkzOCA8PCAxNiB8IGkzOCA+Pj4gMTYpICsgaTEwIHwgMDsKICBpMzEgPSBpMzAgXiBpODsKICBpMzggPSAoaTMxIDw8IDEyIHwgaTMxID4+PiAyMCkgKyBpMzMgXiAoaTM4IDw8IDE2IHwgaTM4ID4+PiAxNik7CiAgaTMyID0gKGkzOCA8PCA4IHwgaTM4ID4+PiAyNCkgKyBpMzAgXiAoaTMxIDw8IDEyIHwgaTMxID4+PiAyMCk7CiAgaTI5ID0gaTEyICsgaTExIHwgMDsKICBpMzYgPSBpMTMgXiBpMjk7CiAgaTI1ID0gKGkzNiA8PCAxNiB8IGkzNiA+Pj4gMTYpICsgaTE0IHwgMDsKICBpMjIgPSBpMjUgXiBpMTI7CiAgaTM2ID0gKGkyMiA8PCAxMiB8IGkyMiA+Pj4gMjApICsgaTI5IF4gKGkzNiA8PCAxNiB8IGkzNiA+Pj4gMTYpOwogIGkyNyA9IChpMzYgPDwgOCB8IGkzNiA+Pj4gMjQpICsgaTI1IF4gKGkyMiA8PCAxMiB8IGkyMiA+Pj4gMjApOwogIGkyMyA9IGkxNiArIGkxNSB8IDA7CiAgaTM3ID0gaTE3IF4gaTIzOwogIGkyOCA9IChpMzcgPDwgMTYgfCBpMzcgPj4+IDE2KSArIGkyIHwgMDsKICBpMzkgPSBpMjggXiBpMTY7CiAgaTM3ID0gKGkzOSA8PCAxMiB8IGkzOSA+Pj4gMjApICsgaTIzIF4gKGkzNyA8PCAxNiB8IGkzNyA+Pj4gMTYpOwogIGkyMSA9IChpMzcgPDwgOCB8IGkzNyA+Pj4gMjQpICsgaTI4IF4gKGkzOSA8PCAxMiB8IGkzOSA+Pj4gMjApOwogIGkzNSA9IGk0ICsgaTMgfCAwOwogIGk0MCA9IGk1IF4gaTM1OwogIGkyNiA9IChpNDAgPDwgMTYgfCBpNDAgPj4+IDE2KSArIGk2IHwgMDsKICBpMjAgPSBpMjYgXiBpNDsKICBpNDAgPSAoaTIwIDw8IDEyIHwgaTIwID4+PiAyMCkgKyBpMzUgXiAoaTQwIDw8IDE2IHwgaTQwID4+PiAxNik7CiAgaTI0ID0gKGk0MCA8PCA4IHwgaTQwID4+PiAyNCkgKyBpMjYgXiAoaTIwIDw8IDEyIHwgaTIwID4+PiAyMCk7CiAgaTMzID0gKGkyNyA8PCA3IHwgaTI3ID4+PiAyNSkgKyAoKGkzMSA8PCAxMiB8IGkzMSA+Pj4gMjApICsgaTMzKSB8IDA7CiAgaTMxID0gKChpNDAgPDwgOCB8IGk0MCA+Pj4gMjQpIF4gaTMzKSA8PCAxNiB8ICgoaTQwIDw8IDggfCBpNDAgPj4+IDI0KSBeIGkzMykgPj4+IDE2OwogIGkyNyA9IGkzMSArICgoaTM3IDw8IDggfCBpMzcgPj4+IDI0KSArIGkyOCkgXiAoaTI3IDw8IDcgfCBpMjcgPj4+IDI1KTsKICBpMzQgPSAoKGkyNyA8PCAxMiB8IGkyNyA+Pj4gMjApICsgaTMzIF4gaTMxKSA8PCA4IHwgKChpMjcgPDwgMTIgfCBpMjcgPj4+IDIwKSArIGkzMyBeIGkzMSkgPj4+IDI0OwogIGkyOCA9IGkzNCArIChpMzEgKyAoKGkzNyA8PCA4IHwgaTM3ID4+PiAyNCkgKyBpMjgpKSB8IDA7CiAgaTI5ID0gKGkyMSA8PCA3IHwgaTIxID4+PiAyNSkgKyAoKGkyMiA8PCAxMiB8IGkyMiA+Pj4gMjApICsgaTI5KSB8IDA7CiAgaTIyID0gKGkyOSBeIChpMzggPDwgOCB8IGkzOCA+Pj4gMjQpKSA8PCAxNiB8IChpMjkgXiAoaTM4IDw8IDggfCBpMzggPj4+IDI0KSkgPj4+IDE2OwogIGkyMSA9IChpNDAgPDwgOCB8IGk0MCA+Pj4gMjQpICsgaTI2ICsgaTIyIF4gKGkyMSA8PCA3IHwgaTIxID4+PiAyNSk7CiAgaTMxID0gKChpMjEgPDwgMTIgfCBpMjEgPj4+IDIwKSArIGkyOSBeIGkyMikgPDwgOCB8ICgoaTIxIDw8IDEyIHwgaTIxID4+PiAyMCkgKyBpMjkgXiBpMjIpID4+PiAyNDsKICBpMjIgPSBpMzEgKyAoKGk0MCA8PCA4IHwgaTQwID4+PiAyNCkgKyBpMjYgKyBpMjIpIHwgMDsKICBpMjMgPSAoaTI0IDw8IDcgfCBpMjQgPj4+IDI1KSArICgoaTM5IDw8IDEyIHwgaTM5ID4+PiAyMCkgKyBpMjMpIHwgMDsKICBpMzkgPSAoaTIzIF4gKGkzNiA8PCA4IHwgaTM2ID4+PiAyNCkpIDw8IDE2IHwgKGkyMyBeIChpMzYgPDwgOCB8IGkzNiA+Pj4gMjQpKSA+Pj4gMTY7CiAgaTI0ID0gaTM5ICsgKChpMzggPDwgOCB8IGkzOCA+Pj4gMjQpICsgaTMwKSBeIChpMjQgPDwgNyB8IGkyNCA+Pj4gMjUpOwogIGkyNiA9ICgoaTI0IDw8IDEyIHwgaTI0ID4+PiAyMCkgKyBpMjMgXiBpMzkpIDw8IDggfCAoKGkyNCA8PCAxMiB8IGkyNCA+Pj4gMjApICsgaTIzIF4gaTM5KSA+Pj4gMjQ7CiAgaTMwID0gaTI2ICsgKGkzOSArICgoaTM4IDw8IDggfCBpMzggPj4+IDI0KSArIGkzMCkpIHwgMDsKICBpMzUgPSAoaTIwIDw8IDEyIHwgaTIwID4+PiAyMCkgKyBpMzUgKyAoaTMyIDw8IDcgfCBpMzIgPj4+IDI1KSB8IDA7CiAgaTM3ID0gKGkzNSBeIChpMzcgPDwgOCB8IGkzNyA+Pj4gMjQpKSA8PCAxNiB8IChpMzUgXiAoaTM3IDw8IDggfCBpMzcgPj4+IDI0KSkgPj4+IDE2OwogIGkzMiA9IGkzNyArICgoaTM2IDw8IDggfCBpMzYgPj4+IDI0KSArIGkyNSkgXiAoaTMyIDw8IDcgfCBpMzIgPj4+IDI1KTsKICBpMjAgPSAoKGkzMiA8PCAxMiB8IGkzMiA+Pj4gMjApICsgaTM1IF4gaTM3KSA8PCA4IHwgKChpMzIgPDwgMTIgfCBpMzIgPj4+IDIwKSArIGkzNSBeIGkzNykgPj4+IDI0OwogIGkyNSA9IGkyMCArIChpMzcgKyAoKGkzNiA8PCA4IHwgaTM2ID4+PiAyNCkgKyBpMjUpKSB8IDA7CiAgaTEgPSBpMSArIC0yIHwgMDsKICBpMiA9IGkyODsKICBpMyA9IChpMzIgPDwgMTIgfCBpMzIgPj4+IDIwKSArIGkzNSB8IDA7CiAgaTQgPSAoaTMwIF4gKGkyNCA8PCAxMiB8IGkyNCA+Pj4gMjApKSA8PCA3IHwgKGkzMCBeIChpMjQgPDwgMTIgfCBpMjQgPj4+IDIwKSkgPj4+IDI1OwogIGk1ID0gaTM0OwogIGk2ID0gaTIyOwogIGk3ID0gKGkyNyA8PCAxMiB8IGkyNyA+Pj4gMjApICsgaTMzIHwgMDsKICBpOCA9IChpMjUgXiAoaTMyIDw8IDEyIHwgaTMyID4+PiAyMCkpIDw8IDcgfCAoaTI1IF4gKGkzMiA8PCAxMiB8IGkzMiA+Pj4gMjApKSA+Pj4gMjU7CiAgaTkgPSBpMzE7CiAgaTEwID0gaTMwOwogIGkxMSA9IChpMjEgPDwgMTIgfCBpMjEgPj4+IDIwKSArIGkyOSB8IDA7CiAgaTEyID0gKGkyOCBeIChpMjcgPDwgMTIgfCBpMjcgPj4+IDIwKSkgPDwgNyB8IChpMjggXiAoaTI3IDw8IDEyIHwgaTI3ID4+PiAyMCkpID4+PiAyNTsKICBpMTMgPSBpMjY7CiAgaTE0ID0gaTI1OwogIGkxNSA9IChpMjQgPDwgMTIgfCBpMjQgPj4+IDIwKSArIGkyMyB8IDA7CiAgaTE2ID0gKGkyMiBeIChpMjEgPDwgMTIgfCBpMjEgPj4+IDIwKSkgPDwgNyB8IChpMjIgXiAoaTIxIDw8IDEyIHwgaTIxID4+PiAyMCkpID4+PiAyNTsKICBpMTcgPSBpMjA7CiB9CiBTQUZFX0hFQVBfU1RPUkUoaTE5IHwgMCwgaTcgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyAxNiB8IDAsIGk4IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNDggfCAwLCBpOSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDMyIHwgMCwgaTEwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNCB8IDAsIGkxMSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDIwIHwgMCwgaTEyIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNTIgfCAwLCBpMTMgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyAzNiB8IDAsIGkxNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDggfCAwLCBpMTUgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyAyNCB8IDAsIGkxNiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDU2IHwgMCwgaTE3IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNDAgfCAwLCBpMiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDEyIHwgMCwgaTMgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTkgKyAyOCB8IDAsIGk0IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTE5ICsgNjAgfCAwLCBpNSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxOSArIDQ0IHwgMCwgaTYgfCAwLCA0KTsKIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDE2KSBicmVhazsKICBpNDAgPSBTQUZFX0hFQVBfTE9BRChpMTkgKyAoaTEgPDwgMikgfCAwLCA0LCAwKSB8IDAgfCAwOwogIGkzOSA9IGkxIDw8IDI7CiAgU0FGRV9IRUFQX1NUT1JFKGkxOCArIGkzOSA+PiAwIHwgMCwgaTQwIHwgMCwgMSk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxOCArIChpMzkgfCAxKSA+PiAwIHwgMCwgaTQwID4+PiA4IHwgMCwgMSk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxOCArIChpMzkgfCAyKSA+PiAwIHwgMCwgaTQwID4+PiAxNiB8IDAsIDEpOwogIFNBRkVfSEVBUF9TVE9SRShpMTggKyAoaTM5IHwgMykgPj4gMCB8IDAsIGk0MCA+Pj4gMjQgfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBTVEFDS1RPUCA9IGkxOTsKIHJldHVybjsKfQoKZnVuY3Rpb24gX2NyeXB0b19zaWduX3NwaGluY3MoaTYsIGk4LCBpNywgaTksIGkxMCwgaTMpIHsKIGk2ID0gaTYgfCAwOwogaTggPSBpOCB8IDA7CiBpNyA9IGk3IHwgMDsKIGk5ID0gaTkgfCAwOwogaTEwID0gaTEwIHwgMDsKIGkzID0gaTMgfCAwOwogdmFyIGkxID0gMCwgaTIgPSAwLCBpNCA9IDAsIGk1ID0gMCwgaTExID0gMDsKIGkxMSA9IFNUQUNLVE9QOwogU1RBQ0tUT1AgPSBTVEFDS1RPUCArIDI0MDAgfCAwOwogaWYgKChTVEFDS1RPUCB8IDApID49IChTVEFDS19NQVggfCAwKSkgYWJvcnRTdGFja092ZXJmbG93KDI0MDApOwogaTEgPSAwOwogaTIgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoIShpMSA+Pj4gMCA8IDAgfCAoaTEgfCAwKSA9PSAwICYgaTIgPj4+IDAgPCAxMDg4KSkgYnJlYWs7CiAgU0FGRV9IRUFQX1NUT1JFKGkxMSArIDEyMCArIGkyID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMyArIGkyID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgaTUgPSBfaTY0QWRkKGkyIHwgMCwgaTEgfCAwLCAxLCAwKSB8IDA7CiAgaTEgPSB0ZW1wUmV0MDsKICBpMiA9IGk1OwogfQogaTEgPSBpOTsKIGkyID0gaTEwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMCAmIChpMiB8IDApID09IDApIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpNiArIDQwOTY4ICsgKGkxICsgMzEpID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNyArIChpMSArIC0xKSA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogIGk1ID0gX2k2NEFkZChpMSB8IDAsIGkyIHwgMCwgLTEsIC0xKSB8IDA7CiAgaTEgPSBpNTsKICBpMiA9IHRlbXBSZXQwOwogfQogaTEgPSBpNiArIDQwOTY4IHwgMDsKIGkyID0gaTExICsgMTIwICsgMTA1NiB8IDA7CiBpMyA9IGkxICsgMzIgfCAwOwogZG8gewogIFNBRkVfSEVBUF9TVE9SRShpMSA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTIgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiAgaTIgPSBpMiArIDEgfCAwOwogfSB3aGlsZSAoKGkxIHwgMCkgPCAoaTMgfCAwKSk7CiBpNCA9IF9pNjRBZGQoaTkgfCAwLCBpMTAgfCAwLCAzMiwgMCkgfCAwOwogX2NyeXB0b19oYXNoX2JsYWtlNTEyX3JlZihpMTEgKyAzMiB8IDAsIGk2ICsgNDA5NjggfCAwLCBpNCwgdGVtcFJldDApIHwgMDsKIF96ZXJvYnl0ZXMoaTYgKyA0MDk2OCB8IDAsIDMyLCAwKSB8IDA7CiBpNCA9IFNBRkVfSEVBUF9MT0FEKGkxMSArIDMyIHwgMCwgNCwgMCkgfCAwIHwgMDsKIGk1ID0gKFNBRkVfSEVBUF9MT0FEKGkxMSArIDMyICsgNCB8IDAsIDQsIDApIHwgMCkgJiAyNjg0MzU0NTU7CiBpMSA9IGkxMSArIDIzNjAgfCAwOwogaTIgPSBpMTEgKyAzMiArIDE2IHwgMDsKIGkzID0gaTEgKyAzMiB8IDA7CiBkbyB7CiAgU0FGRV9IRUFQX1NUT1JFKGkxID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMiA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogIGkxID0gaTEgKyAxIHwgMDsKICBpMiA9IGkyICsgMSB8IDA7CiB9IHdoaWxlICgoaTEgfCAwKSA8IChpMyB8IDApKTsKIGkxID0gaTYgKyAzOTkxMiB8IDA7CiBpMiA9IGkxMSArIDMyICsgMTYgfCAwOwogaTMgPSBpMSArIDMyIHwgMDsKIGRvIHsKICBTQUZFX0hFQVBfU1RPUkUoaTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkyID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogIGkyID0gaTIgKyAxIHwgMDsKIH0gd2hpbGUgKChpMSB8IDApIDwgKGkzIHwgMCkpOwogU0FGRV9IRUFQX1NUT1JFKGkxMSB8IDAsIDExIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTExICsgOCB8IDAsIDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTEgKyA4ICsgNCB8IDAsIDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTEgKyAxNiB8IDAsIDAgfCAwLCA0KTsKIF9tZW1jcHkoaTYgKyAzOTk0NCB8IDAsIGkxMSArIDEyMCArIDMyIHwgMCwgMTAyNCkgfCAwOwogX3RyZWVoYXNoKGk2ICsgNDA5NjggfCAwLCBpMTEgKyAxMjAgfCAwLCBpMTEsIGk2ICsgMzk5NDQgfCAwKTsKIGkxID0gX2k2NEFkZChpOSB8IDAsIGkxMCB8IDAsIDEwODgsIDApIHwgMDsKIF9tc2dfaGFzaChpMTEgKyAyMjk2IHwgMCwgaTYgKyAzOTkxMiB8IDAsIGkxLCB0ZW1wUmV0MCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGkxMSArIDk2IHwgMCwgMTIgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTEgKyA5NiArIDE2IHwgMCwgaTQgJiAzMSB8IDAsIDQpOwogaTEgPSBfYml0c2hpZnQ2NExzaHIoaTQgfCAwLCBpNSB8IDAsIDUpIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpMTEgKyA5NiArIDggfCAwLCBpMSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxMSArIDk2ICsgOCArIDQgfCAwLCB0ZW1wUmV0MCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGk4IHwgMCwgMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGk4ICsgNCB8IDAsIDAgfCAwLCA0KTsKIGkxID0gMDsKIGkyID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKCEoaTEgPj4+IDAgPCAwIHwgKGkxIHwgMCkgPT0gMCAmIGkyID4+PiAwIDwgMzIpKSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTYgKyBpMiA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTExICsgMjM2MCArIGkyID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgaTMgPSBfaTY0QWRkKGkyIHwgMCwgaTEgfCAwLCAxLCAwKSB8IDA7CiAgaTEgPSB0ZW1wUmV0MDsKICBpMiA9IGkzOwogfQogaTEgPSBfaTY0QWRkKFNBRkVfSEVBUF9MT0FEKGk4IHwgMCwgNCwgMCkgfCAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTggKyA0IHwgMCwgNCwgMCkgfCAwIHwgMCwgMzIsIDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpOCB8IDAsIGkxIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTggKyA0IHwgMCwgdGVtcFJldDAgfCAwLCA0KTsKIF9tZW1jcHkoaTExICsgMTIwOCB8IDAsIGkxMSArIDEyMCArIDMyIHwgMCwgMTAyNCkgfCAwOwogaTEgPSAwOwogaTIgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoIShpMSA+Pj4gMCA8IDAgfCAoaTEgfCAwKSA9PSAwICYgaTIgPj4+IDAgPCA4KSkgYnJlYWs7CiAgaTMgPSBfYml0c2hpZnQ2NFNobChpMiB8IDAsIGkxIHwgMCwgMykgfCAwOwogIGkzID0gX2JpdHNoaWZ0NjRMc2hyKGk0IHwgMCwgaTUgfCAwLCBpMyB8IDApIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTYgKyAzMiArIGkyID4+IDAgfCAwLCBpMyB8IDAsIDEpOwogIGkzID0gX2k2NEFkZChpMiB8IDAsIGkxIHwgMCwgMSwgMCkgfCAwOwogIGkxID0gdGVtcFJldDA7CiAgaTIgPSBpMzsKIH0KIGkxID0gX2k2NEFkZChTQUZFX0hFQVBfTE9BRChpOCB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk4ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDgsIDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpOCB8IDAsIGkxIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTggKyA0IHwgMCwgdGVtcFJldDAgfCAwLCA0KTsKIF9nZXRfc2VlZChpMTEgKyAyMjMyIHwgMCwgaTExICsgMTIwIHwgMCwgaTExICsgOTYgfCAwKTsKIF9ob3JzdF9zaWduKGk2ICsgNDAgfCAwLCBpMTEgKyAyMjY0IHwgMCwgaTExICsgMjQgfCAwLCBpNywgaTksIGkxMCwgaTExICsgMjIzMiB8IDAsIGkxMSArIDEyMDggfCAwLCBpMTEgKyAyMjk2IHwgMCkgfCAwOwogaTEgPSBTQUZFX0hFQVBfTE9BRChpMTEgKyAyNCB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMiA9IF9pNjRBZGQoU0FGRV9IRUFQX0xPQUQoaTggfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCBpMSB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxMSArIDI0ICsgNCB8IDAsIDQsIDApIHwgMCB8IDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpOCB8IDAsIGkyIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTggKyA0IHwgMCwgdGVtcFJldDAgfCAwLCA0KTsKIGkxID0gaTYgKyA0MCArIGkxIHwgMDsKIGkyID0gMDsKIGkzID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKCEoaTIgPj4+IDAgPCAwIHwgKGkyIHwgMCkgPT0gMCAmIGkzID4+PiAwIDwgMTIpKSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTExICsgOTYgfCAwLCBpMyB8IDAsIDQpOwogIF9nZXRfc2VlZChpMTEgKyAyMjMyIHwgMCwgaTExICsgMTIwIHwgMCwgaTExICsgOTYgfCAwKTsKICBfd290c19zaWduKGkxLCBpMTEgKyAyMjY0IHwgMCwgaTExICsgMjIzMiB8IDAsIGkxMSArIDEyMDggfCAwKTsKICBpNiA9IF9pNjRBZGQoU0FGRV9IRUFQX0xPQUQoaTggfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAyMTQ0LCAwKSB8IDA7CiAgU0FGRV9IRUFQX1NUT1JFKGk4IHwgMCwgaTYgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTggKyA0IHwgMCwgdGVtcFJldDAgfCAwLCA0KTsKICBfY29tcHV0ZV9hdXRocGF0aF93b3RzKGkxMSArIDIyNjQgfCAwLCBpMSArIDIxNDQgfCAwLCBpMTEgKyA5NiB8IDAsIGkxMSArIDEyMCB8IDAsIGkxMSArIDEyMDggfCAwKTsKICBpNiA9IF9pNjRBZGQoU0FGRV9IRUFQX0xPQUQoaTggfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAxNjAsIDApIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTggfCAwLCBpNiB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpOCArIDQgfCAwLCB0ZW1wUmV0MCB8IDAsIDQpOwogIGk2ID0gU0FGRV9IRUFQX0xPQUQoaTExICsgOTYgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMDsKICBpNyA9IFNBRkVfSEVBUF9MT0FEKGkxMSArIDk2ICsgOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpMTEgKyA5NiArIDE2IHwgMCwgaTYgJiAzMSB8IDAsIDQpOwogIGk3ID0gX2JpdHNoaWZ0NjRMc2hyKGk2IHwgMCwgaTcgfCAwLCA1KSB8IDA7CiAgU0FGRV9IRUFQX1NUT1JFKGkxMSArIDk2ICsgOCB8IDAsIGk3IHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxMSArIDk2ICsgOCArIDQgfCAwLCB0ZW1wUmV0MCB8IDAsIDQpOwogIGk3ID0gX2k2NEFkZChpMyB8IDAsIGkyIHwgMCwgMSwgMCkgfCAwOwogIGkxID0gaTEgKyAyMzA0IHwgMDsKICBpMiA9IHRlbXBSZXQwOwogIGkzID0gaTc7CiB9CiBfemVyb2J5dGVzKGkxMSArIDEyMCB8IDAsIDEwODgsIDApIHwgMDsKIGkxMCA9IF9pNjRBZGQoU0FGRV9IRUFQX0xPQUQoaTggfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCBpOSB8IDAsIGkxMCB8IDApIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpOCB8IDAsIGkxMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGk4ICsgNCB8IDAsIHRlbXBSZXQwIHwgMCwgNCk7CiBTVEFDS1RPUCA9IGkxMTsKIHJldHVybiAwOwp9CgpmdW5jdGlvbiBfYmxha2UyNTZfZmluYWwoaTMsIGk0KSB7CiBpMyA9IGkzIHwgMDsKIGk0ID0gaTQgfCAwOwogdmFyIGkxID0gMCwgaTIgPSAwLCBpNSA9IDAsIGk2ID0gMDsKIGk1ID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgMTYgfCAwOwogaWYgKChTVEFDS1RPUCB8IDApID49IChTVEFDS19NQVggfCAwKSkgYWJvcnRTdGFja092ZXJmbG93KDE2KTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDEgPj4gMCB8IDAsIDEgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSA+PiAwIHwgMCwgLTEyNyB8IDAsIDEpOwogaTEgPSBTQUZFX0hFQVBfTE9BRChpMyArIDQ4IHwgMCwgNCwgMCkgfCAwIHwgMDsKIGkyID0gU0FGRV9IRUFQX0xPQUQoaTMgKyA1NiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpNiA9IChTQUZFX0hFQVBfTE9BRChpMyArIDUyIHwgMCwgNCwgMCkgfCAwIHwgMCkgKyAoKGkyICsgaTEgfCAwKSA+Pj4gMCA8IGkyID4+PiAwICYgMSkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgOCA+PiAwIHwgMCwgaTYgPj4+IDI0IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA4ICsgMSA+PiAwIHwgMCwgaTYgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA4ICsgMiA+PiAwIHwgMCwgaTYgPj4+IDggfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDggKyAzID4+IDAgfCAwLCBpNiB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk1ICsgOCArIDQgPj4gMCB8IDAsIChpMiArIGkxIHwgMCkgPj4+IDI0IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA4ICsgNSA+PiAwIHwgMCwgKGkyICsgaTEgfCAwKSA+Pj4gMTYgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNSArIDggKyA2ID4+IDAgfCAwLCAoaTIgKyBpMSB8IDApID4+PiA4IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyA4ICsgNyA+PiAwIHwgMCwgaTIgKyBpMSB8IDAsIDEpOwogaWYgKChpMiB8IDApID09IDQ0MCkgewogIFNBRkVfSEVBUF9TVE9SRShpMyArIDQ4IHwgMCwgaTEgKyAtOCB8IDAsIDQpOwogIF9ibGFrZTI1Nl91cGRhdGUoaTMsIGk1LCA4LCAwKTsKICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkzICsgNDggfCAwLCA0LCAwKSB8IDAgfCAwOwogfSBlbHNlIHsKICBpZiAoKGkyIHwgMCkgPCA0NDApIHsKICAgaWYgKCFpMikgU0FGRV9IRUFQX1NUT1JFKGkzICsgNjAgfCAwLCAxIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDQ4IHwgMCwgaTIgKyBpMSArIC00NDAgfCAwLCA0KTsKICAgX2JsYWtlMjU2X3VwZGF0ZShpMywgMjI4MiwgNDQwIC0gaTIgfCAwLCAoKDQ0MCAtIGkyIHwgMCkgPCAwKSA8PCAzMSA+PiAzMSk7CiAgfSBlbHNlIHsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgNDggfCAwLCBpMiArIGkxICsgLTUxMiB8IDAsIDQpOwogICBfYmxha2UyNTZfdXBkYXRlKGkzLCAyMjgyLCA1MTIgLSBpMiB8IDAsICgoNTEyIC0gaTIgfCAwKSA8IDApIDw8IDMxID4+IDMxKTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgNDggfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgKyA0OCB8IDAsIDQsIDApIHwgMCB8IDApICsgLTQ0MCB8IDAsIDQpOwogICBfYmxha2UyNTZfdXBkYXRlKGkzLCAyMjgzLCA0NDAsIDApOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyA2MCB8IDAsIDEgfCAwLCA0KTsKICB9CiAgX2JsYWtlMjU2X3VwZGF0ZShpMywgaTUgKyAxIHwgMCwgOCwgMCk7CiAgaTEgPSAoU0FGRV9IRUFQX0xPQUQoaTMgKyA0OCB8IDAsIDQsIDApIHwgMCB8IDApICsgLTggfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpMyArIDQ4IHwgMCwgaTEgfCAwLCA0KTsKIH0KIFNBRkVfSEVBUF9TVE9SRShpMyArIDQ4IHwgMCwgaTEgKyAtNjQgfCAwLCA0KTsKIF9ibGFrZTI1Nl91cGRhdGUoaTMsIGk1ICsgOCB8IDAsIDY0LCAwKTsKIFNBRkVfSEVBUF9TVE9SRShpNCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzIHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDI0IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyAxID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMTYgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDIgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyB8IDAsIDQsIDApIHwgMCB8IDApID4+PiA4IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyAzID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMyB8IDAsIDQsIDApIHwgMCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgNCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgNCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgNSA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgNCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAxNiB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgNiA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgNCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiA4IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyA3ID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMyArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDggPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyArIDggfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMjQgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDkgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyArIDggfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gMTYgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDEwID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgKyA4IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDggfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDExID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMyArIDggfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDEyID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgKyAxMiB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMTMgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyArIDEyIHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyAxNCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMTUgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkzICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDE2ID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMTcgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyArIDE2IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyAxOCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMTkgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkzICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDIwID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgKyAyMCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMjEgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyArIDIwIHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyAyMiA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgMjAgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMjMgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkzICsgMjAgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDI0ID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgKyAyNCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMjUgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyArIDI0IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyAyNiA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMjcgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkzICsgMjQgfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNBRkVfSEVBUF9TVE9SRShpNCArIDI4ID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTMgKyAyOCB8IDAsIDQsIDApIHwgMCB8IDApID4+PiAyNCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMjkgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMyArIDI4IHwgMCwgNCwgMCkgfCAwIHwgMCkgPj4+IDE2IHwgMCwgMSk7CiBTQUZFX0hFQVBfU1RPUkUoaTQgKyAzMCA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkzICsgMjggfCAwLCA0LCAwKSB8IDAgfCAwKSA+Pj4gOCB8IDAsIDEpOwogU0FGRV9IRUFQX1NUT1JFKGk0ICsgMzEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkzICsgMjggfCAwLCA0LCAwKSB8IDAgfCAwLCAxKTsKIFNUQUNLVE9QID0gaTU7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9jcnlwdG9fc2lnbl9zcGhpbmNzX29wZW4oaTEwLCBpMTEsIGk0LCBpOCwgaTksIGkzKSB7CiBpMTAgPSBpMTAgfCAwOwogaTExID0gaTExIHwgMDsKIGk0ID0gaTQgfCAwOwogaTggPSBpOCB8IDA7CiBpOSA9IGk5IHwgMDsKIGkzID0gaTMgfCAwOwogdmFyIGkxID0gMCwgaTIgPSAwLCBpNSA9IDAsIGk2ID0gMCwgaTcgPSAwLCBpMTIgPSAwLCBpMTMgPSAwOwogaTEyID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgNDQzNjggfCAwOwogaWYgKChTVEFDS1RPUCB8IDApID49IChTVEFDS19NQVggfCAwKSkgYWJvcnRTdGFja092ZXJmbG93KDQ0MzY4KTsKIGlmIChpOSA+Pj4gMCA8IDAgfCAoaTkgfCAwKSA9PSAwICYgaTggPj4+IDAgPCA0MWUzKSBpMSA9IC0xOyBlbHNlIHsKICBpMSA9IDA7CiAgaTIgPSAwOwogIHdoaWxlICgxKSB7CiAgIGlmICghKGkxID4+PiAwIDwgMCB8IChpMSB8IDApID09IDAgJiBpMiA+Pj4gMCA8IDEwNTYpKSBicmVhazsKICAgU0FGRV9IRUFQX1NUT1JFKGkxMiArIDk2ICsgaTIgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkzICsgaTIgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgaTcgPSBfaTY0QWRkKGkyIHwgMCwgaTEgfCAwLCAxLCAwKSB8IDA7CiAgIGkxID0gdGVtcFJldDA7CiAgIGkyID0gaTc7CiAgfQogIGkxID0gMDsKICBpMiA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKCEoaTEgPj4+IDAgPCAwIHwgKGkxIHwgMCkgPT0gMCAmIGkyID4+PiAwIDwgMzIpKSBicmVhazsKICAgU0FGRV9IRUFQX1NUT1JFKGkxMiArIGkyID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIGkyID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgIGk3ID0gX2k2NEFkZChpMiB8IDAsIGkxIHwgMCwgMSwgMCkgfCAwOwogICBpMSA9IHRlbXBSZXQwOwogICBpMiA9IGk3OwogIH0KICBfbWVtY3B5KGkxMiArIDExNTIgfCAwLCBpNCB8IDAsIDQxZTMpIHwgMDsKICBfbWVtY3B5KGkxMCArIDEwODggfCAwLCBpNCArIDQxZTMgfCAwLCBpOCArIC00MWUzIHwgMCkgfCAwOwogIGkxID0gaTEwOwogIGkyID0gaTEyOwogIGkzID0gaTEgKyAzMiB8IDA7CiAgZG8gewogICBTQUZFX0hFQVBfU1RPUkUoaTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkyID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgIGkxID0gaTEgKyAxIHwgMDsKICAgaTIgPSBpMiArIDEgfCAwOwogIH0gd2hpbGUgKChpMSB8IDApIDwgKGkzIHwgMCkpOwogIF9tZW1jcHkoaTEwICsgMzIgfCAwLCBpMTIgKyA5NiB8IDAsIDEwNTYpIHwgMDsKICBfbXNnX2hhc2goaTEyICsgMzIgfCAwLCBpMTAsIGk4ICsgLTM5OTEyIHwgMCwgKChpOCArIC0zOTkxMiB8IDApIDwgMCkgPDwgMzEgPj4gMzEpIHwgMDsKICBpMSA9IDA7CiAgaTIgPSAwOwogIGk0ID0gMDsKICBpNyA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKCEoaTEgPj4+IDAgPCAwIHwgKGkxIHwgMCkgPT0gMCAmIGkyID4+PiAwIDwgOCkpIGJyZWFrOwogICBpNiA9IFNBRkVfSEVBUF9MT0FEKGkxMiArIDExNTIgKyAzMiArIGkyID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogICBpNSA9IF9iaXRzaGlmdDY0U2hsKGkyIHwgMCwgaTEgfCAwLCAzKSB8IDA7CiAgIGk1ID0gX2JpdHNoaWZ0NjRTaGwoaTYgfCAwLCAwLCBpNSB8IDApIHwgMDsKICAgaTYgPSB0ZW1wUmV0MCBeIGk3OwogICBpMyA9IF9pNjRBZGQoaTIgfCAwLCBpMSB8IDAsIDEsIDApIHwgMDsKICAgaTEgPSB0ZW1wUmV0MDsKICAgaTIgPSBpMzsKICAgaTQgPSBpNSBeIGk0OwogICBpNyA9IGk2OwogIH0KICBpMyA9IF9pNjRBZGQoaTggfCAwLCBpOSB8IDAsIC00MTA2NCwgLTEpIHwgMDsKICBfaG9yc3RfdmVyaWZ5KGkxMiArIDQyMTUyIHwgMCwgaTEyICsgMTE1MiArIDQwIHwgMCwgaTEyICsgMTE1MiArIDQxZTMgfCAwLCBpMywgdGVtcFJldDAsIGkxMiArIDk2IHwgMCwgaTEyICsgMzIgfCAwKSB8IDA7CiAgaTMgPSBpMTIgKyAxMTUyICsgMTMzNTIgfCAwOwogIGk1ID0gMDsKICBpNiA9IDA7CiAgaTIgPSBpNDsKICBpMSA9IGk3OwogIHdoaWxlICgxKSB7CiAgIGlmICghKGk1ID4+PiAwIDwgMCB8IChpNSB8IDApID09IDAgJiBpNiA+Pj4gMCA8IDEyKSkgYnJlYWs7CiAgIF93b3RzX3ZlcmlmeShpMTIgKyA0MjIxNiB8IDAsIGkzLCBpMTIgKyA0MjE1MiB8IDAsIGkxMiArIDk2IHwgMCk7CiAgIF9sX3RyZWUoaTEyICsgNDIxODQgfCAwLCBpMTIgKyA0MjIxNiB8IDAsIGkxMiArIDk2IHwgMCk7CiAgIF92YWxpZGF0ZV9hdXRocGF0aChpMTIgKyA0MjE1MiB8IDAsIGkxMiArIDQyMTg0IHwgMCwgaTIgJiAzMSwgaTMgKyAyMTQ0IHwgMCwgaTEyICsgOTYgfCAwKTsKICAgaTQgPSBfYml0c2hpZnQ2NExzaHIoaTIgfCAwLCBpMSB8IDAsIDUpIHwgMDsKICAgaTcgPSB0ZW1wUmV0MDsKICAgaTEzID0gX2k2NEFkZChpNiB8IDAsIGk1IHwgMCwgMSwgMCkgfCAwOwogICBpMyA9IGkzICsgMjMwNCB8IDA7CiAgIGk1ID0gdGVtcFJldDA7CiAgIGk2ID0gaTEzOwogICBpMiA9IGk0OwogICBpMSA9IGk3OwogIH0KICBpMSA9IF9pNjRBZGQoaTggfCAwLCBpOSB8IDAsIC00MWUzLCAtMSkgfCAwOwogIGk1ID0gdGVtcFJldDA7CiAgaTIgPSAwOwogIGkzID0gMDsKICB3aGlsZSAoMSkgewogICBpZiAoIShpMiA+Pj4gMCA8IDAgfCAoaTIgfCAwKSA9PSAwICYgaTMgPj4+IDAgPCAzMikpIHsKICAgIGkyID0gMTc7CiAgICBicmVhazsKICAgfQogICBpMTMgPSAoU0FGRV9IRUFQX0xPQUQoaTEyICsgNDIxNTIgKyBpMyA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCkgPT0gKFNBRkVfSEVBUF9MT0FEKGkxMiArIDk2ICsgKGkzICsgMTAyNCkgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDApOwogICBpMyA9IF9pNjRBZGQoaTMgfCAwLCBpMiB8IDAsIDEsIDApIHwgMDsKICAgaWYgKCFpMTMpIHsKICAgIGkyID0gMjA7CiAgICBicmVhazsKICAgfSBlbHNlIGkyID0gdGVtcFJldDA7CiAgfQogIEwyMiA6IGRvIGlmICgoaTIgfCAwKSA9PSAxNykgewogICBTQUZFX0hFQVBfU1RPUkUoaTExIHwgMCwgaTEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkxMSArIDQgfCAwLCBpNSB8IDAsIDQpOwogICBpNCA9IDA7CiAgIGkyID0gaTU7CiAgIGkzID0gMDsKICAgd2hpbGUgKDEpIHsKICAgIGlmICghKGk0ID4+PiAwIDwgaTIgPj4+IDAgfCAoaTQgfCAwKSA9PSAoaTIgfCAwKSAmIGkzID4+PiAwIDwgaTEgPj4+IDApKSB7CiAgICAgaTEgPSAwOwogICAgIGJyZWFrIEwyMjsKICAgIH0KICAgIFNBRkVfSEVBUF9TVE9SRShpMTAgKyBpMyA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTEwICsgKGkzICsgMTA4OCkgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgIGkxID0gX2k2NEFkZChpMyB8IDAsIGk0IHwgMCwgMSwgMCkgfCAwOwogICAgaTQgPSB0ZW1wUmV0MDsKICAgIGkyID0gU0FGRV9IRUFQX0xPQUQoaTExICsgNCB8IDAsIDQsIDApIHwgMCB8IDA7CiAgICBpMyA9IGkxOwogICAgaTEgPSBTQUZFX0hFQVBfTE9BRChpMTEgfCAwLCA0LCAwKSB8IDAgfCAwOwogICB9CiAgfSBlbHNlIGlmICgoaTIgfCAwKSA9PSAyMCkgewogICBTQUZFX0hFQVBfU1RPUkUoaTExIHwgMCwgaTEgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkxMSArIDQgfCAwLCBpNSB8IDAsIDQpOwogICBpNCA9IDA7CiAgIGkyID0gaTU7CiAgIGkzID0gMDsKICAgd2hpbGUgKDEpIHsKICAgIGlmICghKGk0ID4+PiAwIDwgaTIgPj4+IDAgfCAoaTQgfCAwKSA9PSAoaTIgfCAwKSAmIGkzID4+PiAwIDwgaTEgPj4+IDApKSBicmVhazsKICAgIFNBRkVfSEVBUF9TVE9SRShpMTAgKyBpMyA+PiAwIHwgMCwgMCB8IDAsIDEpOwogICAgaTEgPSBfaTY0QWRkKGkzIHwgMCwgaTQgfCAwLCAxLCAwKSB8IDA7CiAgICBpNCA9IHRlbXBSZXQwOwogICAgaTIgPSBTQUZFX0hFQVBfTE9BRChpMTEgKyA0IHwgMCwgNCwgMCkgfCAwIHwgMDsKICAgIGkzID0gaTE7CiAgICBpMSA9IFNBRkVfSEVBUF9MT0FEKGkxMSB8IDAsIDQsIDApIHwgMCB8IDA7CiAgIH0KICAgU0FGRV9IRUFQX1NUT1JFKGkxMSB8IDAsIC0xIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMTEgKyA0IHwgMCwgLTEgfCAwLCA0KTsKICAgaTEgPSAtMTsKICB9IHdoaWxlICgwKTsKIH0KIFNUQUNLVE9QID0gaTEyOwogcmV0dXJuIGkxIHwgMDsKfQoKZnVuY3Rpb24gX2hvcnN0X3ZlcmlmeShpMTIsIGk5LCBpMSwgaTIsIGkzLCBpMTEsIGk4KSB7CiBpMTIgPSBpMTIgfCAwOwogaTkgPSBpOSB8IDA7CiBpMSA9IGkxIHwgMDsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpMTEgPSBpMTEgfCAwOwogaTggPSBpOCB8IDA7CiB2YXIgaTQgPSAwLCBpNSA9IDAsIGk2ID0gMCwgaTcgPSAwLCBpMTAgPSAwOwogaTEwID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgMTAyNCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coMTAyNCk7CiBpNyA9IDA7CiBpMiA9IGk5ICsgMjA0OCB8IDA7CiBMMSA6IHdoaWxlICgxKSB7CiAgaWYgKGk3ID4+PiAwID49IDMyKSB7CiAgIGkyID0gMjU7CiAgIGJyZWFrOwogIH0KICBpMyA9IGk3IDw8IDE7CiAgaTYgPSBTQUZFX0hFQVBfTE9BRChpOCArIGkzID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwOwogIGkzID0gKFNBRkVfSEVBUF9MT0FEKGk4ICsgKGkzIHwgMSkgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgOCB8IGk2OwogIEw0IDogZG8gaWYgKCEoaTYgJiAxKSkgewogICBfaGFzaF9uX24oaTEwLCBpMikgfCAwOwogICBpMSA9IDA7CiAgIHdoaWxlICgxKSB7CiAgICBpZiAoKGkxIHwgMCkgPT0gMzIpIGJyZWFrIEw0OwogICAgaTYgPSBpMSArIDMyIHwgMDsKICAgIFNBRkVfSEVBUF9TVE9SRShpMTAgKyBpNiA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTIgKyBpNiA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogICAgaTEgPSBpMSArIDEgfCAwOwogICB9CiAgfSBlbHNlIHsKICAgX2hhc2hfbl9uKGkxMCArIDMyIHwgMCwgaTIpIHwgMDsKICAgaTEgPSAwOwogICB3aGlsZSAoMSkgewogICAgaWYgKChpMSB8IDApID09IDMyKSBicmVhayBMNDsKICAgIFNBRkVfSEVBUF9TVE9SRShpMTAgKyBpMSA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTIgKyAoaTEgKyAzMikgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgIGkxID0gaTEgKyAxIHwgMDsKICAgfQogIH0gd2hpbGUgKDApOwogIGk1ID0gMTsKICBpNCA9IGkyICsgNjQgfCAwOwogIHdoaWxlICgxKSB7CiAgIGk2ID0gaTMgPj4+IDE7CiAgIGlmICgoaTUgfCAwKSA9PSAxMCkgYnJlYWs7CiAgIGkxID0gaTExICsgKChpNSA8PCA2KSArIC02NCkgfCAwOwogICBMMTcgOiBkbyBpZiAoIShpMyAmIDIpKSB7CiAgICBfaGFzaF8ybl9uX21hc2soaTEwLCBpMTAsIGkxKSB8IDA7CiAgICBpMSA9IDA7CiAgICB3aGlsZSAoMSkgewogICAgIGlmICgoaTEgfCAwKSA9PSAzMikgYnJlYWsgTDE3OwogICAgIFNBRkVfSEVBUF9TVE9SRShpMTAgKyAoaTEgKyAzMikgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgICBpMSA9IGkxICsgMSB8IDA7CiAgICB9CiAgIH0gZWxzZSB7CiAgICBfaGFzaF8ybl9uX21hc2soaTEwICsgMzIgfCAwLCBpMTAsIGkxKSB8IDA7CiAgICBpMSA9IDA7CiAgICB3aGlsZSAoMSkgewogICAgIGlmICgoaTEgfCAwKSA9PSAzMikgYnJlYWsgTDE3OwogICAgIFNBRkVfSEVBUF9TVE9SRShpMTAgKyBpMSA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyBpMSA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogICAgIGkxID0gaTEgKyAxIHwgMDsKICAgIH0KICAgfSB3aGlsZSAoMCk7CiAgIGk1ID0gaTUgKyAxIHwgMDsKICAgaTMgPSBpNjsKICAgaTQgPSBpNCArIDMyIHwgMDsKICB9CiAgaTIgPSBpMiArIDM1MiB8IDA7CiAgX2hhc2hfMm5fbl9tYXNrKGkxMCwgaTEwLCBpMTEgKyA1NzYgfCAwKSB8IDA7CiAgaTEgPSAwOwogIHdoaWxlICgxKSB7CiAgIGlmIChpMSA+Pj4gMCA+PSAzMikgYnJlYWs7CiAgIGlmICgoU0FGRV9IRUFQX0xPQUQoaTkgKyAoaTEgKyAoaTYgPDwgNSkpID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwKSA9PSAoU0FGRV9IRUFQX0xPQUQoaTEwICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDApKSBpMSA9IGkxICsgMSB8IDA7IGVsc2UgewogICAgaTIgPSAyMzsKICAgIGJyZWFrIEwxOwogICB9CiAgfQogIGk3ID0gaTcgKyAxIHwgMDsKIH0KIEwzMiA6IGRvIGlmICgoaTIgfCAwKSA9PSAyMykgewogIGkxID0gMDsKICB3aGlsZSAoMSkgewogICBpZiAoKGkxIHwgMCkgPT0gMzIpIHsKICAgIGkxID0gLTE7CiAgICBicmVhayBMMzI7CiAgIH0KICAgU0FGRV9IRUFQX1NUT1JFKGkxMiArIGkxID4+IDAgfCAwLCAwIHwgMCwgMSk7CiAgIGkxID0gaTEgKyAxIHwgMDsKICB9CiB9IGVsc2UgaWYgKChpMiB8IDApID09IDI1KSB7CiAgaTEgPSAwOwogIHdoaWxlICgxKSB7CiAgIGlmICgoaTEgfCAwKSA9PSAzMikgYnJlYWs7CiAgIF9oYXNoXzJuX25fbWFzayhpMTAgKyAoaTEgPDwgNSkgfCAwLCBpOSArIChpMSA8PCA2KSB8IDAsIGkxMSArIDY0MCB8IDApIHwgMDsKICAgaTEgPSBpMSArIDEgfCAwOwogIH0KICBpMSA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKChpMSB8IDApID09IDE2KSBicmVhazsKICAgX2hhc2hfMm5fbl9tYXNrKGkxMCArIChpMSA8PCA1KSB8IDAsIGkxMCArIChpMSA8PCA2KSB8IDAsIGkxMSArIDcwNCB8IDApIHwgMDsKICAgaTEgPSBpMSArIDEgfCAwOwogIH0KICBpMSA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKChpMSB8IDApID09IDgpIGJyZWFrOwogICBfaGFzaF8ybl9uX21hc2soaTEwICsgKGkxIDw8IDUpIHwgMCwgaTEwICsgKGkxIDw8IDYpIHwgMCwgaTExICsgNzY4IHwgMCkgfCAwOwogICBpMSA9IGkxICsgMSB8IDA7CiAgfQogIGkxID0gMDsKICB3aGlsZSAoMSkgewogICBpZiAoKGkxIHwgMCkgPT0gNCkgYnJlYWs7CiAgIF9oYXNoXzJuX25fbWFzayhpMTAgKyAoaTEgPDwgNSkgfCAwLCBpMTAgKyAoaTEgPDwgNikgfCAwLCBpMTEgKyA4MzIgfCAwKSB8IDA7CiAgIGkxID0gaTEgKyAxIHwgMDsKICB9CiAgaTEgPSAwOwogIHdoaWxlICgxKSB7CiAgIGlmICgoaTEgfCAwKSA9PSAyKSBicmVhazsKICAgX2hhc2hfMm5fbl9tYXNrKGkxMCArIChpMSA8PCA1KSB8IDAsIGkxMCArIChpMSA8PCA2KSB8IDAsIGkxMSArIDg5NiB8IDApIHwgMDsKICAgaTEgPSBpMSArIDEgfCAwOwogIH0KICBfaGFzaF8ybl9uX21hc2soaTEyLCBpMTAsIGkxMSArIDk2MCB8IDApIHwgMDsKICBpMSA9IDA7CiB9IHdoaWxlICgwKTsKIFNUQUNLVE9QID0gaTEwOwogcmV0dXJuIGkxIHwgMDsKfQoKZnVuY3Rpb24gX0VDUllQVF9rZXlzZXR1cChpMSwgaTIsIGkzLCBpNCkgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogaTQgPSBpNCB8IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAxNiB8IDAsIChTQUZFX0hFQVBfTE9BRChpMiArIDEgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgOCB8IChTQUZFX0hFQVBfTE9BRChpMiA+PiAwIHwgMCwgMSwgMSkgfCAwKSB8IChTQUZFX0hFQVBfTE9BRChpMiArIDIgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgMTYgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAzID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDI0IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAyMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpMiArIDUgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgOCB8IChTQUZFX0hFQVBfTE9BRChpMiArIDQgPj4gMCB8IDAsIDEsIDEpIHwgMCkgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyA2ID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDE2IHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgNyA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCAyNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMjQgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTIgKyA5ID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyA4ID4+IDAgfCAwLCAxLCAxKSB8IDApIHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgMTAgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgMTYgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAxMSA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCAyNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMjggfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAxMyA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCA4IHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgMTIgPj4gMCB8IDAsIDEsIDEpIHwgMCkgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAxNCA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCAxNiB8IChTQUZFX0hFQVBfTE9BRChpMiArIDE1ID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDI0IHwgMCwgNCk7CiBpMiA9IChpMyB8IDApID09IDI1NiA/IGkyICsgMTYgfCAwIDogaTI7CiBpNCA9IChpMyB8IDApID09IDI1NiA/IDI3OTUgOiAyODExOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMzIgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAxID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTIgPj4gMCB8IDAsIDEsIDEpIHwgMCkgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAyID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDE2IHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgMyA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCAyNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMzYgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTIgKyA1ID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyA0ID4+IDAgfCAwLCAxLCAxKSB8IDApIHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgNiA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCAxNiB8IChTQUZFX0hFQVBfTE9BRChpMiArIDcgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgMjQgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDQwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkyICsgOSA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCA4IHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgOCA+PiAwIHwgMCwgMSwgMSkgfCAwKSB8IChTQUZFX0hFQVBfTE9BRChpMiArIDEwID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDE2IHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgMTEgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgMjQgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDQ0IHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkyICsgMTMgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgOCB8IChTQUZFX0hFQVBfTE9BRChpMiArIDEyID4+IDAgfCAwLCAxLCAxKSB8IDApIHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgMTQgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgMTYgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAxNSA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCAyNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgMSA+PiAwIHwgMCwgMSwgMCkgfCAwKSA8PCA4IHwgKFNBRkVfSEVBUF9MT0FEKGk0ID4+IDAgfCAwLCAxLCAwKSB8IDApIHwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgMiA+PiAwIHwgMCwgMSwgMCkgfCAwKSA8PCAxNiB8IChTQUZFX0hFQVBfTE9BRChpNCArIDMgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgMjQgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDQgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA1ID4+IDAgfCAwLCAxLCAwKSB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA0ID4+IDAgfCAwLCAxLCAwKSB8IDApIHwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgNiA+PiAwIHwgMCwgMSwgMCkgfCAwKSA8PCAxNiB8IChTQUZFX0hFQVBfTE9BRChpNCArIDcgPj4gMCB8IDAsIDEsIDEpIHwgMCkgPDwgMjQgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDggfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA5ID4+IDAgfCAwLCAxLCAwKSB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTQgKyA4ID4+IDAgfCAwLCAxLCAwKSB8IDApIHwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgMTAgPj4gMCB8IDAsIDEsIDApIHwgMCkgPDwgMTYgfCAoU0FGRV9IRUFQX0xPQUQoaTQgKyAxMSA+PiAwIHwgMCwgMSwgMSkgfCAwKSA8PCAyNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMTIgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyAxMyA+PiAwIHwgMCwgMSwgMCkgfCAwKSA8PCA4IHwgKFNBRkVfSEVBUF9MT0FEKGk0ICsgMTIgPj4gMCB8IDAsIDEsIDApIHwgMCkgfCAoU0FGRV9IRUFQX0xPQUQoaTQgKyAxNCA+PiAwIHwgMCwgMSwgMCkgfCAwKSA8PCAxNiB8IChTQUZFX0hFQVBfTE9BRChpNCArIDE1ID4+IDAgfCAwLCAxLCAxKSB8IDApIDw8IDI0IHwgMCwgNCk7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9tZW1jcHkoaTMsIGk2LCBpMSkgewogaTMgPSBpMyB8IDA7CiBpNiA9IGk2IHwgMDsKIGkxID0gaTEgfCAwOwogdmFyIGkyID0gMCwgaTQgPSAwLCBpNSA9IDA7CiBpZiAoKGkxIHwgMCkgPj0gODE5MikgcmV0dXJuIF9lbXNjcmlwdGVuX21lbWNweV9iaWcoaTMgfCAwLCBpNiB8IDAsIGkxIHwgMCkgfCAwOwogaTUgPSBpMyB8IDA7CiBpNCA9IGkzICsgaTEgfCAwOwogaWYgKChpMyAmIDMpID09IChpNiAmIDMpKSB7CiAgd2hpbGUgKGkzICYgMykgewogICBpZiAoIWkxKSByZXR1cm4gaTUgfCAwOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgfCAwLCBTQUZFX0hFQVBfTE9BRChpNiB8IDAsIDEsIDApIHwgMCwgMSk7CiAgIGkzID0gaTMgKyAxIHwgMDsKICAgaTYgPSBpNiArIDEgfCAwOwogICBpMSA9IGkxIC0gMSB8IDA7CiAgfQogIGkxID0gaTQgJiAtNCB8IDA7CiAgaTIgPSBpMSAtIDY0IHwgMDsKICB3aGlsZSAoKGkzIHwgMCkgPD0gKGkyIHwgMCkpIHsKICAgU0FGRV9IRUFQX1NUT1JFKGkzIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgfCAwLCA0LCAwKSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyA0IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyA0IHwgMCwgNCwgMCkgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgOCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk2ICsgOCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDEyIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAxMiB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDE2IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAxNiB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDIwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAyMCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDI0IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAyNCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDI4IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAyOCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDMyIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAzMiB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDM2IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAzNiB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDQwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyA0MCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDQ0IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyA0NCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDQ4IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyA0OCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDUyIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyA1MiB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDU2IHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyA1NiB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDYwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyA2MCB8IDAsIDQsIDApIHwgMCwgNCk7CiAgIGkzID0gaTMgKyA2NCB8IDA7CiAgIGk2ID0gaTYgKyA2NCB8IDA7CiAgfQogIHdoaWxlICgoaTMgfCAwKSA8IChpMSB8IDApKSB7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyB8IDAsIFNBRkVfSEVBUF9MT0FEKGk2IHwgMCwgNCwgMCkgfCAwLCA0KTsKICAgaTMgPSBpMyArIDQgfCAwOwogICBpNiA9IGk2ICsgNCB8IDA7CiAgfQogfSBlbHNlIHsKICBpMSA9IGk0IC0gNCB8IDA7CiAgd2hpbGUgKChpMyB8IDApIDwgKGkxIHwgMCkpIHsKICAgU0FGRV9IRUFQX1NUT1JFKGkzIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgfCAwLCAxLCAwKSB8IDAsIDEpOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyAxIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTYgKyAxIHwgMCwgMSwgMCkgfCAwLCAxKTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgMiB8IDAsIFNBRkVfSEVBUF9MT0FEKGk2ICsgMiB8IDAsIDEsIDApIHwgMCwgMSk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDMgfCAwLCBTQUZFX0hFQVBfTE9BRChpNiArIDMgfCAwLCAxLCAwKSB8IDAsIDEpOwogICBpMyA9IGkzICsgNCB8IDA7CiAgIGk2ID0gaTYgKyA0IHwgMDsKICB9CiB9CiB3aGlsZSAoKGkzIHwgMCkgPCAoaTQgfCAwKSkgewogIFNBRkVfSEVBUF9TVE9SRShpMyB8IDAsIFNBRkVfSEVBUF9MT0FEKGk2IHwgMCwgMSwgMCkgfCAwLCAxKTsKICBpMyA9IGkzICsgMSB8IDA7CiAgaTYgPSBpNiArIDEgfCAwOwogfQogcmV0dXJuIGk1IHwgMDsKfQoKZnVuY3Rpb24gX2NvbXB1dGVfYXV0aHBhdGhfd290cyhpOSwgaTEwLCBpNywgaTEsIGk4KSB7CiBpOSA9IGk5IHwgMDsKIGkxMCA9IGkxMCB8IDA7CiBpNyA9IGk3IHwgMDsKIGkxID0gaTEgfCAwOwogaTggPSBpOCB8IDA7CiB2YXIgaTIgPSAwLCBpMyA9IDAsIGk0ID0gMCwgaTUgPSAwLCBpNiA9IDAsIGkxMSA9IDA7CiBpMTEgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA3MTcxMiB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coNzE3MTIpOwogU0FGRV9IRUFQX1NUT1JFKGkxMSB8IDAsIFNBRkVfSEVBUF9MT0FEKGk3IHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTExICsgNCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk3ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxMSArIDggfCAwLCBTQUZFX0hFQVBfTE9BRChpNyArIDggfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTEgKyAxMiB8IDAsIFNBRkVfSEVBUF9MT0FEKGk3ICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTEgKyAxNiB8IDAsIFNBRkVfSEVBUF9MT0FEKGk3ICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTEgKyAyMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk3ICsgMjAgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIGkyID0gMDsKIHdoaWxlICgxKSB7CiAgU0FGRV9IRUFQX1NUT1JFKGkxMSArIDE2IHwgMCwgaTIgfCAwLCA0KTsKICBpZiAoKGkyIHwgMCkgPT0gMzIpIGJyZWFrOwogIF9nZXRfc2VlZChpMTEgKyA2ODYzMiArIChpMiA8PCA1KSB8IDAsIGkxLCBpMTEpOwogIGkyID0gaTIgKyAxIHwgMDsKIH0KIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDMyKSBicmVhazsKICBfd290c19wa2dlbihpMTEgKyAyNCArIChpMSAqIDIxNDQgfCAwKSB8IDAsIGkxMSArIDY4NjMyICsgKGkxIDw8IDUpIHwgMCwgaTgpOwogIGkxID0gaTEgKyAxIHwgMDsKIH0KIFNBRkVfSEVBUF9TVE9SRShpMTEgKyAxNiB8IDAsIDMyIHwgMCwgNCk7CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSAzMikgYnJlYWs7CiAgX2xfdHJlZShpMTEgKyA2OTY1NiArIDEwMjQgKyAoaTEgPDwgNSkgfCAwLCBpMTEgKyAyNCArIChpMSAqIDIxNDQgfCAwKSB8IDAsIGk4KTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBTQUZFX0hFQVBfU1RPUkUoaTExICsgMTYgfCAwLCAzMiB8IDAsIDQpOwogaTEgPSAwOwogaTMgPSAzMjsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDYpIGJyZWFrOwogIGk0ID0gaTMgPj4gMTsKICBpNSA9IGkxMSArIDY5NjU2ICsgKGkzIDw8IDUpIHwgMDsKICBpNiA9IGk4ICsgKChpMSA8PCA2KSArIDQ0OCkgfCAwOwogIGkyID0gMDsKICB3aGlsZSAoMSkgewogICBpZiAoKGkyIHwgMCkgPj0gKGkzIHwgMCkpIGJyZWFrOwogICBfaGFzaF8ybl9uX21hc2soaTExICsgNjk2NTYgKyAoaTQgPDwgNSkgKyAoaTIgPDwgNCkgfCAwLCBpNSArIChpMiA8PCA1KSB8IDAsIGk2KSB8IDA7CiAgIGkyID0gaTIgKyAyIHwgMDsKICB9CiAgaTEgPSBpMSArIDEgfCAwOwogIGkzID0gaTQ7CiB9CiBpMiA9IFNBRkVfSEVBUF9MT0FEKGk3ICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gNSkgYnJlYWs7CiAgaTMgPSBpMTAgKyAoaTEgPDwgNSkgfCAwOwogIGk0ID0gaTExICsgNjk2NTYgKyAoMzIgPj4+IGkxIDw8IDUpICsgKGkyID4+IGkxIDw8IDUgXiAzMikgfCAwOwogIGk1ID0gaTMgKyAzMiB8IDA7CiAgZG8gewogICBTQUZFX0hFQVBfU1RPUkUoaTMgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgIGkzID0gaTMgKyAxIHwgMDsKICAgaTQgPSBpNCArIDEgfCAwOwogIH0gd2hpbGUgKChpMyB8IDApIDwgKGk1IHwgMCkpOwogIGkxID0gaTEgKyAxIHwgMDsKIH0KIGkzID0gaTk7CiBpNCA9IGkxMSArIDY5NjU2ICsgMzIgfCAwOwogaTUgPSBpMyArIDMyIHwgMDsKIGRvIHsKICBTQUZFX0hFQVBfU1RPUkUoaTMgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgaTMgPSBpMyArIDEgfCAwOwogIGk0ID0gaTQgKyAxIHwgMDsKIH0gd2hpbGUgKChpMyB8IDApIDwgKGk1IHwgMCkpOwogU1RBQ0tUT1AgPSBpMTE7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9ob3JzdF9zaWduKGk5LCBpMTEsIGkxMiwgaTEsIGkyLCBpMywgaTQsIGk1LCBpMTApIHsKIGk5ID0gaTkgfCAwOwogaTExID0gaTExIHwgMDsKIGkxMiA9IGkxMiB8IDA7CiBpMSA9IGkxIHwgMDsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpNCA9IGk0IHwgMDsKIGk1ID0gaTUgfCAwOwogaTEwID0gaTEwIHwgMDsKIHZhciBpNiA9IDAsIGk3ID0gMCwgaTggPSAwOwogaTggPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA2MjkxNDI0IHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdyg2MjkxNDI0KTsKIF9leHBhbmRfc2VlZChpOCArIDQxOTQyNzIgfCAwLCBpNCk7CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSA2NTUzNikgYnJlYWs7CiAgaTcgPSBpMSA8PCA1OwogIF9oYXNoX25fbihpOCArIChpNyArIDIwOTcxMjApIHwgMCwgaTggKyA0MTk0MjcyICsgaTcgfCAwKSB8IDA7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogaTIgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkyIHwgMCkgPT0gMTYpIGJyZWFrOwogIGkzID0gMTYgLSBpMiB8IDA7CiAgaTQgPSBpNSArIChpMiA8PCA2KSB8IDA7CiAgaTEgPSAwOwogIHdoaWxlICgxKSB7CiAgIGlmICgoaTEgfCAwKSA+PSAoMSA8PCBpMyArIC0xIHwgMCkpIGJyZWFrOwogICBfaGFzaF8ybl9uX21hc2soaTggKyAoKDEgPDwgaTMgKyAtMSkgKyAxMzQyMTc3MjcgKyBpMSA8PCA1KSB8IDAsIGk4ICsgKCgxIDw8IGkzKSArIDEzNDIxNzcyNyArIChpMSA8PCAxKSA8PCA1KSB8IDAsIGk0KSB8IDA7CiAgIGkxID0gaTEgKyAxIHwgMDsKICB9CiAgaTIgPSBpMiArIDEgfCAwOwogfQogaTEgPSAwOwogaTIgPSAyMDE2Owogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMjA0OCkgYnJlYWs7CiAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgaTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk4ICsgaTIgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiAgaTIgPSBpMiArIDEgfCAwOwogfQogaTYgPSAyMDQ4OwogaTcgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGk3IHwgMCkgPT0gMzIpIGJyZWFrOwogIGkzID0gaTcgPDwgMTsKICBpMyA9IChTQUZFX0hFQVBfTE9BRChpMTAgKyAoaTMgfCAxKSA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkgPDwgOCB8IChTQUZFX0hFQVBfTE9BRChpMTAgKyBpMyA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCk7CiAgaTEgPSAwOwogIGkyID0gaTY7CiAgd2hpbGUgKDEpIHsKICAgaWYgKChpMSB8IDApID09IDMyKSBicmVhazsKICAgU0FGRV9IRUFQX1NUT1JFKGk5ICsgaTIgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk4ICsgNDE5NDI3MiArIChpMSArIChpMyA8PCA1KSkgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgaTEgPSBpMSArIDEgfCAwOwogICBpMiA9IGkyICsgMSB8IDA7CiAgfQogIGkyID0gaTMgKyA2NTUzNSB8IDA7CiAgaTUgPSAwOwogIGkxID0gaTY7CiAgd2hpbGUgKDEpIHsKICAgaTEgPSBpMSArIDMyIHwgMDsKICAgaWYgKChpNSB8IDApID09IDEwKSBicmVhazsKICAgaTQgPSBpMiArIC0xICsgKGkyIDw8IDEgJiAyKSB8IDA7CiAgIGkyID0gMDsKICAgaTMgPSBpMTsKICAgd2hpbGUgKDEpIHsKICAgIGlmICgoaTIgfCAwKSA9PSAzMikgYnJlYWs7CiAgICBTQUZFX0hFQVBfU1RPUkUoaTkgKyBpMyA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTggKyAoaTIgKyAoaTQgPDwgNSkpID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgICBpMiA9IGkyICsgMSB8IDA7CiAgICBpMyA9IGkzICsgMSB8IDA7CiAgIH0KICAgaTIgPSAoaTQgKyAtMSB8IDApID4+PiAxOwogICBpNSA9IGk1ICsgMSB8IDA7CiAgfQogIGk2ID0gaTYgKyAzNTIgfCAwOwogIGk3ID0gaTcgKyAxIHwgMDsKIH0KIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDMyKSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTExICsgaTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk4ICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBTQUZFX0hFQVBfU1RPUkUoaTEyIHwgMCwgMTMzMTIgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTIgKyA0IHwgMCwgMCB8IDAsIDQpOwogU1RBQ0tUT1AgPSBpODsKIHJldHVybiAwOwp9CgpmdW5jdGlvbiBfdmFsaWRhdGVfYXV0aHBhdGgoaTYsIGkyLCBpMywgaTQsIGk3KSB7CiBpNiA9IGk2IHwgMDsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpNCA9IGk0IHwgMDsKIGk3ID0gaTcgfCAwOwogdmFyIGkxID0gMCwgaTUgPSAwLCBpOCA9IDA7CiBpOCA9IFNUQUNLVE9QOwogU1RBQ0tUT1AgPSBTVEFDS1RPUCArIDY0IHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdyg2NCk7CiBMMSA6IGRvIGlmICghKGkzICYgMSkpIHsKICBpMSA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKChpMSB8IDApID09IDMyKSBicmVhazsKICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgaTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkyICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgaTEgPSBpMSArIDEgfCAwOwogIH0KICBpMSA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKChpMSB8IDApID09IDMyKSBicmVhayBMMTsKICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgKGkxICsgMzIpID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNCArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgIGkxID0gaTEgKyAxIHwgMDsKICB9CiB9IGVsc2UgewogIGkxID0gMDsKICB3aGlsZSAoMSkgewogICBpZiAoKGkxIHwgMCkgPT0gMzIpIGJyZWFrOwogICBTQUZFX0hFQVBfU1RPUkUoaTggKyAoaTEgKyAzMikgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkyICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgaTEgPSBpMSArIDEgfCAwOwogIH0KICBpMSA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKChpMSB8IDApID09IDMyKSBicmVhayBMMTsKICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgaTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgaTEgPSBpMSArIDEgfCAwOwogIH0KIH0gd2hpbGUgKDApOwogaTUgPSAwOwogaTEgPSBpNDsKIHdoaWxlICgxKSB7CiAgaTEgPSBpMSArIDMyIHwgMDsKICBpZiAoKGk1IHwgMCkgPT0gNCkgYnJlYWs7CiAgaTQgPSBpMyA+Pj4gMTsKICBpMiA9IGk3ICsgKChpNSA8PCA2KSArIDQ0OCkgfCAwOwogIEwyMiA6IGRvIGlmICghKGkzICYgMikpIHsKICAgX2hhc2hfMm5fbl9tYXNrKGk4LCBpOCwgaTIpIHwgMDsKICAgaTIgPSAwOwogICB3aGlsZSAoMSkgewogICAgaWYgKChpMiB8IDApID09IDMyKSBicmVhayBMMjI7CiAgICBTQUZFX0hFQVBfU1RPUkUoaTggKyAoaTIgKyAzMikgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxICsgaTIgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgIGkyID0gaTIgKyAxIHwgMDsKICAgfQogIH0gZWxzZSB7CiAgIF9oYXNoXzJuX25fbWFzayhpOCArIDMyIHwgMCwgaTgsIGkyKSB8IDA7CiAgIGkyID0gMDsKICAgd2hpbGUgKDEpIHsKICAgIGlmICgoaTIgfCAwKSA9PSAzMikgYnJlYWsgTDIyOwogICAgU0FGRV9IRUFQX1NUT1JFKGk4ICsgaTIgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxICsgaTIgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICAgIGkyID0gaTIgKyAxIHwgMDsKICAgfQogIH0gd2hpbGUgKDApOwogIGk1ID0gaTUgKyAxIHwgMDsKICBpMyA9IGk0OwogfQogX2hhc2hfMm5fbl9tYXNrKGk2LCBpOCwgaTcgKyA3MDQgfCAwKSB8IDA7CiBTVEFDS1RPUCA9IGk4OwogcmV0dXJuOwp9CgpmdW5jdGlvbiBfdHJlZWhhc2goaTksIGk2LCBpMSwgaTcpIHsKIGk5ID0gaTkgfCAwOwogaTYgPSBpNiB8IDA7CiBpMSA9IGkxIHwgMDsKIGk3ID0gaTcgfCAwOwogdmFyIGkyID0gMCwgaTMgPSAwLCBpNCA9IDAsIGk1ID0gMCwgaTggPSAwLCBpMTAgPSAwLCBpMTEgPSAwOwogaTEwID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgMjQwIHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdygyNDApOwogU0FGRV9IRUFQX1NUT1JFKGkxMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxIHwgMCwgNCwgMCkgfCAwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEwICsgNCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxMCArIDggfCAwLCBTQUZFX0hFQVBfTE9BRChpMSArIDggfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTAgKyAxMiB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxICsgMTIgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTAgKyAxNiB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMTAgKyAyMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkxICsgMjAgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KTsKIGk4ID0gX2xsdm1fc3RhY2tzYXZlKCkgfCAwOwogaTUgPSBTQUZFX0hFQVBfTE9BRChpMTAgKyAxNiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpMSA9IDA7CiBpNCA9IGk1Owogd2hpbGUgKDEpIHsKICBpZiAoKGk0IHwgMCkgPj0gKGk1ICsgMzIgfCAwKSkgYnJlYWs7CiAgX2dlbl9sZWFmX3dvdHMoaTEwICsgNDggKyAoaTEgPDwgNSkgfCAwLCBpNywgaTYsIGkxMCk7CiAgU0FGRV9IRUFQX1NUT1JFKGkxMCArIDI0ICsgKGkxIDw8IDIpIHwgMCwgMCB8IDAsIDQpOwogIGkxID0gaTEgKyAxIHwgMDsKICBpMyA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKGkxID4+PiAwIDw9IDEpIGJyZWFrOwogICBpMiA9IGkxICsgLTIgfCAwOwogICBpZiAoKGkzIHwgMCkgIT0gKFNBRkVfSEVBUF9MT0FEKGkxMCArIDI0ICsgKGkyIDw8IDIpIHwgMCwgNCwgMCkgfCAwIHwgMCkpIGJyZWFrOwogICBfaGFzaF8ybl9uX21hc2soaTEwICsgNDggKyAoaTIgPDwgNSkgfCAwLCBpMTAgKyA0OCArIChpMiA8PCA1KSB8IDAsIGk3ICsgKChpMyA8PCA2KSArIDQ0OCkgfCAwKSB8IDA7CiAgIGkxMSA9IGkzICsgMSB8IDA7CiAgIFNBRkVfSEVBUF9TVE9SRShpMTAgKyAyNCArIChpMiA8PCAyKSB8IDAsIGkxMSB8IDAsIDQpOwogICBpMSA9IGkxICsgLTEgfCAwOwogICBpMyA9IGkxMTsKICB9CiAgaTExID0gaTQgKyAxIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTEwICsgMTYgfCAwLCBpMTEgfCAwLCA0KTsKICBpNCA9IGkxMTsKIH0KIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDMyKSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTkgKyBpMSA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTEwICsgNDggKyBpMSA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogIGkxID0gaTEgKyAxIHwgMDsKIH0KIF9sbHZtX3N0YWNrcmVzdG9yZShpOCB8IDApOwogU1RBQ0tUT1AgPSBpMTA7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9ibGFrZTUxMl91cGRhdGUoaTUsIGkxLCBpMiwgaTMpIHsKIGk1ID0gaTUgfCAwOwogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogdmFyIGk0ID0gMCwgaTYgPSAwOwogaTQgPSAoU0FGRV9IRUFQX0xPQUQoaTUgKyAxMTIgfCAwLCA0LCAwKSB8IDApID4+IDM7CiBpZiAoIWk0KSBpNCA9IDA7IGVsc2UgewogIGk2ID0gX2JpdHNoaWZ0NjRMc2hyKGkyIHwgMCwgaTMgfCAwLCAzKSB8IDA7CiAgaWYgKCEoMCA8ICgoMTI4IC0gaTQgfCAwKSA8IDApIDw8IDMxID4+IDMxID4+PiAwIHwgMCA9PSAoKCgxMjggLSBpNCB8IDApIDwgMCkgPDwgMzEgPj4gMzEgfCAwKSAmIChpNiAmIDEyNykgPj4+IDAgPCAoMTI4IC0gaTQgfCAwKSA+Pj4gMCkpIHsKICAgX21lbWNweShpNSArIDEyMCArIGk0IHwgMCwgaTEgfCAwLCAxMjggLSBpNCB8IDApIHwgMDsKICAgaTYgPSBfaTY0QWRkKFNBRkVfSEVBUF9MT0FEKGk1ICsgOTYgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNSArIDk2ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDEwMjQsIDApIHwgMDsKICAgU0FGRV9IRUFQX1NUT1JFKGk1ICsgOTYgfCAwLCBpNiB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTUgKyA5NiArIDQgfCAwLCB0ZW1wUmV0MCB8IDAsIDQpOwogICBfYmxha2U1MTJfY29tcHJlc3MoaTUsIGk1ICsgMTIwIHwgMCk7CiAgIGkyID0gX2k2NFN1YnRyYWN0KGkyIHwgMCwgaTMgfCAwLCAxMjggLSBpNCA8PCAzIHwgMCwgKCgxMjggLSBpNCA8PCAzIHwgMCkgPCAwKSA8PCAzMSA+PiAzMSB8IDApIHwgMDsKICAgaTEgPSBpMSArICgxMjggLSBpNCkgfCAwOwogICBpNCA9IDA7CiAgIGkzID0gdGVtcFJldDA7CiAgfQogfQogd2hpbGUgKDEpIHsKICBpZiAoIShpMyA+Pj4gMCA+IDAgfCAoaTMgfCAwKSA9PSAwICYgaTIgPj4+IDAgPiAxMDIzKSkgYnJlYWs7CiAgaTYgPSBfaTY0QWRkKFNBRkVfSEVBUF9MT0FEKGk1ICsgOTYgfCAwLCA0LCAwKSB8IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpNSArIDk2ICsgNCB8IDAsIDQsIDApIHwgMCB8IDAsIDEwMjQsIDApIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTUgKyA5NiB8IDAsIGk2IHwgMCwgNCk7CiAgU0FGRV9IRUFQX1NUT1JFKGk1ICsgOTYgKyA0IHwgMCwgdGVtcFJldDAgfCAwLCA0KTsKICBfYmxha2U1MTJfY29tcHJlc3MoaTUsIGkxKTsKICBpNiA9IF9pNjRBZGQoaTIgfCAwLCBpMyB8IDAsIC0xMDI0LCAtMSkgfCAwOwogIGkxID0gaTEgKyAxMjggfCAwOwogIGkzID0gdGVtcFJldDA7CiAgaTIgPSBpNjsKIH0KIGlmICgoaTIgfCAwKSA9PSAwICYgKGkzIHwgMCkgPT0gMCkgaTEgPSAwOyBlbHNlIHsKICBpNiA9IF9iaXRzaGlmdDY0THNocihpMiB8IDAsIGkzIHwgMCwgMykgfCAwOwogIF9tZW1jcHkoaTUgKyAxMjAgKyBpNCB8IDAsIGkxIHwgMCwgaTYgJiAxMjcgfCAwKSB8IDA7CiAgaTEgPSAoaTQgPDwgMykgKyBpMiB8IDA7CiB9CiBTQUZFX0hFQVBfU1RPUkUoaTUgKyAxMTIgfCAwLCBpMSB8IDAsIDQpOwogcmV0dXJuOwp9CgpmdW5jdGlvbiBfYmxha2UyNTZfdXBkYXRlKGk1LCBpMSwgaTIsIGkzKSB7CiBpNSA9IGk1IHwgMDsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiBpMyA9IGkzIHwgMDsKIHZhciBpNCA9IDAsIGk2ID0gMDsKIGk0ID0gKFNBRkVfSEVBUF9MT0FEKGk1ICsgNTYgfCAwLCA0LCAwKSB8IDApID4+IDM7CiBpZiAoIWk0KSBpNCA9IDA7IGVsc2UgewogIGk2ID0gX2JpdHNoaWZ0NjRMc2hyKGkyIHwgMCwgaTMgfCAwLCAzKSB8IDA7CiAgaWYgKCEoMCA8ICgoNjQgLSBpNCB8IDApIDwgMCkgPDwgMzEgPj4gMzEgPj4+IDAgfCAwID09ICgoKDY0IC0gaTQgfCAwKSA8IDApIDw8IDMxID4+IDMxIHwgMCkgJiAoaTYgJiA2MykgPj4+IDAgPCAoNjQgLSBpNCB8IDApID4+PiAwKSkgewogICBfbWVtY3B5KGk1ICsgNjQgKyBpNCB8IDAsIGkxIHwgMCwgNjQgLSBpNCB8IDApIHwgMDsKICAgaTYgPSAoU0FGRV9IRUFQX0xPQUQoaTUgKyA0OCB8IDAsIDQsIDApIHwgMCB8IDApICsgNTEyIHwgMDsKICAgU0FGRV9IRUFQX1NUT1JFKGk1ICsgNDggfCAwLCBpNiB8IDAsIDQpOwogICBpZiAoIWk2KSBTQUZFX0hFQVBfU1RPUkUoaTUgKyA1MiB8IDAsIChTQUZFX0hFQVBfTE9BRChpNSArIDUyIHwgMCwgNCwgMCkgfCAwIHwgMCkgKyAxIHwgMCwgNCk7CiAgIF9ibGFrZTI1Nl9jb21wcmVzcyhpNSwgaTUgKyA2NCB8IDApOwogICBpMiA9IF9pNjRTdWJ0cmFjdChpMiB8IDAsIGkzIHwgMCwgNjQgLSBpNCA8PCAzIHwgMCwgKCg2NCAtIGk0IDw8IDMgfCAwKSA8IDApIDw8IDMxID4+IDMxIHwgMCkgfCAwOwogICBpMSA9IGkxICsgKDY0IC0gaTQpIHwgMDsKICAgaTQgPSAwOwogICBpMyA9IHRlbXBSZXQwOwogIH0KIH0KIHdoaWxlICgxKSB7CiAgaWYgKCEoaTMgPj4+IDAgPiAwIHwgKGkzIHwgMCkgPT0gMCAmIGkyID4+PiAwID4gNTExKSkgYnJlYWs7CiAgaTYgPSAoU0FGRV9IRUFQX0xPQUQoaTUgKyA0OCB8IDAsIDQsIDApIHwgMCB8IDApICsgNTEyIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTUgKyA0OCB8IDAsIGk2IHwgMCwgNCk7CiAgaWYgKCFpNikgU0FGRV9IRUFQX1NUT1JFKGk1ICsgNTIgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTUgKyA1MiB8IDAsIDQsIDApIHwgMCB8IDApICsgMSB8IDAsIDQpOwogIF9ibGFrZTI1Nl9jb21wcmVzcyhpNSwgaTEpOwogIGk2ID0gX2k2NEFkZChpMiB8IDAsIGkzIHwgMCwgLTUxMiwgLTEpIHwgMDsKICBpMSA9IGkxICsgNjQgfCAwOwogIGkzID0gdGVtcFJldDA7CiAgaTIgPSBpNjsKIH0KIGlmICgoaTIgfCAwKSA9PSAwICYgKGkzIHwgMCkgPT0gMCkgaTEgPSAwOyBlbHNlIHsKICBpNiA9IF9iaXRzaGlmdDY0THNocihpMiB8IDAsIGkzIHwgMCwgMykgfCAwOwogIF9tZW1jcHkoaTUgKyA2NCArIGk0IHwgMCwgaTEgfCAwLCBpNiB8IDApIHwgMDsKICBpMSA9IChpNCA8PCAzKSArIGkyIHwgMDsKIH0KIFNBRkVfSEVBUF9TVE9SRShpNSArIDU2IHwgMCwgaTEgfCAwLCA0KTsKIHJldHVybjsKfQoKZnVuY3Rpb24gX21lbXNldChpMywgaTQsIGkyKSB7CiBpMyA9IGkzIHwgMDsKIGk0ID0gaTQgfCAwOwogaTIgPSBpMiB8IDA7CiB2YXIgaTEgPSAwLCBpNSA9IDA7CiBpMSA9IGkzICsgaTIgfCAwOwogaTQgPSBpNCAmIDI1NTsKIGlmICgoaTIgfCAwKSA+PSA2NykgewogIHdoaWxlIChpMyAmIDMpIHsKICAgU0FGRV9IRUFQX1NUT1JFKGkzIHwgMCwgaTQgfCAwLCAxKTsKICAgaTMgPSBpMyArIDEgfCAwOwogIH0KICBpNSA9IGk0IHwgaTQgPDwgOCB8IGk0IDw8IDE2IHwgaTQgPDwgMjQ7CiAgd2hpbGUgKChpMyB8IDApIDw9ICgoaTEgJiAtNCkgLSA2NCB8IDApKSB7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyB8IDAsIGk1IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDQgfCAwLCBpNSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyA4IHwgMCwgaTUgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgMTIgfCAwLCBpNSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyAxNiB8IDAsIGk1IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDIwIHwgMCwgaTUgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgMjQgfCAwLCBpNSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyAyOCB8IDAsIGk1IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDMyIHwgMCwgaTUgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgMzYgfCAwLCBpNSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyA0MCB8IDAsIGk1IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDQ0IHwgMCwgaTUgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgNDggfCAwLCBpNSB8IDAsIDQpOwogICBTQUZFX0hFQVBfU1RPUkUoaTMgKyA1MiB8IDAsIGk1IHwgMCwgNCk7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyArIDU2IHwgMCwgaTUgfCAwLCA0KTsKICAgU0FGRV9IRUFQX1NUT1JFKGkzICsgNjAgfCAwLCBpNSB8IDAsIDQpOwogICBpMyA9IGkzICsgNjQgfCAwOwogIH0KICB3aGlsZSAoKGkzIHwgMCkgPCAoaTEgJiAtNCB8IDApKSB7CiAgIFNBRkVfSEVBUF9TVE9SRShpMyB8IDAsIGk1IHwgMCwgNCk7CiAgIGkzID0gaTMgKyA0IHwgMDsKICB9CiB9CiB3aGlsZSAoKGkzIHwgMCkgPCAoaTEgfCAwKSkgewogIFNBRkVfSEVBUF9TVE9SRShpMyB8IDAsIGk0IHwgMCwgMSk7CiAgaTMgPSBpMyArIDEgfCAwOwogfQogcmV0dXJuIGkxIC0gaTIgfCAwOwp9CgpmdW5jdGlvbiBfRUNSWVBUX2VuY3J5cHRfYnl0ZXMoaTUsIGkzLCBpMiwgaTEpIHsKIGk1ID0gaTUgfCAwOwogaTMgPSBpMyB8IDA7CiBpMiA9IGkyIHwgMDsKIGkxID0gaTEgfCAwOwogdmFyIGk0ID0gMCwgaTYgPSAwOwogaTYgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA2NCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coNjQpOwogTDEgOiBkbyBpZiAoaTEgfCAwKSB7CiAgaTQgPSBpMTsKICB3aGlsZSAoMSkgewogICBfc2Fsc2EyMF93b3JkdG9ieXRlKGk2LCBpNSk7CiAgIGkxID0gKFNBRkVfSEVBUF9MT0FEKGk1ICsgNDggfCAwLCA0LCAwKSB8IDAgfCAwKSArIDEgfCAwOwogICBTQUZFX0hFQVBfU1RPUkUoaTUgKyA0OCB8IDAsIGkxIHwgMCwgNCk7CiAgIGlmICghaTEpIFNBRkVfSEVBUF9TVE9SRShpNSArIDUyIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGk1ICsgNTIgfCAwLCA0LCAwKSB8IDAgfCAwKSArIDEgfCAwLCA0KTsKICAgaWYgKGk0ID4+PiAwIDwgNjUpIGJyZWFrOwogICBpMSA9IDA7CiAgIHdoaWxlICgxKSB7CiAgICBpZiAoKGkxIHwgMCkgPT0gNjQpIGJyZWFrOwogICAgU0FGRV9IRUFQX1NUT1JFKGkyICsgaTEgPj4gMCB8IDAsIChTQUZFX0hFQVBfTE9BRChpNiArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGkzICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCkgfCAwLCAxKTsKICAgIGkxID0gaTEgKyAxIHwgMDsKICAgfQogICBpNCA9IGk0ICsgLTY0IHwgMDsKICAgaTIgPSBpMiArIDY0IHwgMDsKICAgaTMgPSBpMyArIDY0IHwgMDsKICB9CiAgaTEgPSAwOwogIHdoaWxlICgxKSB7CiAgIGlmICgoaTEgfCAwKSA9PSAoaTQgfCAwKSkgYnJlYWsgTDE7CiAgIFNBRkVfSEVBUF9TVE9SRShpMiArIGkxID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTYgKyBpMSA+PiAwIHwgMCwgMSwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMyArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDApIHwgMCwgMSk7CiAgIGkxID0gaTEgKyAxIHwgMDsKICB9CiB9IHdoaWxlICgwKTsKIFNUQUNLVE9QID0gaTY7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9ibGFrZTUxMl9pbml0KGkxKSB7CiBpMSA9IGkxIHwgMDsKIHZhciBpMiA9IDA7CiBTQUZFX0hFQVBfU1RPUkUoaTEgfCAwLCAtMjA1NzMxNTc2IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyA0IHwgMCwgMTc3OTAzMzcwMyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgOCB8IDAsIC0yMDY3MDkzNzAxIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyA4ICsgNCB8IDAsIC0xMTUwODMzMDE5IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAxNiB8IDAsIC0yMzc5MTU3MyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMTYgKyA0IHwgMCwgMTAxMzkwNDI0MiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMjQgfCAwLCAxNTk1NzUwMTI5IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAyNCArIDQgfCAwLCAtMTUyMTQ4NjUzNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMzIgfCAwLCAtMTM3NzQwMjE1OSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMzIgKyA0IHwgMCwgMTM1OTg5MzExOSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgNDAgfCAwLCA3MjU1MTExOTkgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDQwICsgNCB8IDAsIC0xNjk0MTQ0MzcyIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyA0OCB8IDAsIC03OTU3Nzc0OSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgNDggKyA0IHwgMCwgNTI4NzM0NjM1IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyA1NiB8IDAsIDMyNzAzMzIwOSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgNTYgKyA0IHwgMCwgMTU0MTQ1OTIyNSB8IDAsIDQpOwogaTEgPSBpMSArIDY0IHwgMDsKIGkyID0gaTEgKyA1NiB8IDA7CiBkbyB7CiAgU0FGRV9IRUFQX1NUT1JFKGkxIHwgMCwgMCB8IDAsIDQpOwogIGkxID0gaTEgKyA0IHwgMDsKIH0gd2hpbGUgKChpMSB8IDApIDwgKGkyIHwgMCkpOwogcmV0dXJuOwp9CgpmdW5jdGlvbiBfd290c192ZXJpZnkoaTQsIGk1LCBpMywgaTYpIHsKIGk0ID0gaTQgfCAwOwogaTUgPSBpNSB8IDA7CiBpMyA9IGkzIHwgMDsKIGk2ID0gaTYgfCAwOwogdmFyIGkxID0gMCwgaTIgPSAwLCBpNyA9IDAsIGk4ID0gMDsKIGk3ID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgMjcyIHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdygyNzIpOwogaTEgPSAwOwogaTIgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoaTIgPj4+IDAgPj0gNjQpIGJyZWFrOwogIGk4ID0gU0FGRV9IRUFQX0xPQUQoaTMgKyAoaTIgPj4+IDEpID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpNyArIChpMiA8PCAyKSB8IDAsIGk4ICYgMTUgfCAwLCA0KTsKICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAoKGkyIHwgMSkgPDwgMikgfCAwLCAoaTggJiAyNTUpID4+PiA0IHwgMCwgNCk7CiAgaTEgPSAoaTggJiAxNSBeIDE1KSArIGkxICsgKChpOCAmIDI1NSkgPj4+IDQgXiAxNSkgfCAwOwogIGkyID0gaTIgKyAyIHwgMDsKIH0KIGkyID0gNjQ7CiB3aGlsZSAoMSkgewogIGlmIChpMiA+Pj4gMCA+PSA2NykgYnJlYWs7CiAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgKGkyIDw8IDIpIHwgMCwgaTEgJiAxNSB8IDAsIDQpOwogIGkxID0gaTEgPj4gNDsKICBpMiA9IGkyICsgMSB8IDA7CiB9CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSA2NykgYnJlYWs7CiAgaTMgPSBpMSA8PCA1OwogIGk4ID0gU0FGRV9IRUFQX0xPQUQoaTcgKyAoaTEgPDwgMikgfCAwLCA0LCAwKSB8IDAgfCAwOwogIF9nZW5fY2hhaW4oaTQgKyBpMyB8IDAsIGk1ICsgaTMgfCAwLCBpNiArIChpOCA8PCA1KSB8IDAsIDE1IC0gaTggfCAwKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBTVEFDS1RPUCA9IGk3OwogcmV0dXJuOwp9CgpmdW5jdGlvbiBfZ2V0X3NlZWQoaTYsIGkyLCBpMykgewogaTYgPSBpNiB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogdmFyIGkxID0gMCwgaTQgPSAwLCBpNSA9IDAsIGk3ID0gMCwgaTggPSAwOwogaTcgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA0OCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coNDgpOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMzIpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpNyArIGkxID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMiArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogaTUgPSBTQUZFX0hFQVBfTE9BRChpMyB8IDAsIDQsIDApIHwgMCB8IDA7CiBpNCA9IF9iaXRzaGlmdDY0U2hsKFNBRkVfSEVBUF9MT0FEKGkzICsgOCB8IDAsIDQsIDApIHwgMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGkzICsgOCArIDQgfCAwLCA0LCAwKSB8IDAgfCAwLCA0KSB8IDA7CiBpMSA9IHRlbXBSZXQwIHwgKChpNSB8IDApIDwgMCkgPDwgMzEgPj4gMzE7CiBpMiA9IF9iaXRzaGlmdDY0U2hsKFNBRkVfSEVBUF9MT0FEKGkzICsgMTYgfCAwLCA0LCAwKSB8IDAgfCAwLCAwLCA1OSkgfCAwOwogaTMgPSBpMSB8IHRlbXBSZXQwOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gOCkgYnJlYWs7CiAgaTggPSBfYml0c2hpZnQ2NExzaHIoaTQgfCBpNSB8IGkyIHwgMCwgaTMgfCAwLCBpMSA8PCAzIHwgMCkgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpNyArIChpMSArIDMyKSA+PiAwIHwgMCwgaTggfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBfdmFybGVuX2hhc2goaTYsIGk3LCA0MCwgMCkgfCAwOwogU1RBQ0tUT1AgPSBpNzsKIHJldHVybjsKfQoKZnVuY3Rpb24gX3dvdHNfc2lnbihpNSwgaTMsIGk0LCBpNikgewogaTUgPSBpNSB8IDA7CiBpMyA9IGkzIHwgMDsKIGk0ID0gaTQgfCAwOwogaTYgPSBpNiB8IDA7CiB2YXIgaTEgPSAwLCBpMiA9IDAsIGk3ID0gMCwgaTggPSAwOwogaTcgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyAyNzIgfCAwOwogaWYgKChTVEFDS1RPUCB8IDApID49IChTVEFDS19NQVggfCAwKSkgYWJvcnRTdGFja092ZXJmbG93KDI3Mik7CiBpMSA9IDA7CiBpMiA9IDA7CiB3aGlsZSAoMSkgewogIGlmIChpMiA+Pj4gMCA+PSA2NCkgYnJlYWs7CiAgaTggPSBTQUZFX0hFQVBfTE9BRChpMyArIChpMiA+Pj4gMSkgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDA7CiAgU0FGRV9IRUFQX1NUT1JFKGk3ICsgKGkyIDw8IDIpIHwgMCwgaTggJiAxNSB8IDAsIDQpOwogIFNBRkVfSEVBUF9TVE9SRShpNyArICgoaTIgfCAxKSA8PCAyKSB8IDAsIChpOCAmIDI1NSkgPj4+IDQgfCAwLCA0KTsKICBpMSA9IChpOCAmIDE1IF4gMTUpICsgaTEgKyAoKGk4ICYgMjU1KSA+Pj4gNCBeIDE1KSB8IDA7CiAgaTIgPSBpMiArIDIgfCAwOwogfQogaTIgPSA2NDsKIHdoaWxlICgxKSB7CiAgaWYgKGkyID4+PiAwID49IDY3KSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTcgKyAoaTIgPDwgMikgfCAwLCBpMSAmIDE1IHwgMCwgNCk7CiAgaTEgPSBpMSA+PiA0OwogIGkyID0gaTIgKyAxIHwgMDsKIH0KIF9leHBhbmRfc2VlZF8xNShpNSwgaTQpOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gNjcpIGJyZWFrOwogIGk4ID0gaTUgKyAoaTEgPDwgNSkgfCAwOwogIF9nZW5fY2hhaW4oaTgsIGk4LCBpNiwgU0FGRV9IRUFQX0xPQUQoaTcgKyAoaTEgPDwgMikgfCAwLCA0LCAwKSB8IDAgfCAwKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBTVEFDS1RPUCA9IGk3OwogcmV0dXJuOwp9CgpmdW5jdGlvbiBfaGFzaF8ybl9uKGkzLCBpMikgewogaTMgPSBpMyB8IDA7CiBpMiA9IGkyIHwgMDsKIHZhciBpMSA9IDAsIGk0ID0gMCwgaTUgPSAwOwogaTQgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA2NCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coNjQpOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMzIpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpNCArIGkxID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMiArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgU0FGRV9IRUFQX1NUT1JFKGk0ICsgKGkxICsgMzIpID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRCgyODI3ICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBfY2hhY2hhX3Blcm11dGUoaTQsIGk0KTsKIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDMyKSBicmVhazsKICBpNSA9IGk0ICsgaTEgfCAwOwogIFNBRkVfSEVBUF9TVE9SRShpNSA+PiAwIHwgMCwgKFNBRkVfSEVBUF9MT0FEKGkyICsgKGkxICsgMzIpID4+IDAgfCAwLCAxLCAwKSB8IDApIF4gKFNBRkVfSEVBUF9MT0FEKGk1ID4+IDAgfCAwLCAxLCAwKSB8IDApIHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogX2NoYWNoYV9wZXJtdXRlKGk0LCBpNCk7CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSAzMikgYnJlYWs7CiAgU0FGRV9IRUFQX1NUT1JFKGkzICsgaTEgPj4gMCB8IDAsIFNBRkVfSEVBUF9MT0FEKGk0ICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBTVEFDS1RPUCA9IGk0OwogcmV0dXJuIDA7Cn0KCmZ1bmN0aW9uIF9sX3RyZWUoaTYsIGk3LCBpOCkgewogaTYgPSBpNiB8IDA7CiBpNyA9IGk3IHwgMDsKIGk4ID0gaTggfCAwOwogdmFyIGkxID0gMCwgaTIgPSAwLCBpMyA9IDAsIGk0ID0gMCwgaTUgPSAwOwogaTUgPSAwOwogaTEgPSA2NzsKIHdoaWxlICgxKSB7CiAgaWYgKChpNSB8IDApID09IDcpIGJyZWFrOwogIGk0ID0gaTEgPj4gMTsKICBpMyA9IGk4ICsgKGk1IDw8IDYpIHwgMDsKICBpMiA9IDA7CiAgd2hpbGUgKDEpIHsKICAgaWYgKChpMiB8IDApID49IChpNCB8IDApKSBicmVhazsKICAgX2hhc2hfMm5fbl9tYXNrKGk3ICsgKGkyIDw8IDUpIHwgMCwgaTcgKyAoaTIgPDwgNikgfCAwLCBpMykgfCAwOwogICBpMiA9IGkyICsgMSB8IDA7CiAgfQogIGlmICghKGkxICYgMSkpIGkxID0gaTQ7IGVsc2UgewogICBpMyA9IGk3ICsgKGk0IDw8IDUpIHwgMDsKICAgaTEgPSBpNyArICgoaTEgPDwgNSkgKyAtMzIpIHwgMDsKICAgaTIgPSBpMyArIDMyIHwgMDsKICAgZG8gewogICAgU0FGRV9IRUFQX1NUT1JFKGkzID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMSA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogICAgaTMgPSBpMyArIDEgfCAwOwogICAgaTEgPSBpMSArIDEgfCAwOwogICB9IHdoaWxlICgoaTMgfCAwKSA8IChpMiB8IDApKTsKICAgaTEgPSBpNCArIDEgfCAwOwogIH0KICBpNSA9IGk1ICsgMSB8IDA7CiB9CiBpMyA9IGk2OwogaTEgPSBpNzsKIGkyID0gaTMgKyAzMiB8IDA7CiBkbyB7CiAgU0FGRV9IRUFQX1NUT1JFKGkzID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMSA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogIGkzID0gaTMgKyAxIHwgMDsKICBpMSA9IGkxICsgMSB8IDA7CiB9IHdoaWxlICgoaTMgfCAwKSA8IChpMiB8IDApKTsKIHJldHVybjsKfQoKZnVuY3Rpb24gX2JsYWtlMjU2X2luaXQoaTEpIHsKIGkxID0gaTEgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGkxIHwgMCwgMTc3OTAzMzcwMyB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgNCB8IDAsIC0xMTUwODMzMDE5IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyA4IHwgMCwgMTAxMzkwNDI0MiB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMTIgfCAwLCAtMTUyMTQ4NjUzNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMTYgfCAwLCAxMzU5ODkzMTE5IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAyMCB8IDAsIC0xNjk0MTQ0MzcyIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAyNCB8IDAsIDUyODczNDYzNSB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMjggfCAwLCAxNTQxNDU5MjI1IHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAzMiB8IDAsIDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDMyICsgNCB8IDAsIDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDMyICsgOCB8IDAsIDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDMyICsgMTIgfCAwLCAwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAzMiArIDE2IHwgMCwgMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgMzIgKyAyMCB8IDAsIDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDMyICsgMjQgfCAwLCAwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyAzMiArIDI4IHwgMCwgMCB8IDAsIDQpOwogcmV0dXJuOwp9CgpmdW5jdGlvbiBfaGFzaF9uX24oaTMsIGkyKSB7CiBpMyA9IGkzIHwgMDsKIGkyID0gaTIgfCAwOwogdmFyIGkxID0gMCwgaTQgPSAwOwogaTQgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA2NCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coNjQpOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMzIpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpNCArIGkxID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMiArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgU0FGRV9IRUFQX1NUT1JFKGk0ICsgKGkxICsgMzIpID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRCgyODI3ICsgaTEgPj4gMCB8IDAsIDEsIDApIHwgMCB8IDAgfCAwLCAxKTsKICBpMSA9IGkxICsgMSB8IDA7CiB9CiBfY2hhY2hhX3Blcm11dGUoaTQsIGk0KTsKIGkxID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKChpMSB8IDApID09IDMyKSBicmVhazsKICBTQUZFX0hFQVBfU1RPUkUoaTMgKyBpMSA+PiAwIHwgMCwgU0FGRV9IRUFQX0xPQUQoaTQgKyBpMSA+PiAwIHwgMCwgMSwgMCkgfCAwIHwgMCB8IDAsIDEpOwogIGkxID0gaTEgKyAxIHwgMDsKIH0KIFNUQUNLVE9QID0gaTQ7CiByZXR1cm4gMDsKfQoKZnVuY3Rpb24gX0VDUllQVF9pdnNldHVwKGkxLCBpMikgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIFNBRkVfSEVBUF9TVE9SRShpMSArIDQ4IHwgMCwgMCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgNTIgfCAwLCAwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTEgKyA1NiB8IDAsIChTQUZFX0hFQVBfTE9BRChpMiArIDEgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIDw8IDggfCAoU0FGRV9IRUFQX0xPQUQoaTIgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgMiA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkgPDwgMTYgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyAzID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSA8PCAyNCB8IDAsIDQpOwogU0FGRV9IRUFQX1NUT1JFKGkxICsgNjAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTIgKyA1ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSA8PCA4IHwgKFNBRkVfSEVBUF9MT0FEKGkyICsgNCA+PiAwIHwgMCwgMSwgMSkgfCAwIHwgMCkgfCAoU0FGRV9IRUFQX0xPQUQoaTIgKyA2ID4+IDAgfCAwLCAxLCAxKSB8IDAgfCAwKSA8PCAxNiB8IChTQUZFX0hFQVBfTE9BRChpMiArIDcgPj4gMCB8IDAsIDEsIDEpIHwgMCB8IDApIDw8IDI0IHwgMCwgNCk7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9jcnlwdG9fc3RyZWFtX2NoYWNoYTEyX3JlZihpMywgaTQsIGk1LCBpMSwgaTIpIHsKIGkzID0gaTMgfCAwOwogaTQgPSBpNCB8IDA7CiBpNSA9IGk1IHwgMDsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiB2YXIgaTYgPSAwLCBpNyA9IDA7CiBpNiA9IFNUQUNLVE9QOwogU1RBQ0tUT1AgPSBTVEFDS1RPUCArIDY0IHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdyg2NCk7CiBfRUNSWVBUX2tleXNldHVwKGk2LCBpMiwgMjU2LCA2NCk7CiBfRUNSWVBUX2l2c2V0dXAoaTYsIGkxKTsKIGkxID0gMDsKIGkyID0gMDsKIHdoaWxlICgxKSB7CiAgaWYgKCEoaTEgPj4+IDAgPCBpNSA+Pj4gMCB8IChpMSB8IDApID09IChpNSB8IDApICYgaTIgPj4+IDAgPCBpNCA+Pj4gMCkpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpMyArIGkyID4+IDAgfCAwLCAwIHwgMCwgMSk7CiAgaTcgPSBfaTY0QWRkKGkyIHwgMCwgaTEgfCAwLCAxLCAwKSB8IDA7CiAgaTEgPSB0ZW1wUmV0MDsKICBpMiA9IGk3OwogfQogX0VDUllQVF9lbmNyeXB0X2J5dGVzKGk2LCBpMywgaTMsIGk0KTsKIFNUQUNLVE9QID0gaTY7CiByZXR1cm4gMDsKfQoKZnVuY3Rpb24gX2NyeXB0b19zaWduX3NwaGluY3Nfa2V5cGFpcihpMSwgaTIpIHsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiB2YXIgaTMgPSAwOwogaTMgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyAzMiB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coMzIpOwogX3JhbmRvbWJ5dGVzKGkyLCAxMDg4LCAwKTsKIF9tZW1jcHkoaTEgfCAwLCBpMiArIDMyIHwgMCwgMTAyNCkgfCAwOwogU0FGRV9IRUFQX1NUT1JFKGkzIHwgMCwgMTEgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMyArIDggfCAwLCAwIHwgMCwgNCk7CiBTQUZFX0hFQVBfU1RPUkUoaTMgKyA4ICsgNCB8IDAsIDAgfCAwLCA0KTsKIFNBRkVfSEVBUF9TVE9SRShpMyArIDE2IHwgMCwgMCB8IDAsIDQpOwogX3RyZWVoYXNoKGkxICsgMTAyNCB8IDAsIGkyLCBpMywgaTEpOwogU1RBQ0tUT1AgPSBpMzsKIHJldHVybiAwOwp9CgpmdW5jdGlvbiBfaGFzaF8ybl9uX21hc2soaTIsIGkzLCBpNCkgewogaTIgPSBpMiB8IDA7CiBpMyA9IGkzIHwgMDsKIGk0ID0gaTQgfCAwOwogdmFyIGkxID0gMCwgaTUgPSAwOwogaTUgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyA2NCB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coNjQpOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gNjQpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpNSArIGkxID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyBpMSA+PiAwIHwgMCwgMSwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMyArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDApIHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogX2hhc2hfMm5fbihpMiwgaTUpIHwgMDsKIFNUQUNLVE9QID0gaTU7CiByZXR1cm4gMDsKfQoKZnVuY3Rpb24gX2hhc2hfbl9uX21hc2soaTIsIGkzLCBpNCkgewogaTIgPSBpMiB8IDA7CiBpMyA9IGkzIHwgMDsKIGk0ID0gaTQgfCAwOwogdmFyIGkxID0gMCwgaTUgPSAwOwogaTUgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyAzMiB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coMzIpOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMzIpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpNSArIGkxID4+IDAgfCAwLCAoU0FGRV9IRUFQX0xPQUQoaTQgKyBpMSA+PiAwIHwgMCwgMSwgMCkgfCAwKSBeIChTQUZFX0hFQVBfTE9BRChpMyArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDApIHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogX2hhc2hfbl9uKGkyLCBpNSkgfCAwOwogU1RBQ0tUT1AgPSBpNTsKIHJldHVybiAwOwp9CgpmdW5jdGlvbiBfc2JyayhpMSkgewogaTEgPSBpMSB8IDA7CiB2YXIgaTIgPSAwOwogaTIgPSBTQUZFX0hFQVBfTE9BRChEWU5BTUlDVE9QX1BUUiB8IDAsIDQsIDApIHwgMCB8IDA7CiBpZiAoKGkxIHwgMCkgPiAwICYgKGkyICsgaTEgfCAwKSA8IChpMiB8IDApIHwgKGkyICsgaTEgfCAwKSA8IDApIHsKICBhYm9ydE9uQ2Fubm90R3Jvd01lbW9yeSgpIHwgMDsKICBfX19zZXRFcnJObygxMik7CiAgcmV0dXJuIC0xOwogfQogU0FGRV9IRUFQX1NUT1JFKERZTkFNSUNUT1BfUFRSIHwgMCwgaTIgKyBpMSB8IDAsIDQpOwogaWYgKChpMiArIGkxIHwgMCkgPiAoZ2V0VG90YWxNZW1vcnkoKSB8IDApKSBpZiAoIShlbmxhcmdlTWVtb3J5KCkgfCAwKSkgewogIFNBRkVfSEVBUF9TVE9SRShEWU5BTUlDVE9QX1BUUiB8IDAsIGkyIHwgMCwgNCk7CiAgX19fc2V0RXJyTm8oMTIpOwogIHJldHVybiAtMTsKIH0KIHJldHVybiBpMiB8IDA7Cn0KCmZ1bmN0aW9uIFNBRkVfSEVBUF9MT0FEKGkyLCBpMSwgaTMpIHsKIGkyID0gaTIgfCAwOwogaTEgPSBpMSB8IDA7CiBpMyA9IGkzIHwgMDsKIGlmICgoaTIgfCAwKSA8PSAwKSBzZWdmYXVsdCgpOwogaWYgKChpMiArIGkxIHwgMCkgPiAoSEVBUDMyW0RZTkFNSUNUT1BfUFRSID4+IDJdIHwgMCkpIHNlZ2ZhdWx0KCk7CiBpZiAoKGkxIHwgMCkgPT0gNCkgewogIGlmIChpMiAmIDMpIGFsaWduZmF1bHQoKTsKICByZXR1cm4gSEVBUDMyW2kyID4+IDJdIHwgMDsKIH0gZWxzZSBpZiAoKGkxIHwgMCkgPT0gMSkgaWYgKGkzKSByZXR1cm4gSEVBUFU4W2kyID4+IDBdIHwgMDsgZWxzZSByZXR1cm4gSEVBUDhbaTIgPj4gMF0gfCAwOwogaWYgKGkyICYgMSkgYWxpZ25mYXVsdCgpOwogaWYgKGkzKSByZXR1cm4gSEVBUFUxNltpMiA+PiAxXSB8IDA7CiByZXR1cm4gSEVBUDE2W2kyID4+IDFdIHwgMDsKfQoKZnVuY3Rpb24gX2dlbl9jaGFpbihpMywgaTIsIGk0LCBpNSkgewogaTMgPSBpMyB8IDA7CiBpMiA9IGkyIHwgMDsKIGk0ID0gaTQgfCAwOwogaTUgPSBpNSB8IDA7CiB2YXIgaTEgPSAwOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gMzIpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpMyArIGkxID4+IDAgfCAwLCBTQUZFX0hFQVBfTE9BRChpMiArIGkxID4+IDAgfCAwLCAxLCAwKSB8IDAgfCAwIHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoISgoaTEgfCAwKSA8IChpNSB8IDApICYgaTEgPj4+IDAgPCAxNikpIGJyZWFrOwogIF9oYXNoX25fbl9tYXNrKGkzLCBpMywgaTQgKyAoaTEgPDwgNSkgfCAwKSB8IDA7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogcmV0dXJuOwp9CgpmdW5jdGlvbiBfY3J5cHRvX2hhc2hfYmxha2U1MTJfcmVmKGkxLCBpMiwgaTMsIGk0KSB7CiBpMSA9IGkxIHwgMDsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpNCA9IGk0IHwgMDsKIHZhciBpNSA9IDA7CiBpNSA9IFNUQUNLVE9QOwogU1RBQ0tUT1AgPSBTVEFDS1RPUCArIDI1NiB8IDA7CiBpZiAoKFNUQUNLVE9QIHwgMCkgPj0gKFNUQUNLX01BWCB8IDApKSBhYm9ydFN0YWNrT3ZlcmZsb3coMjU2KTsKIF9ibGFrZTUxMl9pbml0KGk1KTsKIGk0ID0gX2JpdHNoaWZ0NjRTaGwoaTMgfCAwLCBpNCB8IDAsIDMpIHwgMDsKIF9ibGFrZTUxMl91cGRhdGUoaTUsIGkyLCBpNCwgdGVtcFJldDApOwogX2JsYWtlNTEyX2ZpbmFsKGk1LCBpMSk7CiBTVEFDS1RPUCA9IGk1OwogcmV0dXJuIDA7Cn0KCmZ1bmN0aW9uIF9jcnlwdG9faGFzaF9ibGFrZTI1Nl9yZWYoaTEsIGkyLCBpMywgaTQpIHsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiBpMyA9IGkzIHwgMDsKIGk0ID0gaTQgfCAwOwogdmFyIGk1ID0gMDsKIGk1ID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgMTI4IHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdygxMjgpOwogX2JsYWtlMjU2X2luaXQoaTUpOwogaTQgPSBfYml0c2hpZnQ2NFNobChpMyB8IDAsIGk0IHwgMCwgMykgfCAwOwogX2JsYWtlMjU2X3VwZGF0ZShpNSwgaTIsIGk0LCB0ZW1wUmV0MCk7CiBfYmxha2UyNTZfZmluYWwoaTUsIGkxKTsKIFNUQUNLVE9QID0gaTU7CiByZXR1cm4gMDsKfQoKZnVuY3Rpb24gU0FGRV9IRUFQX1NUT1JFKGkyLCBpMywgaTEpIHsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpMSA9IGkxIHwgMDsKIGlmICgoaTIgfCAwKSA8PSAwKSBzZWdmYXVsdCgpOwogaWYgKChpMiArIGkxIHwgMCkgPiAoSEVBUDMyW0RZTkFNSUNUT1BfUFRSID4+IDJdIHwgMCkpIHNlZ2ZhdWx0KCk7CiBpZiAoKGkxIHwgMCkgPT0gNCkgewogIGlmIChpMiAmIDMpIGFsaWduZmF1bHQoKTsKICBIRUFQMzJbaTIgPj4gMl0gPSBpMzsKIH0gZWxzZSBpZiAoKGkxIHwgMCkgPT0gMSkgSEVBUDhbaTIgPj4gMF0gPSBpMzsgZWxzZSB7CiAgaWYgKGkyICYgMSkgYWxpZ25mYXVsdCgpOwogIEhFQVAxNltpMiA+PiAxXSA9IGkzOwogfQp9CgpmdW5jdGlvbiBfZ2VuX2xlYWZfd290cyhpMSwgaTIsIGkzLCBpNCkgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogaTQgPSBpNCB8IDA7CiB2YXIgaTUgPSAwOwogaTUgPSBTVEFDS1RPUDsKIFNUQUNLVE9QID0gU1RBQ0tUT1AgKyAyMTc2IHwgMDsKIGlmICgoU1RBQ0tUT1AgfCAwKSA+PSAoU1RBQ0tfTUFYIHwgMCkpIGFib3J0U3RhY2tPdmVyZmxvdygyMTc2KTsKIF9nZXRfc2VlZChpNSArIDIxNDQgfCAwLCBpMywgaTQpOwogX3dvdHNfcGtnZW4oaTUsIGk1ICsgMjE0NCB8IDAsIGkyKTsKIF9sX3RyZWUoaTEsIGk1LCBpMik7CiBTVEFDS1RPUCA9IGk1OwogcmV0dXJuOwp9CgpmdW5jdGlvbiBTQUZFX0hFQVBfU1RPUkVfRChpMiwgZDMsIGkxKSB7CiBpMiA9IGkyIHwgMDsKIGQzID0gK2QzOwogaTEgPSBpMSB8IDA7CiBpZiAoKGkyIHwgMCkgPD0gMCkgc2VnZmF1bHQoKTsKIGlmICgoaTIgKyBpMSB8IDApID4gKEhFQVAzMltEWU5BTUlDVE9QX1BUUiA+PiAyXSB8IDApKSBzZWdmYXVsdCgpOwogaWYgKChpMSB8IDApID09IDgpIHsKICBpZiAoaTIgJiA3KSBhbGlnbmZhdWx0KCk7CiAgSEVBUEY2NFtpMiA+PiAzXSA9IGQzOwogfSBlbHNlIHsKICBpZiAoaTIgJiAzKSBhbGlnbmZhdWx0KCk7CiAgSEVBUEYzMltpMiA+PiAyXSA9IGQzOwogfQp9CgpmdW5jdGlvbiBfemVyb2J5dGVzKGk0LCBpMSwgaTIpIHsKIGk0ID0gaTQgfCAwOwogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIHZhciBpMyA9IDAsIGk1ID0gMDsKIGkzID0gaTQ7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSAwICYgKGkyIHwgMCkgPT0gMCkgYnJlYWs7CiAgaTUgPSBfaTY0QWRkKGkxIHwgMCwgaTIgfCAwLCAtMSwgLTEpIHwgMDsKICBTQUZFX0hFQVBfU1RPUkUoaTMgPj4gMCB8IDAsIDAgfCAwLCAxKTsKICBpMyA9IGkzICsgMSB8IDA7CiAgaTEgPSBpNTsKICBpMiA9IHRlbXBSZXQwOwogfQogcmV0dXJuIGk0IHwgMDsKfQoKZnVuY3Rpb24gU0FGRV9IRUFQX0xPQURfRChpMiwgaTEpIHsKIGkyID0gaTIgfCAwOwogaTEgPSBpMSB8IDA7CiBpZiAoKGkyIHwgMCkgPD0gMCkgc2VnZmF1bHQoKTsKIGlmICgoaTIgKyBpMSB8IDApID4gKEhFQVAzMltEWU5BTUlDVE9QX1BUUiA+PiAyXSB8IDApKSBzZWdmYXVsdCgpOwogaWYgKChpMSB8IDApID09IDgpIHsKICBpZiAoaTIgJiA3KSBhbGlnbmZhdWx0KCk7CiAgcmV0dXJuICtIRUFQRjY0W2kyID4+IDNdOwogfQogaWYgKGkyICYgMykgYWxpZ25mYXVsdCgpOwogcmV0dXJuICtIRUFQRjMyW2kyID4+IDJdOwp9CgpmdW5jdGlvbiBfd290c19wa2dlbihpMiwgaTEsIGkzKSB7CiBpMiA9IGkyIHwgMDsKIGkxID0gaTEgfCAwOwogaTMgPSBpMyB8IDA7CiB2YXIgaTQgPSAwOwogX2V4cGFuZF9zZWVkXzE1KGkyLCBpMSk7CiBpMSA9IDA7CiB3aGlsZSAoMSkgewogIGlmICgoaTEgfCAwKSA9PSA2NykgYnJlYWs7CiAgaTQgPSBpMiArIChpMSA8PCA1KSB8IDA7CiAgX2dlbl9jaGFpbihpNCwgaTQsIGkzLCAxNSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogcmV0dXJuOwp9CgpmdW5jdGlvbiBydW5Qb3N0U2V0cygpIHt9CmZ1bmN0aW9uIF9iaXRzaGlmdDY0THNocihpMywgaTIsIGkxKSB7CiBpMyA9IGkzIHwgMDsKIGkyID0gaTIgfCAwOwogaTEgPSBpMSB8IDA7CiBpZiAoKGkxIHwgMCkgPCAzMikgewogIHRlbXBSZXQwID0gaTIgPj4+IGkxOwogIHJldHVybiBpMyA+Pj4gaTEgfCAoaTIgJiAoMSA8PCBpMSkgLSAxKSA8PCAzMiAtIGkxOwogfQogdGVtcFJldDAgPSAwOwogcmV0dXJuIGkyID4+PiBpMSAtIDMyIHwgMDsKfQoKZnVuY3Rpb24gX3JhbmRvbWJ5dGVzX2J1ZihpMiwgaTMpIHsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiB2YXIgaTEgPSAwOwogaTEgPSAwOwogd2hpbGUgKDEpIHsKICBpZiAoKGkxIHwgMCkgPT0gKGkzIHwgMCkpIGJyZWFrOwogIFNBRkVfSEVBUF9TVE9SRShpMiArIGkxID4+IDAgfCAwLCBfcmFuZG9tYnl0ZXNfcmFuZG9tKCkgfCAwIHwgMCwgMSk7CiAgaTEgPSBpMSArIDEgfCAwOwogfQogcmV0dXJuOwp9CgpmdW5jdGlvbiBfYml0c2hpZnQ2NFNobChpMywgaTIsIGkxKSB7CiBpMyA9IGkzIHwgMDsKIGkyID0gaTIgfCAwOwogaTEgPSBpMSB8IDA7CiBpZiAoKGkxIHwgMCkgPCAzMikgewogIHRlbXBSZXQwID0gaTIgPDwgaTEgfCAoaTMgJiAoMSA8PCBpMSkgLSAxIDw8IDMyIC0gaTEpID4+PiAzMiAtIGkxOwogIHJldHVybiBpMyA8PCBpMTsKIH0KIHRlbXBSZXQwID0gaTMgPDwgaTEgLSAzMjsKIHJldHVybiAwOwp9CmZ1bmN0aW9uIHN0YWNrQWxsb2MoaTIpIHsKIGkyID0gaTIgfCAwOwogdmFyIGkxID0gMDsKIGkxID0gU1RBQ0tUT1A7CiBTVEFDS1RPUCA9IFNUQUNLVE9QICsgaTIgfCAwOwogU1RBQ0tUT1AgPSBTVEFDS1RPUCArIDE1ICYgLTE2OwogaWYgKChTVEFDS1RPUCB8IDApID49IChTVEFDS19NQVggfCAwKSkgYWJvcnRTdGFja092ZXJmbG93KGkyIHwgMCk7CiByZXR1cm4gaTEgfCAwOwp9CgpmdW5jdGlvbiBfcmFuZG9tYnl0ZXMoaTEsIGkyLCBpMykgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogaWYgKGkzID4+PiAwIDwgMSB8IChpMyB8IDApID09IDEgJiBpMiA+Pj4gMCA8IDApIHsKICBfcmFuZG9tYnl0ZXNfYnVmKGkxLCBpMik7CiAgcmV0dXJuOwogfSBlbHNlIF9fX2Fzc2VydF9mYWlsKDE5NzYsIDE5OTYsIDIwNCwgMjA0Nik7Cn0KCmZ1bmN0aW9uIF9pNjRTdWJ0cmFjdChpMSwgaTIsIGkzLCBpNCkgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogaTQgPSBpNCB8IDA7CiBpNCA9IGkyIC0gaTQgLSAoaTMgPj4+IDAgPiBpMSA+Pj4gMCB8IDApID4+PiAwOwogcmV0dXJuICh0ZW1wUmV0MCA9IGk0LCBpMSAtIGkzID4+PiAwIHwgMCkgfCAwOwp9CgpmdW5jdGlvbiBfaTY0QWRkKGkxLCBpMiwgaTMsIGk0KSB7CiBpMSA9IGkxIHwgMDsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpNCA9IGk0IHwgMDsKIHJldHVybiAodGVtcFJldDAgPSBpMiArIGk0ICsgKGkxICsgaTMgPj4+IDAgPj4+IDAgPCBpMSA+Pj4gMCB8IDApID4+PiAwLCBpMSArIGkzID4+PiAwIHwgMCkgfCAwOwp9CgpmdW5jdGlvbiBfc3BoaW5jc2pzX29wZW4oaTEsIGkyLCBpMywgaTQsIGk1KSB7CiBpMSA9IGkxIHwgMDsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpNCA9IGk0IHwgMDsKIGk1ID0gaTUgfCAwOwogcmV0dXJuIF9jcnlwdG9fc2lnbl9zcGhpbmNzX29wZW4oaTEsIGkyLCBpMywgaTQsIDAsIGk1KSB8IDA7Cn0KCmZ1bmN0aW9uIF9zcGhpbmNzanNfc2lnbihpMSwgaTIsIGkzLCBpNCwgaTUpIHsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiBpMyA9IGkzIHwgMDsKIGk0ID0gaTQgfCAwOwogaTUgPSBpNSB8IDA7CiByZXR1cm4gX2NyeXB0b19zaWduX3NwaGluY3MoaTEsIGkyLCBpMywgaTQsIDAsIGk1KSB8IDA7Cn0KCmZ1bmN0aW9uIF92YXJsZW5faGFzaChpMSwgaTIsIGkzLCBpNCkgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogaTQgPSBpNCB8IDA7CiBfY3J5cHRvX2hhc2hfYmxha2UyNTZfcmVmKGkxLCBpMiwgaTMsIGk0KSB8IDA7CiByZXR1cm4gMDsKfQoKZnVuY3Rpb24gX3ByZyhpMSwgaTIsIGkzLCBpNCkgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIGkzID0gaTMgfCAwOwogaTQgPSBpNCB8IDA7CiBfY3J5cHRvX3N0cmVhbV9jaGFjaGExMl9yZWYoaTEsIGkyLCBpMywgMzM2MCwgaTQpIHwgMDsKIHJldHVybjsKfQoKZnVuY3Rpb24gX21zZ19oYXNoKGkxLCBpMiwgaTMsIGk0KSB7CiBpMSA9IGkxIHwgMDsKIGkyID0gaTIgfCAwOwogaTMgPSBpMyB8IDA7CiBpNCA9IGk0IHwgMDsKIF9jcnlwdG9faGFzaF9ibGFrZTUxMl9yZWYoaTEsIGkyLCBpMywgaTQpIHwgMDsKIHJldHVybiAwOwp9CgpmdW5jdGlvbiBTQUZFX0ZUX01BU0soaTIsIGkxKSB7CiBpMiA9IGkyIHwgMDsKIGkxID0gaTEgfCAwOwogaWYgKChpMiAmIGkxIHwgMCkgIT0gKGkyIHwgMCkpIGZ0ZmF1bHQoKTsKIHJldHVybiBpMiAmIGkxIHwgMDsKfQoKZnVuY3Rpb24gX3NwaGluY3Nqc19rZXlwYWlyKGkxLCBpMikgewogaTEgPSBpMSB8IDA7CiBpMiA9IGkyIHwgMDsKIHJldHVybiBfY3J5cHRvX3NpZ25fc3BoaW5jc19rZXlwYWlyKGkxLCBpMikgfCAwOwp9CgpmdW5jdGlvbiBzZXRUaHJldyhpMSwgaTIpIHsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiBpZiAoIV9fVEhSRVdfXykgewogIF9fVEhSRVdfXyA9IGkxOwogIHRocmV3VmFsdWUgPSBpMjsKIH0KfQoKZnVuY3Rpb24gZXN0YWJsaXNoU3RhY2tTcGFjZShpMSwgaTIpIHsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiBTVEFDS1RPUCA9IGkxOwogU1RBQ0tfTUFYID0gaTI7Cn0KCmZ1bmN0aW9uIF9leHBhbmRfc2VlZF8xNShpMSwgaTIpIHsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiBfcHJnKGkxLCAyMTQ0LCAwLCBpMik7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9leHBhbmRfc2VlZChpMSwgaTIpIHsKIGkxID0gaTEgfCAwOwogaTIgPSBpMiB8IDA7CiBfcHJnKGkxLCAyMDk3MTUyLCAwLCBpMik7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIHNldER5bmFtaWNUb3AoaTEpIHsKIGkxID0gaTEgfCAwOwogU0FGRV9IRUFQX1NUT1JFKERZTkFNSUNUT1BfUFRSIHwgMCwgaTEgfCAwLCA0KTsKfQoKZnVuY3Rpb24gX3JhbmRvbWJ5dGVzX3N0aXIoKSB7CiBfZW1zY3JpcHRlbl9hc21fY29uc3RfaSgxKSB8IDA7CiByZXR1cm47Cn0KCmZ1bmN0aW9uIF9yYW5kb21ieXRlc19yYW5kb20oKSB7CiByZXR1cm4gX2Vtc2NyaXB0ZW5fYXNtX2NvbnN0X2koMCkgfCAwOwp9CgpmdW5jdGlvbiBfc3BoaW5jc2pzX2luaXQoKSB7CiBfcmFuZG9tYnl0ZXNfc3RpcigpOwogcmV0dXJuOwp9CgpmdW5jdGlvbiBzdGFja1Jlc3RvcmUoaTEpIHsKIGkxID0gaTEgfCAwOwogU1RBQ0tUT1AgPSBpMTsKfQoKZnVuY3Rpb24gc2V0VGVtcFJldDAoaTEpIHsKIGkxID0gaTEgfCAwOwogdGVtcFJldDAgPSBpMTsKfQoKZnVuY3Rpb24gX3NwaGluY3Nqc19zZWNyZXRfa2V5X2J5dGVzKCkgewogcmV0dXJuIDEwODg7Cn0KCmZ1bmN0aW9uIF9zcGhpbmNzanNfcHVibGljX2tleV9ieXRlcygpIHsKIHJldHVybiAxMDU2Owp9CgpmdW5jdGlvbiBfc3BoaW5jc2pzX3NpZ25hdHVyZV9ieXRlcygpIHsKIHJldHVybiA0MWUzOwp9CgpmdW5jdGlvbiBnZXRUZW1wUmV0MCgpIHsKIHJldHVybiB0ZW1wUmV0MCB8IDA7Cn0KCmZ1bmN0aW9uIHN0YWNrU2F2ZSgpIHsKIHJldHVybiBTVEFDS1RPUCB8IDA7Cn0KCi8vIEVNU0NSSVBURU5fRU5EX0ZVTkNTCgoKICByZXR1cm4geyBfYml0c2hpZnQ2NExzaHI6IF9iaXRzaGlmdDY0THNociwgX2JpdHNoaWZ0NjRTaGw6IF9iaXRzaGlmdDY0U2hsLCBfZnJlZTogX2ZyZWUsIF9pNjRBZGQ6IF9pNjRBZGQsIF9pNjRTdWJ0cmFjdDogX2k2NFN1YnRyYWN0LCBfbWFsbG9jOiBfbWFsbG9jLCBfbWVtY3B5OiBfbWVtY3B5LCBfbWVtc2V0OiBfbWVtc2V0LCBfc2JyazogX3NicmssIF9zcGhpbmNzanNfaW5pdDogX3NwaGluY3Nqc19pbml0LCBfc3BoaW5jc2pzX2tleXBhaXI6IF9zcGhpbmNzanNfa2V5cGFpciwgX3NwaGluY3Nqc19vcGVuOiBfc3BoaW5jc2pzX29wZW4sIF9zcGhpbmNzanNfcHVibGljX2tleV9ieXRlczogX3NwaGluY3Nqc19wdWJsaWNfa2V5X2J5dGVzLCBfc3BoaW5jc2pzX3NlY3JldF9rZXlfYnl0ZXM6IF9zcGhpbmNzanNfc2VjcmV0X2tleV9ieXRlcywgX3NwaGluY3Nqc19zaWduOiBfc3BoaW5jc2pzX3NpZ24sIF9zcGhpbmNzanNfc2lnbmF0dXJlX2J5dGVzOiBfc3BoaW5jc2pzX3NpZ25hdHVyZV9ieXRlcywgZXN0YWJsaXNoU3RhY2tTcGFjZTogZXN0YWJsaXNoU3RhY2tTcGFjZSwgZ2V0VGVtcFJldDA6IGdldFRlbXBSZXQwLCBydW5Qb3N0U2V0czogcnVuUG9zdFNldHMsIHNldER5bmFtaWNUb3A6IHNldER5bmFtaWNUb3AsIHNldFRlbXBSZXQwOiBzZXRUZW1wUmV0MCwgc2V0VGhyZXc6IHNldFRocmV3LCBzdGFja0FsbG9jOiBzdGFja0FsbG9jLCBzdGFja1Jlc3RvcmU6IHN0YWNrUmVzdG9yZSwgc3RhY2tTYXZlOiBzdGFja1NhdmUgfTsKfSkKOw==";
            if (typeof Module["locateFile"] === "function") {
                if (!isDataURI(wasmTextFile)) {
                    wasmTextFile = Module["locateFile"](wasmTextFile);
                }
                if (!isDataURI(wasmBinaryFile)) {
                    wasmBinaryFile = Module["locateFile"](wasmBinaryFile);
                }
                if (!isDataURI(asmjsCodeFile)) {
                    asmjsCodeFile = Module["locateFile"](asmjsCodeFile);
                }
            }
            var wasmPageSize = 64 * 1024;
            var info = {
                global: null,
                env: null,
                asm2wasm: asm2wasmImports,
                parent: Module
            };
            var exports = null;
            function mergeMemory(newBuffer) {
                var oldBuffer = Module["buffer"];
                if (newBuffer.byteLength < oldBuffer.byteLength) {
                    Module["printErr"]("the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here");
                }
                var oldView = new Int8Array(oldBuffer);
                var newView = new Int8Array(newBuffer);
                newView.set(oldView);
                updateGlobalBuffer(newBuffer);
                updateGlobalBufferViews();
            }
            function fixImports(imports) {
                return imports;
            }
            function getBinary() {
                try {
                    if (Module["wasmBinary"]) {
                        return new Uint8Array(Module["wasmBinary"]);
                    }
                    var binary = tryParseAsDataURI(wasmBinaryFile);
                    if (binary) {
                        return binary;
                    }
                    if (Module["readBinary"]) {
                        return Module["readBinary"](wasmBinaryFile);
                    } else {
                        throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
                    }
                } catch (err) {
                    abort(err);
                }
            }
            function doNativeWasm(global, env, providedBuffer) {
                if (typeof WebAssembly !== "object") {
                    abort("No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.");
                    Module["printErr"]("no native wasm support detected");
                    return false;
                }
                if (!(Module["wasmMemory"] instanceof WebAssembly.Memory)) {
                    Module["printErr"]("no native wasm Memory in use");
                    return false;
                }
                env["memory"] = Module["wasmMemory"];
                info["global"] = {
                    NaN: NaN,
                    Infinity: Infinity
                };
                info["global.Math"] = Math;
                info["env"] = env;
                function receiveInstance(instance, module) {
                    exports = instance.exports;
                    if (exports.memory) mergeMemory(exports.memory);
                    Module["asm"] = exports;
                    Module["usingWasm"] = true;
                    removeRunDependency("wasm-instantiate");
                }
                addRunDependency("wasm-instantiate");
                if (Module["instantiateWasm"]) {
                    try {
                        return Module["instantiateWasm"](info, receiveInstance);
                    } catch (e) {
                        Module["printErr"]("Module.instantiateWasm callback failed with error: " + e);
                        return false;
                    }
                }
                var instance;
                try {
                    instance = new WebAssembly.Instance(new WebAssembly.Module(getBinary()), info);
                } catch (e) {
                    Module["printErr"]("failed to compile wasm module: " + e);
                    if (e.toString().indexOf("imported Memory with incompatible size") >= 0) {
                        Module["printErr"]("Memory size incompatibility issues may be due to changing TOTAL_MEMORY at runtime to something too large. Use ALLOW_MEMORY_GROWTH to allow any size memory (and also make sure not to set TOTAL_MEMORY at runtime to something smaller than it was at compile time).");
                    }
                    return false;
                }
                receiveInstance(instance);
                return exports;
            }
            Module["asmPreload"] = Module["asm"];
            var asmjsReallocBuffer = Module["reallocBuffer"];
            var wasmReallocBuffer = function(size) {
                var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
                size = alignUp(size, PAGE_MULTIPLE);
                var old = Module["buffer"];
                var oldSize = old.byteLength;
                if (Module["usingWasm"]) {
                    try {
                        var result = Module["wasmMemory"].grow((size - oldSize) / wasmPageSize);
                        if (result !== (-1 | 0)) {
                            return Module["buffer"] = Module["wasmMemory"].buffer;
                        } else {
                            return null;
                        }
                    } catch (e) {
                        console.error("Module.reallocBuffer: Attempted to grow from " + oldSize + " bytes to " + size + " bytes, but got error: " + e);
                        return null;
                    }
                }
            };
            Module["reallocBuffer"] = function(size) {
                if (finalMethod === "asmjs") {
                    return asmjsReallocBuffer(size);
                } else {
                    return wasmReallocBuffer(size);
                }
            };
            var finalMethod = "";
            Module["asm"] = function(global, env, providedBuffer) {
                env = fixImports(env);
                if (!env["table"]) {
                    var TABLE_SIZE = Module["wasmTableSize"];
                    if (TABLE_SIZE === undefined) TABLE_SIZE = 1024;
                    var MAX_TABLE_SIZE = Module["wasmMaxTableSize"];
                    if (typeof WebAssembly === "object" && typeof WebAssembly.Table === "function") {
                        if (MAX_TABLE_SIZE !== undefined) {
                            env["table"] = new WebAssembly.Table({
                                initial: TABLE_SIZE,
                                maximum: MAX_TABLE_SIZE,
                                element: "anyfunc"
                            });
                        } else {
                            env["table"] = new WebAssembly.Table({
                                initial: TABLE_SIZE,
                                element: "anyfunc"
                            });
                        }
                    } else {
                        env["table"] = new Array(TABLE_SIZE);
                    }
                    Module["wasmTable"] = env["table"];
                }
                if (!env["memoryBase"]) {
                    env["memoryBase"] = Module["STATIC_BASE"];
                }
                if (!env["tableBase"]) {
                    env["tableBase"] = 0;
                }
                var exports;
                exports = doNativeWasm(global, env, providedBuffer);
                assert(exports, "no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods");
                return exports;
            };
        }
        integrateWasmJS();
        var ASM_CONSTS = [ function() {
            return Module.getRandomValue();
        }, function() {
            if (Module.getRandomValue === undefined) {
                try {
                    var window_ = "object" === typeof window ? window : self;
                    var crypto_ = typeof window_.crypto !== "undefined" ? window_.crypto : window_.msCrypto;
                    var randomValuesStandard = function() {
                        var buf = new Uint32Array(1);
                        crypto_.getRandomValues(buf);
                        return buf[0] >>> 0;
                    };
                    randomValuesStandard();
                    Module.getRandomValue = randomValuesStandard;
                } catch (e) {
                    try {
                        var crypto = eval("require")("crypto");
                        var randomValueNodeJS = function() {
                            var buf = crypto["randomBytes"](4);
                            return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0;
                        };
                        randomValueNodeJS();
                        Module.getRandomValue = randomValueNodeJS;
                    } catch (e) {
                        throw "No secure random number generator found";
                    }
                }
            }
        } ];
        function _emscripten_asm_const_i(code) {
            return ASM_CONSTS[code]();
        }
        STATIC_BASE = GLOBAL_BASE;
        STATICTOP = STATIC_BASE + 3376;
        __ATINIT__.push();
        var STATIC_BUMP = 3376;
        Module["STATIC_BASE"] = STATIC_BASE;
        Module["STATIC_BUMP"] = STATIC_BUMP;
        var tempDoublePtr = STATICTOP;
        STATICTOP += 16;
        assert(tempDoublePtr % 8 == 0);
        function ___assert_fail(condition, filename, line, func) {
            abort("Assertion failed: " + Pointer_stringify(condition) + ", at: " + [ filename ? Pointer_stringify(filename) : "unknown filename", line, func ? Pointer_stringify(func) : "unknown function" ]);
        }
        function ___errno_location() {
            Module["printErr"]("missing function: __errno_location");
            abort(-1);
        }
        function _llvm_stackrestore(p) {
            var self = _llvm_stacksave;
            var ret = self.LLVM_SAVEDSTACKS[p];
            self.LLVM_SAVEDSTACKS.splice(p, 1);
            stackRestore(ret);
        }
        function _llvm_stacksave() {
            var self = _llvm_stacksave;
            if (!self.LLVM_SAVEDSTACKS) {
                self.LLVM_SAVEDSTACKS = [];
            }
            self.LLVM_SAVEDSTACKS.push(stackSave());
            return self.LLVM_SAVEDSTACKS.length - 1;
        }
        function _emscripten_memcpy_big(dest, src, num) {
            HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
            return dest;
        }
        function ___setErrNo(value) {
            if (Module["___errno_location"]) SAFE_HEAP_STORE(Module["___errno_location"]() | 0, value | 0, 4); else Module.printErr("failed to set errno from JS");
            return value;
        }
        DYNAMICTOP_PTR = staticAlloc(4);
        STACK_BASE = STACKTOP = alignMemory(STATICTOP);
        STACK_MAX = STACK_BASE + TOTAL_STACK;
        DYNAMIC_BASE = alignMemory(STACK_MAX);
        HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
        staticSealed = true;
        assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
        var ASSERTIONS = true;
        function intArrayToString(array) {
            var ret = [];
            for (var i = 0; i < array.length; i++) {
                var chr = array[i];
                if (chr > 255) {
                    if (ASSERTIONS) {
                        assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.");
                    }
                    chr &= 255;
                }
                ret.push(String.fromCharCode(chr));
            }
            return ret.join("");
        }
        var decodeBase64 = typeof atob === "function" ? atob : function(input) {
            var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));
                chr1 = enc1 << 2 | enc2 >> 4;
                chr2 = (enc2 & 15) << 4 | enc3 >> 2;
                chr3 = (enc3 & 3) << 6 | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 !== 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 !== 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);
            return output;
        };
        function intArrayFromBase64(s) {
            if (typeof ENVIRONMENT_IS_NODE === "boolean" && ENVIRONMENT_IS_NODE) {
                var buf;
                try {
                    buf = Buffer.from(s, "base64");
                } catch (_) {
                    buf = new Buffer(s, "base64");
                }
                return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            }
            try {
                var decoded = decodeBase64(s);
                var bytes = new Uint8Array(decoded.length);
                for (var i = 0; i < decoded.length; ++i) {
                    bytes[i] = decoded.charCodeAt(i);
                }
                return bytes;
            } catch (_) {
                throw new Error("Converting base64 string to bytes failed.");
            }
        }
        function tryParseAsDataURI(filename) {
            if (!isDataURI(filename)) {
                return;
            }
            return intArrayFromBase64(filename.slice(dataURIPrefix.length));
        }
        Module["wasmTableSize"] = 0;
        Module["wasmMaxTableSize"] = 0;
        Module.asmGlobalArg = {};
        Module.asmLibraryArg = {
            enlargeMemory: enlargeMemory,
            getTotalMemory: getTotalMemory,
            abortOnCannotGrowMemory: abortOnCannotGrowMemory,
            abortStackOverflow: abortStackOverflow,
            segfault: segfault,
            alignfault: alignfault,
            ___assert_fail: ___assert_fail,
            ___errno_location: ___errno_location,
            ___setErrNo: ___setErrNo,
            _emscripten_asm_const_i: _emscripten_asm_const_i,
            _emscripten_memcpy_big: _emscripten_memcpy_big,
            _llvm_stackrestore: _llvm_stackrestore,
            _llvm_stacksave: _llvm_stacksave,
            DYNAMICTOP_PTR: DYNAMICTOP_PTR,
            STACKTOP: STACKTOP,
            STACK_MAX: STACK_MAX
        };
        var asm = Module["asm"](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
        var real__bitshift64Lshr = asm["_bitshift64Lshr"];
        asm["_bitshift64Lshr"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__bitshift64Lshr.apply(null, arguments);
        };
        var real__bitshift64Shl = asm["_bitshift64Shl"];
        asm["_bitshift64Shl"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__bitshift64Shl.apply(null, arguments);
        };
        var real__free = asm["_free"];
        asm["_free"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__free.apply(null, arguments);
        };
        var real__i64Add = asm["_i64Add"];
        asm["_i64Add"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__i64Add.apply(null, arguments);
        };
        var real__i64Subtract = asm["_i64Subtract"];
        asm["_i64Subtract"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__i64Subtract.apply(null, arguments);
        };
        var real__malloc = asm["_malloc"];
        asm["_malloc"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__malloc.apply(null, arguments);
        };
        var real__sbrk = asm["_sbrk"];
        asm["_sbrk"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sbrk.apply(null, arguments);
        };
        var real__sphincsjs_init = asm["_sphincsjs_init"];
        asm["_sphincsjs_init"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_init.apply(null, arguments);
        };
        var real__sphincsjs_keypair = asm["_sphincsjs_keypair"];
        asm["_sphincsjs_keypair"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_keypair.apply(null, arguments);
        };
        var real__sphincsjs_open = asm["_sphincsjs_open"];
        asm["_sphincsjs_open"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_open.apply(null, arguments);
        };
        var real__sphincsjs_public_key_bytes = asm["_sphincsjs_public_key_bytes"];
        asm["_sphincsjs_public_key_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_public_key_bytes.apply(null, arguments);
        };
        var real__sphincsjs_secret_key_bytes = asm["_sphincsjs_secret_key_bytes"];
        asm["_sphincsjs_secret_key_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_secret_key_bytes.apply(null, arguments);
        };
        var real__sphincsjs_sign = asm["_sphincsjs_sign"];
        asm["_sphincsjs_sign"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_sign.apply(null, arguments);
        };
        var real__sphincsjs_signature_bytes = asm["_sphincsjs_signature_bytes"];
        asm["_sphincsjs_signature_bytes"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real__sphincsjs_signature_bytes.apply(null, arguments);
        };
        var real_establishStackSpace = asm["establishStackSpace"];
        asm["establishStackSpace"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_establishStackSpace.apply(null, arguments);
        };
        var real_getTempRet0 = asm["getTempRet0"];
        asm["getTempRet0"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_getTempRet0.apply(null, arguments);
        };
        var real_setDynamicTop = asm["setDynamicTop"];
        asm["setDynamicTop"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_setDynamicTop.apply(null, arguments);
        };
        var real_setTempRet0 = asm["setTempRet0"];
        asm["setTempRet0"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_setTempRet0.apply(null, arguments);
        };
        var real_setThrew = asm["setThrew"];
        asm["setThrew"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_setThrew.apply(null, arguments);
        };
        var real_stackAlloc = asm["stackAlloc"];
        asm["stackAlloc"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_stackAlloc.apply(null, arguments);
        };
        var real_stackRestore = asm["stackRestore"];
        asm["stackRestore"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_stackRestore.apply(null, arguments);
        };
        var real_stackSave = asm["stackSave"];
        asm["stackSave"] = function() {
            assert(runtimeInitialized, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
            assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
            return real_stackSave.apply(null, arguments);
        };
        var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
        var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
        var _free = Module["_free"] = asm["_free"];
        var _i64Add = Module["_i64Add"] = asm["_i64Add"];
        var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
        var _malloc = Module["_malloc"] = asm["_malloc"];
        var _sbrk = Module["_sbrk"] = asm["_sbrk"];
        var _sphincsjs_init = Module["_sphincsjs_init"] = asm["_sphincsjs_init"];
        var _sphincsjs_keypair = Module["_sphincsjs_keypair"] = asm["_sphincsjs_keypair"];
        var _sphincsjs_open = Module["_sphincsjs_open"] = asm["_sphincsjs_open"];
        var _sphincsjs_public_key_bytes = Module["_sphincsjs_public_key_bytes"] = asm["_sphincsjs_public_key_bytes"];
        var _sphincsjs_secret_key_bytes = Module["_sphincsjs_secret_key_bytes"] = asm["_sphincsjs_secret_key_bytes"];
        var _sphincsjs_sign = Module["_sphincsjs_sign"] = asm["_sphincsjs_sign"];
        var _sphincsjs_signature_bytes = Module["_sphincsjs_signature_bytes"] = asm["_sphincsjs_signature_bytes"];
        var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
        var getTempRet0 = Module["getTempRet0"] = asm["getTempRet0"];
        var setDynamicTop = Module["setDynamicTop"] = asm["setDynamicTop"];
        var setTempRet0 = Module["setTempRet0"] = asm["setTempRet0"];
        var setThrew = Module["setThrew"] = asm["setThrew"];
        var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
        var stackRestore = Module["stackRestore"] = asm["stackRestore"];
        var stackSave = Module["stackSave"] = asm["stackSave"];
        var MAGIC = 0;
        Math.random = function() {
            MAGIC = Math.pow(MAGIC + 1.8912, 3) % 1;
            return MAGIC;
        };
        var TIME = 1e4;
        Date.now = function() {
            return TIME++;
        };
        if (typeof performance === "object") performance.now = Date.now;
        if (!Module) Module = {};
        Module["thisProgram"] = "thisProgram";
        Module["asm"] = asm;
        if (!Module["intArrayFromString"]) Module["intArrayFromString"] = function() {
            abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["intArrayToString"]) Module["intArrayToString"] = function() {
            abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["ccall"]) Module["ccall"] = function() {
            abort("'ccall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["cwrap"]) Module["cwrap"] = function() {
            abort("'cwrap' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["setValue"]) Module["setValue"] = function() {
            abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getValue"]) Module["getValue"] = function() {
            abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["allocate"]) Module["allocate"] = function() {
            abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getMemory"]) Module["getMemory"] = function() {
            abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["Pointer_stringify"]) Module["Pointer_stringify"] = function() {
            abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["AsciiToString"]) Module["AsciiToString"] = function() {
            abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToAscii"]) Module["stringToAscii"] = function() {
            abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF8ArrayToString"]) Module["UTF8ArrayToString"] = function() {
            abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF8ToString"]) Module["UTF8ToString"] = function() {
            abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF8Array"]) Module["stringToUTF8Array"] = function() {
            abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF8"]) Module["stringToUTF8"] = function() {
            abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["lengthBytesUTF8"]) Module["lengthBytesUTF8"] = function() {
            abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF16ToString"]) Module["UTF16ToString"] = function() {
            abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF16"]) Module["stringToUTF16"] = function() {
            abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["lengthBytesUTF16"]) Module["lengthBytesUTF16"] = function() {
            abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["UTF32ToString"]) Module["UTF32ToString"] = function() {
            abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stringToUTF32"]) Module["stringToUTF32"] = function() {
            abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["lengthBytesUTF32"]) Module["lengthBytesUTF32"] = function() {
            abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["allocateUTF8"]) Module["allocateUTF8"] = function() {
            abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackTrace"]) Module["stackTrace"] = function() {
            abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnPreRun"]) Module["addOnPreRun"] = function() {
            abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnInit"]) Module["addOnInit"] = function() {
            abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnPreMain"]) Module["addOnPreMain"] = function() {
            abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnExit"]) Module["addOnExit"] = function() {
            abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addOnPostRun"]) Module["addOnPostRun"] = function() {
            abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["writeStringToMemory"]) Module["writeStringToMemory"] = function() {
            abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        Module["writeArrayToMemory"] = writeArrayToMemory;
        if (!Module["writeAsciiToMemory"]) Module["writeAsciiToMemory"] = function() {
            abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addRunDependency"]) Module["addRunDependency"] = function() {
            abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["removeRunDependency"]) Module["removeRunDependency"] = function() {
            abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS"]) Module["FS"] = function() {
            abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["FS_createFolder"]) Module["FS_createFolder"] = function() {
            abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createPath"]) Module["FS_createPath"] = function() {
            abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createDataFile"]) Module["FS_createDataFile"] = function() {
            abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createPreloadedFile"]) Module["FS_createPreloadedFile"] = function() {
            abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createLazyFile"]) Module["FS_createLazyFile"] = function() {
            abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createLink"]) Module["FS_createLink"] = function() {
            abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_createDevice"]) Module["FS_createDevice"] = function() {
            abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["FS_unlink"]) Module["FS_unlink"] = function() {
            abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");
        };
        if (!Module["GL"]) Module["GL"] = function() {
            abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["staticAlloc"]) Module["staticAlloc"] = function() {
            abort("'staticAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["dynamicAlloc"]) Module["dynamicAlloc"] = function() {
            abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["warnOnce"]) Module["warnOnce"] = function() {
            abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["loadDynamicLibrary"]) Module["loadDynamicLibrary"] = function() {
            abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["loadWebAssemblyModule"]) Module["loadWebAssemblyModule"] = function() {
            abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getLEB"]) Module["getLEB"] = function() {
            abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getFunctionTables"]) Module["getFunctionTables"] = function() {
            abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["alignFunctionTables"]) Module["alignFunctionTables"] = function() {
            abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["registerFunctions"]) Module["registerFunctions"] = function() {
            abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["addFunction"]) Module["addFunction"] = function() {
            abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["removeFunction"]) Module["removeFunction"] = function() {
            abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getFuncWrapper"]) Module["getFuncWrapper"] = function() {
            abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["prettyPrint"]) Module["prettyPrint"] = function() {
            abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["makeBigInt"]) Module["makeBigInt"] = function() {
            abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["dynCall"]) Module["dynCall"] = function() {
            abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["getCompilerSetting"]) Module["getCompilerSetting"] = function() {
            abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackSave"]) Module["stackSave"] = function() {
            abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackRestore"]) Module["stackRestore"] = function() {
            abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["stackAlloc"]) Module["stackAlloc"] = function() {
            abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["intArrayFromBase64"]) Module["intArrayFromBase64"] = function() {
            abort("'intArrayFromBase64' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["tryParseAsDataURI"]) Module["tryParseAsDataURI"] = function() {
            abort("'tryParseAsDataURI' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
        };
        if (!Module["ALLOC_NORMAL"]) Object.defineProperty(Module, "ALLOC_NORMAL", {
            get: function() {
                abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_STACK"]) Object.defineProperty(Module, "ALLOC_STACK", {
            get: function() {
                abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_STATIC"]) Object.defineProperty(Module, "ALLOC_STATIC", {
            get: function() {
                abort("'ALLOC_STATIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_DYNAMIC"]) Object.defineProperty(Module, "ALLOC_DYNAMIC", {
            get: function() {
                abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        if (!Module["ALLOC_NONE"]) Object.defineProperty(Module, "ALLOC_NONE", {
            get: function() {
                abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");
            }
        });
        function ExitStatus(status) {
            this.name = "ExitStatus";
            this.message = "Program terminated with exit(" + status + ")";
            this.status = status;
        }
        ExitStatus.prototype = new Error();
        ExitStatus.prototype.constructor = ExitStatus;
        var initialStackTop;
        dependenciesFulfilled = function runCaller() {
            if (!Module["calledRun"]) run();
            if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
        };
        function run(args) {
            args = args || Module["arguments"];
            if (runDependencies > 0) {
                return;
            }
            writeStackCookie();
            preRun();
            if (runDependencies > 0) return;
            if (Module["calledRun"]) return;
            function doRun() {
                if (Module["calledRun"]) return;
                Module["calledRun"] = true;
                if (ABORT) return;
                ensureInitRuntime();
                preMain();
                if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
                assert(!Module["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
                postRun();
            }
            if (Module["setStatus"]) {
                Module["setStatus"]("Running...");
                setTimeout(function() {
                    setTimeout(function() {
                        Module["setStatus"]("");
                    }, 1);
                    doRun();
                }, 1);
            } else {
                doRun();
            }
            checkStackCookie();
        }
        Module["run"] = run;
        function checkUnflushedContent() {
            var print = Module["print"];
            var printErr = Module["printErr"];
            var has = false;
            Module["print"] = Module["printErr"] = function(x) {
                has = true;
            };
            try {
                var flush = null;
                if (flush) flush(0);
            } catch (e) {}
            Module["print"] = print;
            Module["printErr"] = printErr;
            if (has) {
                warnOnce("stdio streams had content in them that was not flushed. you should set NO_EXIT_RUNTIME to 0 (see the FAQ), or make sure to emit a newline when you printf etc.");
            }
        }
        function exit(status, implicit) {
            checkUnflushedContent();
            if (implicit && Module["noExitRuntime"] && status === 0) {
                return;
            }
            if (Module["noExitRuntime"]) {
                if (!implicit) {
                    Module.printErr("exit(" + status + ") called, but NO_EXIT_RUNTIME is set, so halting execution but not exiting the runtime or preventing further async execution (build with NO_EXIT_RUNTIME=0, if you want a true shutdown)");
                }
            } else {
                ABORT = true;
                EXITSTATUS = status;
                STACKTOP = initialStackTop;
                exitRuntime();
                if (Module["onExit"]) Module["onExit"](status);
            }
            if (ENVIRONMENT_IS_NODE) {
                process["exit"](status);
            }
            Module["quit"](status, new ExitStatus(status));
        }
        Module["exit"] = exit;
        var abortDecorators = [];
        function abort(what) {
            if (Module["onAbort"]) {
                Module["onAbort"](what);
            }
            if (what !== undefined) {
                Module.print(what);
                Module.printErr(what);
                what = JSON.stringify(what);
            } else {
                what = "";
            }
            ABORT = true;
            EXITSTATUS = 1;
            var extra = "";
            var output = "abort(" + what + ") at " + stackTrace() + extra;
            if (abortDecorators) {
                abortDecorators.forEach(function(decorator) {
                    output = decorator(output, what);
                });
            }
            throw output;
        }
        Module["abort"] = abort;
        if (Module["preInit"]) {
            if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
            while (Module["preInit"].length > 0) {
                Module["preInit"].pop()();
            }
        }
        Module["noExitRuntime"] = true;
        run();
    });
    function dataReturn(returnValue, result) {
        if (returnValue === 0) {
            return result;
        } else {
            throw new Error("SPHINCS error: " + returnValue);
        }
    }
    function dataResult(buffer, bytes) {
        return new Uint8Array(new Uint8Array(Module.HEAPU8.buffer, buffer, bytes));
    }
    function dataFree(buffer) {
        try {
            Module._free(buffer);
        } catch (err) {
            setTimeout(function() {
                throw err;
            }, 0);
        }
    }
    function malloc() {
        try {
            return Module.asm._malloc.apply(null, arguments);
        } catch (err) {
            console.error({
                err: err,
                Module: Module,
                arguments: arguments
            });
            debugger;
            throw err;
        }
    }
    var publicKeyBytes, privateKeyBytes, bytes;
    var initiated = Module.ready.then(function() {
        Module._sphincsjs_init();
        publicKeyBytes = Module._sphincsjs_public_key_bytes();
        privateKeyBytes = Module._sphincsjs_secret_key_bytes();
        bytes = Module._sphincsjs_signature_bytes();
    });
    var sphincs = {
        publicKeyBytes: initiated.then(function() {
            return publicKeyBytes;
        }),
        privateKeyBytes: initiated.then(function() {
            return privateKeyBytes;
        }),
        bytes: initiated.then(function() {
            return bytes;
        }),
        keyPair: function() {
            return initiated.then(function() {
                var publicKeyBuffer = malloc(publicKeyBytes);
                var privateKeyBuffer = malloc(privateKeyBytes);
                try {
                    var returnValue = Module._sphincsjs_keypair(publicKeyBuffer, privateKeyBuffer);
                    return dataReturn(returnValue, {
                        publicKey: dataResult(publicKeyBuffer, publicKeyBytes),
                        privateKey: dataResult(privateKeyBuffer, privateKeyBytes)
                    });
                } finally {
                    dataFree(publicKeyBuffer);
                    dataFree(privateKeyBuffer);
                }
            });
        },
        sign: function(message, privateKey) {
            return initiated.then(function() {
                var signedBytes = message.length + bytes;
                var signedBuffer = malloc(signedBytes);
                var signedLengthBuffer = malloc(8);
                var messageBuffer = malloc(message.length);
                var privateKeyBuffer = malloc(privateKeyBytes);
                Module.writeArrayToMemory(message, messageBuffer);
                Module.writeArrayToMemory(privateKey, privateKeyBuffer);
                try {
                    var returnValue = Module._sphincsjs_sign(signedBuffer, signedLengthBuffer, messageBuffer, message.length, privateKeyBuffer);
                    return dataReturn(returnValue, dataResult(signedBuffer, signedBytes));
                } finally {
                    dataFree(signedBuffer);
                    dataFree(signedLengthBuffer);
                    dataFree(messageBuffer);
                    dataFree(privateKeyBuffer);
                }
            });
        },
        signDetached: function(message, privateKey) {
            return sphincs.sign(message, privateKey).then(function(signed) {
                return new Uint8Array(signed.buffer, 0, bytes);
            });
        },
        open: function(signed, publicKey) {
            return initiated.then(function() {
                var openedBuffer = malloc(signed.length + bytes);
                var openedLengthBuffer = malloc(8);
                var signedBuffer = malloc(signed.length);
                var publicKeyBuffer = malloc(publicKeyBytes);
                Module.writeArrayToMemory(signed, signedBuffer);
                Module.writeArrayToMemory(publicKey, publicKeyBuffer);
                try {
                    var returnValue = Module._sphincsjs_open(openedBuffer, openedLengthBuffer, signedBuffer, signed.length, publicKeyBuffer);
                    return dataReturn(returnValue, dataResult(openedBuffer, signed.length - bytes));
                } finally {
                    dataFree(openedBuffer);
                    dataFree(openedLengthBuffer);
                    dataFree(signedBuffer);
                    dataFree(publicKeyBuffer);
                }
            }).catch(function(err) {
                console.error({
                    err: err
                });
                debugger;
                throw err;
            });
        },
        verifyDetached: function(signature, message, publicKey) {
            return initiated.then(function() {
                var signed = new Uint8Array(bytes + message.length);
                signed.set(signature);
                signed.set(message, bytes);
                return sphincs.open(signed, publicKey).catch(function(err) {
                    console.error({
                        err: err
                    });
                    debugger;
                    return;
                }).then(function(opened) {
                    try {
                        return opened !== undefined;
                    } finally {
                        var arrs = opened ? [ signed, opened ] : [ signed ];
                        for (var i = 0; i < arrs.length; ++i) {
                            var arr = arrs[i];
                            for (var j = 0; j < arr.length; ++j) {
                                arr[j] = 0;
                            }
                        }
                    }
                });
            });
        }
    };
    return sphincs;
}();

if (typeof module !== "undefined" && module.exports) {
    sphincs.sphincs = sphincs;
    module.exports = sphincs;
} else {
    self.sphincs = sphincs;
}