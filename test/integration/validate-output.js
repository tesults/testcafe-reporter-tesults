const assert = require('assert');
const fs = require('fs');
const path = require('path');

const outputFile = process.argv[2];
const scenario = process.argv[3];
const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

assert.strictEqual(output.target, '');
assert.strictEqual(output.metadata.integration_name, 'testcafe-reporter-tesults');
assert.strictEqual(output.metadata.integration_version, require('../../package.json').version);
assert.strictEqual(output.metadata.test_framework, 'testcafe');

if (scenario === 'passing') {
    assert.strictEqual(output.results.cases.length, 2);
    assert.strictEqual(output.results.cases[0].result, 'pass');
    assert.strictEqual(output.results.cases[1].result, 'unknown');
    assert.ok(Array.isArray(output.results.cases[0].files));
    assert.ok(output.results.cases[0].files.length > 0);
    assert.ok(path.isAbsolute(output.results.cases[0].files[0]));
    assert.ok(fs.existsSync(output.results.cases[0].files[0]));
}
else if (scenario === 'failing') {
    assert.strictEqual(output.results.cases.length, 1);
    assert.strictEqual(output.results.cases[0].result, 'fail');
    assert.strictEqual(typeof output.results.cases[0].reason, 'string');
    assert.ok(output.results.cases[0].reason.length > 0);
}
else
    throw new Error('Unknown validation scenario: ' + scenario);
