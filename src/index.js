const fs = require('fs');
const path = require('path');
const tesults = require('tesults');
const util = require('util');
const packageInfo = require('../package.json');

const resultsUploadAsync = util.promisify(tesults.results);
const supplementalData = {};

function testId (t) {
    if (t === undefined || t.testRun === undefined || t.testRun.test === undefined)
        return undefined;

    return t.testRun.test.id;
}

function supplementalFor (t) {
    const id = testId(t);

    if (id === undefined)
        return undefined;

    if (supplementalData[id] === undefined)
        supplementalData[id] = {};

    return supplementalData[id];
}

function outputData (data) {
    const output = JSON.parse(JSON.stringify(data));

    output.results.cases.forEach(testCase => {
        if (Array.isArray(testCase.reason))
            testCase.reason = testCase.reason.join('\n');

        if (Array.isArray(testCase.files))
            testCase.files = testCase.files.map(file => path.resolve(file));
    });

    return output;
}

function writeOutput (outputFile, data) {
    const parent = path.dirname(outputFile);

    fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(outputData(data), null, 2));
}

module.exports = function () {
    return {
        description: (t, description) => {
            const supplemental = supplementalFor(t);

            if (supplemental !== undefined)
                supplemental.desc = description;
        },

        custom: (t, key, value) => {
            const supplemental = supplementalFor(t);

            if (supplemental === undefined)
                return;

            if (supplemental.custom === undefined)
                supplemental.custom = new Map();

            supplemental.custom.set(key, value);
        },

        step: (t, step) => {
            const supplemental = supplementalFor(t);

            if (supplemental === undefined)
                return;

            if (supplemental.steps === undefined)
                supplemental.steps = [];

            supplemental.steps.push(step);
        },

        file: (t, file) => {
            const supplemental = supplementalFor(t);

            if (supplemental === undefined)
                return;

            if (supplemental.files === undefined)
                supplemental.files = [];

            supplemental.files.push(file);
        },

        noColors: true,
        data:     {
            target:  '',
            results: {
                cases: []
            },
            /* eslint-disable camelcase */
            metadata: {
                integration_name:    'testcafe-reporter-tesults',
                integration_version: packageInfo.version,
                test_framework:      'testcafe'
            }
            /* eslint-enable camelcase */
        },

        caseFiles: function (suite, name) {
            const files = [];

            if (this.files !== undefined && this.files !== null) {
                try {
                    const filesPath = path.join(this.files, suite, name);

                    fs.readdirSync(filesPath).forEach(function (file) {
                        if (file !== '.DS_Store')
                            files.push(path.join(filesPath, file));
                    });
                }
                catch (err) {
                    if (err.code !== 'ENOENT')
                        console.log('Tesults error reading case files: ' + err);
                }
            }

            return files;
        },

        disabled:       false,
        fixture:        null,
        targetKey:      'tesults-target',
        filesKey:       'tesults-files',
        configKey:      'tesults-config',
        buildNameKey:   'tesults-build-name',
        buildDescKey:   'tesults-build-desc',
        buildResultKey: 'tesults-build-result',
        buildReasonKey: 'tesults-build-reason',
        target:         undefined,
        config:         undefined,
        files:          undefined,
        buildName:      undefined,
        buildDesc:      undefined,
        buildReason:    undefined,
        buildResult:    undefined,
        outputFile:     undefined,
        startTimes:     {},

        async reportTaskStart () {
            process.argv.forEach(val => {
                if (val.indexOf(this.targetKey) === 0) this.target = val.substr(this.targetKey.length + 1);
                if (val.indexOf(this.filesKey) === 0) this.files = val.substr(this.filesKey.length + 1);
                if (val.indexOf(this.configKey) === 0) this.config = val.substr(this.configKey.length + 1);
                if (val.indexOf(this.buildNameKey) === 0) this.buildName = val.substr(this.buildNameKey.length + 1);
                if (val.indexOf(this.buildDescKey) === 0) this.buildDesc = val.substr(this.buildDescKey.length + 1);
                if (val.indexOf(this.buildResultKey) === 0) this.buildResult = val.substr(this.buildResultKey.length + 1);
                if (val.indexOf(this.buildReasonKey) === 0) this.buildReason = val.substr(this.buildReasonKey.length + 1);
            });

            this.outputFile = process.env.TESULTS_OUTPUT_FILE;

            if ((this.target === undefined || this.target === null) && !this.outputFile) {
                console.log(this.targetKey + ' not provided. Tesults disabled.');
                this.disabled = true;
                return;
            }

            let config;

            if (this.config !== undefined) {
                try {
                    const raw = fs.readFileSync(this.config, 'utf8');

                    config = JSON.parse(raw);
                }
                catch (err) {
                    if (err.code === 'ENOENT')
                        console.log('Tesults error reading config file, check supplied tesults-config arg path is correct. ' + this.config);
                    else
                        console.log('Tesults error reading config file, check content is valid. ' + this.config);
                }
            }

            if (config !== undefined) {
                if (config[this.target] !== undefined) this.target = config[this.target];
                if (this.files === undefined && config[this.filesKey] !== undefined) this.files = config[this.filesKey];
                if (this.buildName === undefined && config[this.buildNameKey] !== undefined) this.buildName = config[this.buildNameKey];
                if (this.buildDesc === undefined && config[this.buildDescKey] !== undefined) this.buildDesc = config[this.buildDescKey];
                if (this.buildReason === undefined && config[this.buildReasonKey] !== undefined) this.buildReason = config[this.buildReasonKey];
                if (this.buildResult === undefined && config[this.buildResultKey] !== undefined) this.buildResult = config[this.buildResultKey];
            }
        },

        async reportFixtureStart (name) {
            this.fixture = name;
        },

        async reportTestStart (name) {
            if (this.disabled === true)
                return;

            this.startTimes[this.fixture + '-' + name] = Date.now();
        },

        async reportTestDone (name, testRunInfo, meta) {
            if (this.disabled === true)
                return;

            const testCase = {};
            const warnings = testRunInfo.warnings || [];
            const errors = testRunInfo.errs || [];
            const screenshots = testRunInfo.screenshots || [];

            testCase.name = name;
            testCase.suite = this.fixture;
            if (testCase.suite === null || testCase.suite === undefined) delete testCase.suite;

            let result = 'unknown';

            if (warnings.length > 0)
                testCase['_Warnings'] = warnings.slice();

            if (testRunInfo.skipped !== true) {
                if (errors.length > 0) {
                    result = 'fail';
                    testCase.reason = [];
                    errors.forEach((err, idx) => {
                        testCase.reason.push(this.formatError(err, `${idx + 1}) `));
                    });
                }
                else
                    result = 'pass';
            }

            testCase.result = result;
            testCase.start = this.startTimes[this.fixture + '-' + name];
            testCase.end = Date.now();
            testCase.duration = testRunInfo.durationMs;

            if (testRunInfo.unstable === true)
                testCase['_Unstable'] = 'This test case has been marked as unstable.';

            if (meta !== undefined && meta !== null) {
                Object.keys(meta).forEach(function (key) {
                    if (key === 'description' || key === 'desc')
                        testCase.desc = meta[key];
                    else
                        testCase['_' + key] = meta[key];
                });
            }

            if (screenshots.length > 0)
                testCase.files = screenshots.map(screenshot => screenshot.screenshotPath);

            const files = this.caseFiles(testCase.suite, testCase.name);

            if (files.length > 0) {
                if (testCase.files === undefined)
                    testCase.files = [];

                testCase.files = testCase.files.concat(files);
            }

            const supplemental = supplementalData[testRunInfo.testId];

            if (supplemental !== undefined) {
                if (Array.isArray(supplemental.files)) {
                    if (testCase.files === undefined)
                        testCase.files = [];

                    testCase.files = testCase.files.concat(supplemental.files);
                }

                if (supplemental.desc !== undefined)
                    testCase.desc = supplemental.desc;

                if (supplemental.custom !== undefined) {
                    for (const [key, value] of supplemental.custom.entries())
                        testCase['_' + key] = value;
                }

                if (supplemental.steps !== undefined)
                    testCase.steps = supplemental.steps.slice();
            }

            this.data.results.cases.push(testCase);
        },

        timeout: function (ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        async reportTaskDone () {
            if (this.disabled === true)
                return;

            if (this.buildName !== undefined && this.buildName !== null) {
                const buildCase = {
                    suite: '[build]'
                };

                buildCase.name = this.buildName;
                if (buildCase.name === '') buildCase.name = '-';
                if (this.buildDesc !== undefined && this.buildDesc !== null) buildCase.desc = this.buildDesc;
                if (this.buildReason !== undefined && this.buildReason !== null) buildCase.reason = this.buildReason;

                if (this.buildResult !== undefined && this.buildResult !== null) {
                    buildCase.result = this.buildResult.toLowerCase();
                    if (buildCase.result !== 'pass' && buildCase.result !== 'fail') buildCase.result = 'unknown';
                }
                else
                    buildCase.result = 'unknown';

                const files = this.caseFiles(buildCase.suite, buildCase.name);

                if (files.length > 0) buildCase.files = files;
                this.data.results.cases.push(buildCase);
            }

            this.data.target = this.target === undefined || this.target === null ? '' : this.target;

            if (this.outputFile) {
                try {
                    writeOutput(this.outputFile, this.data);
                    console.log('Tesults results written to ' + this.outputFile);
                }
                catch (err) {
                    console.log('Tesults error writing results file: ' + err.message);
                }
            }

            if (this.target === undefined || this.target === null)
                return;

            console.log('Tesults results upload...');

            try {
                const response = await resultsUploadAsync(this.data);

                console.log('Success: ' + response.success);
                console.log('Message: ' + response.message);
                console.log('Warnings: ' + response.warnings.length);
                console.log('Errors: ' + response.errors.length);
            }
            catch (err) {
                console.log('Tesults library error, failed to upload.');
            }
        }
    };
};
