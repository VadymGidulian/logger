'use strict';

const fs   = require('fs');
const path = require('path');

module.exports = {
	
	getProjectRoot(entryFile = require.main.filename) {
		const entryDir = path.dirname(entryFile);
		const {root}   = path.parse(entryDir);
		
		// Rely on `package.json`
		let dir = entryDir;
		while (!isPackageJsonIn(dir)) {
			dir = path.join(dir, '..');
			if (dir === root) return entryDir;
		}
		return dir;
		
		
		
		function isPackageJsonIn(dir) {
			try {
				fs.accessSync(path.join(dir, 'package.json'));
				return true;
			} catch {
				return false;
			}
		}
	}
	
};
