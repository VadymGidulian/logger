'use strict';

const path = require('path');

const {getProjectRoot} = require('../src/util');

describe('Util', () => {
	test(`getProjectRoot()`, () => {
		expect(getProjectRoot()).toBe(process.cwd());
	});
	test(`getProjectRoot('src/index.js')`, () => {
		expect(getProjectRoot(path.resolve('src/index.js'))).toBe(process.cwd());
	});
	test(`getProjectRoot('test/util.test.js')`, () => {
		expect(getProjectRoot(path.resolve('test/util.test.js'))).toBe(process.cwd());
	});
	test(`getProjectRoot('test/node_modules/module-a/index.js')`, () => {
		expect(getProjectRoot(path.resolve('test/node_modules/module-a/index.js')))
			.toBe(path.join(process.cwd(), 'test/node_modules/module-a'));
	});
	test(`getProjectRoot('../some.file')`, () => {
		const someDirPath  = path.join(process.cwd(), '..', 'some.file');
		const someFilePath = path.join(someDirPath, 'some.file')
		expect(getProjectRoot(someFilePath)).toBe(someDirPath);
	});
});
