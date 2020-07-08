'use strict';

const {Console}        = require('console');
const path             = require('path');
const minimatch        = require('minimatch');
const {getProjectRoot} = require('./util');

const SYMBOL_NAMESPACE = '@vadym.gidulian/logger@v1';
const LOGGER = Symbol.for(SYMBOL_NAMESPACE);
const CALLER = Symbol.for(`${SYMBOL_NAMESPACE}::Caller`);

let originalConsole           = null;
let originalConsoleDescriptor = null;

const PROJECT_ROOT = getProjectRoot();

module.exports = {
	
	attach(config = []) {
		const moduleRoot = getProjectRoot(getCallerFilename(getStackTrace(this.attach)));
		
		if (!Array.isArray(config)) config = [config];
		for (const conf of config) {
			conf[CALLER] = {
				type:     (moduleRoot === PROJECT_ROOT) ? 'project' : 'module',
				rootPath: moduleRoot
			};
		}
		
		replaceConsole();
		appendConfig(config);
	},
	
	detach() {
		if (!isLoggerAttached()) return;
		
		global.console[LOGGER].restore();
	}
	
};



function appendConfig(config) {
	if (!isLoggerAttached()) return;
	
	if (!Array.isArray(config)) config = [config];
	
	global.console[LOGGER].config.push(...config);
	global.console[LOGGER].config.sort((c1, c2) => c1[CALLER].type.localeCompare(c2[CALLER].type));
}

function isLoggerAttached() {
	return global.console.hasOwnProperty(LOGGER);
}

function getCallerFilename(stackTrace) {
	let fileName;
	
	for (let i = 0; !fileName && (i < stackTrace.length); i++) {
		fileName = stackTrace[i].fileName;
	}
	
	return fileName || '';
}

function getStackTrace(topFrame) {
	const oldFormatter = Error.prepareStackTrace;
	try {
		Error.prepareStackTrace = (_, structuredStackTrace) => {
			const stackTrace = [];
			
			for (let i = 0; i < structuredStackTrace.length; i++) {
				const callSite = structuredStackTrace[i];
				
				const fileName = callSite.getFileName();
				if (fileName) {
					if (fileName.startsWith(__dirname)) continue;
					if (fileName.startsWith('internal')) break;
				}
				
				stackTrace.push(new Proxy(Object.create(null), {
					get(_, property) {
						switch (property) {
							case 'fileName':      return fileName;
							case 'lineNumber':    return callSite.getLineNumber();
							case 'columnNumber':  return callSite.getColumnNumber();
							case 'typeName':      return callSite.getTypeName();
							case 'functionName':  return callSite.getFunctionName();
							case 'methodName':    return callSite.getMethodName();
							case 'isToplevel':    return callSite.isToplevel();
							case 'isNative':      return callSite.isNative();
							case 'isConstructor': return callSite.isConstructor();
							case 'isAsync':       return callSite.isAsync();
							case 'isPromiseAll':  return callSite.isPromiseAll();
							case 'promiseIndex':  return callSite.getPromiseIndex();
							case 'isEval':        return callSite.isEval();
							case 'evalOrigin':    return callSite.getEvalOrigin();
							case 'toString':      return () => callSite.toString();
						}
					}
				}));
			}
			
			return stackTrace;
		};
		
		const container = Object.create(null);
		Error.captureStackTrace(container, topFrame);
		return container.stack;
	} finally {
		Error.prepareStackTrace = oldFormatter;
	}
}

function replaceConsole() {
	if (isLoggerAttached()) return;
	
	originalConsole           = global.console;
	originalConsoleDescriptor = Object.getOwnPropertyDescriptor(global, 'console');
	
	const METHOD_PROXIES = new Map();
	
	const proxy = new Proxy(originalConsole, {
		get(target, propertyKey, receiver) {
			const propertyValue = Reflect.get(target, propertyKey, receiver);
			if ((typeof propertyValue !== 'function')
			    || !(Console.prototype.hasOwnProperty(propertyKey) || target.hasOwnProperty(propertyKey)))
				return propertyValue;
			
			if (!METHOD_PROXIES.has(propertyKey)) {
				METHOD_PROXIES.set(propertyKey, new Proxy(propertyValue, {
					apply(targetFn, thisArg, argArray) {
						let args = argArray.slice();
						
						const stackTrace     = getStackTrace(this.apply);
						const callerFilename = getCallerFilename(stackTrace);
						
						let isDisabled  = false;
						let isPrevented = false;
						for (const conf of Reflect.get(target, LOGGER, receiver).config) {
							const relativePath = callerFilename
								? path.relative(conf[CALLER].rootPath, callerFilename)
								: '';
							
							if ((conf[CALLER].type === 'module') && relativePath.startsWith('..')) continue;
							
							if (conf.method) {
								const methods = Array.isArray(conf.method) ? conf.method : [conf.method];
								if (!methods.includes(propertyKey)) continue;
							}
							
							if (conf.path) {
								const paths = Array.isArray(conf.path) ? conf.path : [conf.path];
								
								let isMatchFound = false;
								for (const p of paths) {
									if (p instanceof RegExp) {
										if (p.test(relativePath)) {
											isMatchFound = true;
											break;
										}
									} else if (typeof p === 'object') {
										if (minimatch(relativePath, p.glob, p.options)) {
											isMatchFound = true;
											break;
										}
									} else {
										if (p === relativePath) {
											isMatchFound = true;
											break;
										}
									}
								}
								if (!isMatchFound) continue;
							}
							
							if ('disabled' in conf) {
								isDisabled = conf.disabled;
								if (isDisabled) continue;
							}
							
							if (conf.transform) {
								args = conf.transform({
									args,
									method:       propertyKey,
									originalArgs: argArray.slice(),
									path:         relativePath,
									prevent:      () => isPrevented = true,
									rootPath:     conf[CALLER].rootPath,
									stackTrace
								});
								if (isPrevented) return;
							}
						}
						if (isDisabled) return;
						
						return Reflect.apply(targetFn, thisArg, args);
					}
				}));
			}
			
			return METHOD_PROXIES.get(propertyKey);
		}
	});
	proxy[LOGGER] = {
		config:  [],
		restore: restoreOriginalConsole
	};
	
	Object.defineProperty(global, 'console', {
		configurable: true,
		enumerable:   true,
		writable:     true,
		value:        proxy
	});
}

function restoreOriginalConsole() {
	Object.defineProperty(global, 'console', originalConsoleDescriptor);
	delete originalConsole[LOGGER];
}
