const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const tesults = require('tesults');

const originalArgv = process.argv;
const originalOutputFile = process.env.TESULTS_OUTPUT_FILE;
const originalResults = tesults.results;
const temporaryDirectories = [];

function temporaryDirectory () {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'testcafe-tesults-'));

    temporaryDirectories.push(directory);
    return directory;
}

function uploadStub (uploads) {
    return function (data, callback) {
        uploads.push(data);
        callback(null, {
            success:  true,
            message:  'uploaded',
            warnings: [],
            errors:   []
        });
    };
}

function createReporter (uploads) {
    tesults.results = uploadStub(uploads);
    delete require.cache[require.resolve('../lib')];

    return require('../lib')();
}

function testRunInfo (overrides) {
    return Object.assign({
        warnings:    [],
        errs:        [],
        screenshots: [],
        durationMs:  25,
        unstable:    false,
        skipped:     false,
        testId:      'default-test-id'
    }, overrides);
}

async function addTestCase (reporter, name, info, meta) {
    await reporter.reportTestStart(name);
    await reporter.reportTestDone(name, info, meta);
}

describe('testcafe-reporter-tesults', function () {
    beforeEach(function () {
        process.argv = ['node', 'testcafe'];
        delete process.env.TESULTS_OUTPUT_FILE;
    });

    afterEach(function () {
        process.argv = originalArgv;
        tesults.results = originalResults;

        if (originalOutputFile === undefined)
            delete process.env.TESULTS_OUTPUT_FILE;
        else
            process.env.TESULTS_OUTPUT_FILE = originalOutputFile;
    });

    after(function () {
        temporaryDirectories.forEach(directory => {
            fs.rmSync(directory, { recursive: true, force: true });
        });
    });

    it('loads through the TestCafe reporter plugin host', function () {
        const buildReporterPlugin = require('testcafe').embeddingUtils.buildReporterPlugin;
        const pluginFactory = require('../lib');
        const output = {
            write: function () {}
        };
        const plugin = buildReporterPlugin(pluginFactory, output);

        assert.strictEqual(typeof plugin.reportTaskStart, 'function');
        assert.strictEqual(typeof plugin.reportTestDone, 'function');
        assert.strictEqual(typeof plugin.reportTaskDone, 'function');
    });

    it('keeps the reporter disabled without a target or output file', async function () {
        const uploads = [];
        const reporter = createReporter(uploads);

        await reporter.reportTaskStart();
        await reporter.reportFixtureStart('Disabled fixture');
        await addTestCase(reporter, 'disabled test', testRunInfo(), {});
        await reporter.reportTaskDone();

        assert.strictEqual(reporter.disabled, true);
        assert.strictEqual(reporter.data.results.cases.length, 0);
        assert.strictEqual(uploads.length, 0);
    });

    it('writes output without uploading and includes complete test data', async function () {
        const uploads = [];
        const directory = temporaryDirectory();
        const outputFile = path.join(directory, 'nested', 'tesults-results.json');
        const reporter = createReporter(uploads);
        const testController = {
            testRun: {
                test: {
                    id: 'enhanced-test'
                }
            }
        };

        process.env.TESULTS_OUTPUT_FILE = outputFile;
        reporter.description(testController, 'Enhanced description');
        reporter.custom(testController, 'owner', 'quality');
        reporter.file(testController, '/tmp/enhanced.log');
        reporter.step(testController, { name: 'open page', result: 'pass' });

        await reporter.reportTaskStart();
        await reporter.reportFixtureStart('Output fixture');
        await addTestCase(reporter, 'passing test', testRunInfo({
            warnings:    ['warning text'],
            screenshots: [{ screenshotPath: '/tmp/screenshot.png' }],
            unstable:    true,
            testId:      'enhanced-test'
        }), { description: 'Metadata description', priority: 'high' });
        await addTestCase(reporter, 'skipped test', testRunInfo({
            skipped: true,
            testId:  'skipped-test'
        }), {});

        reporter.formatError = function (error, prefix) {
            return prefix + error.message;
        };

        await addTestCase(reporter, 'failing test', testRunInfo({
            errs:   [new Error('first failure'), new Error('second failure')],
            testId: 'failing-test'
        }), {});
        await reporter.reportTaskDone();

        const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

        assert.strictEqual(uploads.length, 0);
        assert.strictEqual(output.target, '');
        /* eslint-disable camelcase */
        assert.deepStrictEqual(output.metadata, {
            integration_name:    'testcafe-reporter-tesults',
            integration_version: '1.3.0',
            test_framework:      'testcafe'
        });
        /* eslint-enable camelcase */
        assert.strictEqual(output.results.cases[0].result, 'pass');
        assert.strictEqual(output.results.cases[0].desc, 'Enhanced description');
        assert.strictEqual(output.results.cases[0]._owner, 'quality');
        assert.strictEqual(output.results.cases[0]._priority, 'high');
        assert.strictEqual(output.results.cases[0]._Unstable, 'This test case has been marked as unstable.');
        assert.deepStrictEqual(output.results.cases[0]._Warnings, ['warning text']);
        assert.deepStrictEqual(output.results.cases[0].files, ['/tmp/screenshot.png', '/tmp/enhanced.log']);
        assert.deepStrictEqual(output.results.cases[0].steps, [{ name: 'open page', result: 'pass' }]);
        assert.strictEqual(output.results.cases[1].result, 'unknown');
        assert.strictEqual(output.results.cases[2].result, 'fail');
        assert.strictEqual(output.results.cases[2].reason, '1) first failure\n2) second failure');
    });

    it('preserves target-only upload behavior and failure reason arrays', async function () {
        const uploads = [];
        const reporter = createReporter(uploads);

        process.argv.push('tesults-target=target-token');
        reporter.formatError = function (error, prefix) {
            return prefix + error.message;
        };

        await reporter.reportTaskStart();
        await reporter.reportFixtureStart('Upload fixture');
        await addTestCase(reporter, 'upload failure', testRunInfo({
            errs:   [new Error('upload failure')],
            testId: 'upload-test'
        }), {});
        await reporter.reportTaskDone();

        assert.strictEqual(uploads.length, 1);
        assert.strictEqual(uploads[0].target, 'target-token');
        assert.deepStrictEqual(uploads[0].results.cases[0].reason, ['1) upload failure']);
        assert.strictEqual(uploads[0].metadata.integration_version, '1.3.0');
    });

    it('writes locally and uploads when both destinations are configured', async function () {
        const uploads = [];
        const directory = temporaryDirectory();
        const outputFile = path.join(directory, 'results.json');
        const reporter = createReporter(uploads);

        process.argv.push('tesults-target=target-token');
        process.env.TESULTS_OUTPUT_FILE = outputFile;
        reporter.formatError = function (error) {
            return error.message;
        };

        await reporter.reportTaskStart();
        await reporter.reportFixtureStart('Combined fixture');
        await addTestCase(reporter, 'combined failure', testRunInfo({
            errs:   [new Error('combined failure')],
            testId: 'combined-test'
        }), {});
        await reporter.reportTaskDone();

        const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

        assert.strictEqual(uploads.length, 1);
        assert.deepStrictEqual(uploads[0].results.cases[0].reason, ['combined failure']);
        assert.strictEqual(output.results.cases[0].reason, 'combined failure');
    });

    it('retains config, build, and generated-file options', async function () {
        const uploads = [];
        const directory = temporaryDirectory();
        const filesDirectory = path.join(directory, 'files');
        const caseDirectory = path.join(filesDirectory, 'Configured fixture', 'configured test');
        const buildDirectory = path.join(filesDirectory, '[build]', 'build-42');
        const configFile = path.join(directory, 'tesults-config.json');
        const reporter = createReporter(uploads);

        fs.mkdirSync(caseDirectory, { recursive: true });
        fs.mkdirSync(buildDirectory, { recursive: true });
        fs.writeFileSync(path.join(caseDirectory, 'case.log'), 'case log');
        fs.writeFileSync(path.join(buildDirectory, 'build.log'), 'build log');
        fs.writeFileSync(configFile, JSON.stringify({
            staging:                'configured-target',
            'tesults-files':        filesDirectory,
            'tesults-build-name':   'build-42',
            'tesults-build-desc':   'configured build',
            'tesults-build-result': 'pass'
        }));

        process.argv.push('tesults-target=staging');
        process.argv.push('tesults-config=' + configFile);

        await reporter.reportTaskStart();
        await reporter.reportFixtureStart('Configured fixture');
        await addTestCase(reporter, 'configured test', testRunInfo({ testId: 'configured-test' }), {});
        await reporter.reportTaskDone();

        assert.strictEqual(uploads.length, 1);
        assert.strictEqual(uploads[0].target, 'configured-target');
        assert.deepStrictEqual(uploads[0].results.cases[0].files, [path.join(caseDirectory, 'case.log')]);
        assert.deepStrictEqual(uploads[0].results.cases[1], {
            suite:  '[build]',
            name:   'build-42',
            desc:   'configured build',
            result: 'pass',
            files:  [path.join(buildDirectory, 'build.log')]
        });
    });

    it('continues a configured upload when local output cannot be written', async function () {
        const uploads = [];
        const directory = temporaryDirectory();
        const reporter = createReporter(uploads);

        process.argv.push('tesults-target=target-token');
        process.env.TESULTS_OUTPUT_FILE = directory;

        await reporter.reportTaskStart();
        await reporter.reportFixtureStart('Write error fixture');
        await addTestCase(reporter, 'still uploads', testRunInfo({ testId: 'write-error-test' }), {});
        await reporter.reportTaskDone();

        assert.strictEqual(uploads.length, 1);
        assert.strictEqual(uploads[0].results.cases[0].result, 'pass');
    });
});
