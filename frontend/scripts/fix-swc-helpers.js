const fs = require('fs');
const path = require('path');

const helpersRoot = path.join(__dirname, '..', 'node_modules', '@swc', 'helpers');
const shimRoot = path.join(helpersRoot, '_');
const cjsRoot = path.join(helpersRoot, 'cjs');

if (!fs.existsSync(helpersRoot) || !fs.existsSync(cjsRoot)) {
  process.exit(0);
}

fs.mkdirSync(shimRoot, { recursive: true });

const cjsFiles = fs.readdirSync(cjsRoot).filter((fileName) => fileName.endsWith('.cjs'));

for (const cjsFileName of cjsFiles) {
  const shimFileName = cjsFileName.replace(/\.cjs$/, '.js');
  const shimPath = path.join(shimRoot, shimFileName);
  const namedExport = cjsFileName.replace(/\.cjs$/, '');
  const content = `import helperModule from '@swc/helpers/cjs/${cjsFileName}';\n` +
    `const helper = (helperModule && typeof helperModule === 'object' && helperModule._) ? helperModule._ : helperModule;\n` +
    `export const _ = helper;\n` +
    `export const ${namedExport} = helper;\n` +
    `export default helperModule;\n`;
  fs.writeFileSync(shimPath, content, 'utf8');
}

const extraShims = {
  '_class_private_field_loose_base.js': `const classPrivateFieldLooseBase = function _class_private_field_loose_base(receiver, privateKey) {\n  if (!Object.prototype.hasOwnProperty.call(receiver, privateKey)) {\n    throw new TypeError('attempted to use private field on non-instance');\n  }\n  return receiver;\n};\nexport const _ = classPrivateFieldLooseBase;\nexport const _class_private_field_loose_base = classPrivateFieldLooseBase;\nexport default classPrivateFieldLooseBase;\n`,
  '_class_private_field_loose_key.js': `let id = 0;\nconst classPrivateFieldLooseKey = function _class_private_field_loose_key(name) {\n  return '__private_' + id++ + '_' + name;\n};\nexport const _ = classPrivateFieldLooseKey;\nexport const _class_private_field_loose_key = classPrivateFieldLooseKey;\nexport default classPrivateFieldLooseKey;\n`,
};

for (const [fileName, content] of Object.entries(extraShims)) {
  fs.writeFileSync(path.join(shimRoot, fileName), content, 'utf8');
}
