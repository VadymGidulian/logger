import {Console}                      from 'console';
import {IOptions as MinimatchOptions} from 'minimatch';

declare namespace Logger {
	
	type MethodsOf<T> = keyof Omit<T, {
		[K in keyof T]: T[K] extends Function ? never : K
	}[keyof T]>;
	
	export type ConsoleMethod = Exclude<MethodsOf<Console>, 'Console'>;
	export type MinimatchPath = {glob: string, options?: MinimatchOptions};
	export type Path          = string | RegExp | MinimatchPath;
	
	export interface Frame {
		/**
		 * If this function was defined in a script, returns the name of the script.
		 */
		fileName: string | undefined;
		/**
		 * If this function was defined in a script, returns the current line number.
		 */
		lineNumber: number | null;
		/**
		 * If this function was defined in a script, returns the current column number.
		 */
		columnNumber: number | null;
		/**
		 * Returns the type of `this` as a string.
		 * This is the name of the function stored in the `constructor` field of `this`, if available,
		 * otherwise, the object’s `[[Class]]` internal property.
		 */
		typeName: string | null;
		/**
		 * Returns the name of the current function, typically its `name` property.
		 * If a `name` property is not available, an attempt is made to infer a name from the function’s context.
		 */
		functionName: string | null;
		/**
		 * Returns the name of the property of `this` or one of its prototypes that holds the current function.
		 */
		methodName: string | null;
		/**
		 * Is this a top-level invocation, that is, is this the global object?
		 */
		isToplevel: boolean;
		/**
		 * Is this call in native V8 code?
		 */
		isNative: boolean;
		/**
		 * Is this a constructor call?
		 */
		isConstructor: boolean;
		/**
		 * Is this an async call (i.e. `await` or `Promise.all()`)?
		 */
		isAsync: boolean;
		/**
		 * Is this an async call to `Promise.all()`?
		 */
		isPromiseAll: boolean;
		/**
		 * Returns the index of the promise element that was followed in `Promise.all()` for async stack traces,
		 * or `null` if the frame is not a `Promise.all()` call.
		 */
		promiseIndex: number | null;
		/**
		 * Does this call take place in code defined by a call to eval?
		 */
		isEval: boolean;
		/**
		 * If this function was created using a call to `eval`, returns a string representing the location where `eval` was called.
		 */
		evalOrigin: string | undefined;
	}
	
	export interface Config {
		/**
		 * Method(s) the config will be applied to.
		 */
		method?: ConsoleMethod | ConsoleMethod[];
		/**
		 * Path(s) the config will be applied to.
		 */
		path?: Path | Array<Path>;
		/**
		 * Disable logging. It may be re-enabled again in subsequent configs.
		 */
		disabled?: boolean;
		/**
		 * Transform arguments passed to console's method(s).
		 * @param args - Arguments passed to console's method. They might be transformed by previous configs.
		 * @param method - Called console's method name.
		 * @param originalArgs - Original arguments passed to console's method.
		 * @param path - Relative path to the caller file.
		 * @param prevent - A function to prevent logging. All subsequent configs will NOT be processed.
		 * @param rootPath - Root path.
		 * @param stackTrace - Stack trace.
		 */
		transform?: ({args, method, originalArgs, path, prevent, rootPath, stackTrace}:
		             {args: any[], method: string, originalArgs: any[], path: string, prevent: () => void, rootPath: string, stackTrace: Frame[]}) => any[];
	}
	
}

/**
 * Attach the logger.
 *
 * If the logger is already attached, appends the passed config to the existing one, if any.
 * @param config - Logger config
 */
export declare function attach(config?: Logger.Config|Logger.Config[]): void;

/**
 * Detach the logger.
 *
 * If the logger will be reattached, the previous config will NOT be restored.
 */
export declare function detach(): void;
