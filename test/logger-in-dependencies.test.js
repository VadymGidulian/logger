'use strict';

const {Console}   = require('console');
const fs          = require('fs');
const path        = require('path');
const stream      = require('stream');
const {promisify} = require('util');

const del    = require('del');
const mkdirp = require('mkdirp');
const {ncp}  = require('ncp');

const logger = require('../src');

const moduleWithLogger = require('module-with-logger');

const LOG = [];
const fakeStream = new stream.Writable({
	decodeStrings: false,
	write(chunk, encoding, callback) {
		LOG.push(chunk);
		callback(null);
	}
});
const fakeConsole     = new Console(fakeStream);
const originalConsole = global.console;

describe('Logger in dependencies', () => {
	const ANOTHER_LOGGER_MODULE_DIR = path.join('test', 'node_modules', 'logger');
	
	beforeAll(async () => {
		await mkdirp(path.join(ANOTHER_LOGGER_MODULE_DIR, 'src'));
		await Promise.all([
			promisify(fs.copyFile)('./package.json', path.join(ANOTHER_LOGGER_MODULE_DIR, 'package.json')),
			promisify(ncp)('src', path.join(ANOTHER_LOGGER_MODULE_DIR, 'src'))
		]);
		
		global.console = fakeConsole;
	});
	
	beforeEach(() => {
		LOG.length = 0;
	});
	afterEach(async () => {
		logger.detach();
	});
	
	afterAll(async () => {
		global.console = originalConsole;
		
		await del(ANOTHER_LOGGER_MODULE_DIR);
	});
	
	test('Console should be replaced only once. Configs should be merged', () => {
		// otherwise, config will be overwritten
		
		moduleWithLogger.init({
			transform({args}) {
				return ['[Dependency]', ...args];
			}
		});
		
		logger.attach({
			transform({args}) {
				return ['!', ...args];
			}
		});
		
		print();
		
		expect(LOG).toStrictEqual(_n([
			'! debug',
			'! log',
			'! info',
			'! warn',
			'! error',
			'! [Dependency] module with logger'
		]));
	});
	
	test('Modules\' configs should always be processed first', () => {
		logger.attach({
			transform({args}) {
				return ['!', ...args];
			}
		});
		
		moduleWithLogger.init({
			transform({args}) {
				return ['[Dependency]', ...args];
			}
		});
		
		print();
		
		expect(LOG).toStrictEqual(_n([
			'! debug',
			'! log',
			'! info',
			'! warn',
			'! error',
			'! [Dependency] module with logger'
		]));
	});
	
	test('Path is root relative to a module (string)', () => {
		moduleWithLogger.init({
			path: 'index.js',
			transform({args}) {
				return ['[Dependency]', ...args];
			}
		});
		
		logger.attach({
			transform({args}) {
				return ['!', ...args];
			}
		});
		
		print();
		
		expect(LOG).toStrictEqual(_n([
			'! debug',
			'! log',
			'! info',
			'! warn',
			'! error',
			'! [Dependency] module with logger'
		]));
	});
	test('Paths are root relative to a module (RegExp)', () => {
		moduleWithLogger.init({
			path: /.*/,
			transform({args}) {
				return ['[Dependency]', ...args];
			}
		});
		
		logger.attach({
			transform({args}) {
				return ['!', ...args];
			}
		});
		
		print();
		
		expect(LOG).toStrictEqual(_n([
			'! debug',
			'! log',
			'! info',
			'! warn',
			'! error',
			'! [Dependency] module with logger'
		]));
	});
	test('Paths are root relative to a module (glob)', () => {
		moduleWithLogger.init({
			path: {glob: '**'},
			transform({args}) {
				return ['[Dependency]', ...args];
			}
		});
		
		logger.attach({
			transform({args}) {
				return ['!', ...args];
			}
		});
		
		print();
		
		expect(LOG).toStrictEqual(_n([
			'! debug',
			'! log',
			'! info',
			'! warn',
			'! error',
			'! [Dependency] module with logger'
		]));
	});
	test('Paths are root relative to a module (array)', () => {
		moduleWithLogger.init({
			path: [
				/.*/,
				{glob: '**'}
			],
			transform({args}) {
				return ['[Dependency]', ...args];
			}
		});
		
		logger.attach({
			transform({args}) {
				return ['!', ...args];
			}
		});
		
		print();
		
		expect(LOG).toStrictEqual(_n([
			'! debug',
			'! log',
			'! info',
			'! warn',
			'! error',
			'! [Dependency] module with logger'
		]));
	});
	
	test('`rootPath` is a module root', () => {
		const rootPath                 = path.join(__dirname, '..');
		const moduleWithLoggerRootPath = path.dirname(require.resolve('module-with-logger'));
		
		moduleWithLogger.init({
			path: 'index.js',
			transform({args, rootPath}) {
				return [`[${rootPath}][Dependency]`, ...args];
			}
		});
		
		logger.attach({
			transform({args, rootPath}) {
				return ['!', `[${rootPath}]`, ...args];
			}
		});
		
		print();
		
		expect(LOG).toStrictEqual(_n([
			`! [${rootPath}] debug`,
			`! [${rootPath}] log`,
			`! [${rootPath}] info`,
			`! [${rootPath}] warn`,
			`! [${rootPath}] error`,
			`! [${rootPath}] [${moduleWithLoggerRootPath}][Dependency] module with logger`
		]));
	});
});



function print() {
	console.debug('debug');
	console.log('log');
	console.info('info');
	console.warn('warn');
	console.error('error');
	
	useModules();
	
	
	
	function useModules() {
		moduleWithLogger.log();
	}
}

function _n(array) {
	return array.map(s => s + '\n');
}
