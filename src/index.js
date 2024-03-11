const fs = require('fs');

const path = require('path');

const tesults = require('tesults');

const util = require('util');

const resultsUploadAsync = util.promisify(tesults.results);

const supplemental_data = {};

module.exports = function () {
  return {
    description: (t, description) => {
      if (t === undefined) {
        return;
      }
      if (t.testRun === undefined) {
        return;
      }
      if (t.testRun.test === undefined) {
        return;
      }
      if (t.testRun.test.id === undefined) {
        return;
      }
      const id = t.testRun.test.id;
      if (supplemental_data[id] === undefined) {
        supplemental_data[id] = {};
      }
      supplemental_data[id].desc = description;
    },
    custom: (t, key, value) => {
      if (t === undefined) {
        return;
      }
      if (t.testRun === undefined) {
        return;
      }
      if (t.testRun.test === undefined) {
        return;
      }
      if (t.testRun.test.id === undefined) {
        return;
      }
      const id = t.testRun.test.id;
      if (supplemental_data[id] === undefined) {
        supplemental_data[id] = {};
      }
      if (supplemental_data[id].custom === undefined) {
        supplemental_data[id].custom = new Map();
      }
      supplemental_data[id].custom.set(key, value);
    },
    step: (t, step) => {
      if (t === undefined) {
        return;
      }
      if (t.testRun === undefined) {
        return;
      }
      if (t.testRun.test === undefined) {
        return;
      }
      if (t.testRun.test.id === undefined) {
        return;
      }
      const id = t.testRun.test.id;
      if (supplemental_data[id] === undefined) {
        supplemental_data[id] = {};
      }
      if (supplemental_data[id].steps === undefined) {
        supplemental_data[id].steps = [];
      }
      supplemental_data[id].steps.push(step);
    },
    file: (t, file) => {
      if (t === undefined) {
        return;
      }
      if (t.testRun === undefined) {
        return;
      }
      if (t.testRun.test === undefined) {
        return;
      }
      if (t.testRun.test.id === undefined) {
        return;
      }
      const id = t.testRun.test.id;
      if (supplemental_data[id] === undefined) {
        supplemental_data[id] = {};
      }
      if (supplemental_data[id].files === undefined) {
        supplemental_data[id].files = [];
      }
      supplemental_data[id].files.push(file);
    },
    noColors: true,
    data: {
      target: 'token',
      results: {
        cases: []
      }
    },
    caseFiles: function (suite, name) {
      const files = [];

      if (this.files !== undefined && this.files !== null) {
        try {
          const filesPath = path.join(this.files, suite, name);
          fs.readdirSync(filesPath).forEach(function (file) {
            if (file !== '.DS_Store') {
              // Exclude os files
              files.push(path.join(filesPath, file));
            }
          });
        } catch (err) {
          if (err.code === 'ENOENT') {// Normal scenario where no files present
          } else console.log('Tesults error reading case files: ' + err);
        }
      }

      return files;
    },
    disabled: false,
    fixture: null,
    targetKey: 'tesults-target',
    filesKey: 'tesults-files',
    configKey: 'tesults-config',
    buildNameKey: 'tesults-build-name',
    buildDescKey: 'tesults-build-desc',
    buildResultKey: 'tesults-build-result',
    buildReasonKey: 'tesults-build-reason',
    target: undefined,
    config: undefined,
    files: undefined,
    buildName: undefined,
    buildDesc: undefined,
    buildReason: undefined,
    buildResult: undefined,
    startTimes: {},
    
    async reportTaskStart()
    /* startTime, userAgents, testCount */
    {
      process.argv.forEach((val
      /*, index*/
      ) => {
        if (val.indexOf(this.targetKey) === 0) this.target = val.substr(this.targetKey.length + 1);
        if (val.indexOf(this.filesKey) === 0) this.files = val.substr(this.filesKey.length + 1);
        if (val.indexOf(this.configKey) === 0) this.config = val.substr(this.configKey.length + 1);
        if (val.indexOf(this.buildNameKey) === 0) this.buildName = val.substr(this.buildNameKey.length + 1);
        if (val.indexOf(this.buildDescKey) === 0) this.buildDesc = val.substr(this.buildDescKey.length + 1);
        if (val.indexOf(this.buildResultKey) === 0) this.buildResult = val.substr(this.buildResultKey.length + 1);
        if (val.indexOf(this.buildReasonKey) === 0) this.buildReason = val.substr(this.buildReasonKey.length + 1);
      });

      if (this.target === undefined || this.target === null) {
        console.log(this.targetKey + ' not provided. Tesults disabled.');
        this.disabled = true;
        return;
      } // Config file


      let config;

      if (this.config !== undefined) {
        try {
          const raw = fs.readFileSync(this.config, 'utf8');
          config = JSON.parse(raw);
        } catch (err) {
          config = undefined;
          if (err.code === 'ENOENT') console.log('Tesults error reading config file, check supplied tesults-config arg path is correct. ' + this.config);else console.log('Tesults error reading config file, check content is valid. ' + this.config);
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

    async reportFixtureStart(name) {
      this.fixture = name;
    },

    async reportTestStart(name) {
      if (this.disabled === true) return;
      this.startTimes[this.fixture + '-' + name] = Date.now();
    },

    async reportTestDone(name, testRunInfo, meta) {
      if (this.disabled === true) return;
      const testCase = {};
      testCase.name = name;
      testCase.suite = this.fixture;
      if (testCase.suite === null || testCase.suite === undefined) delete testCase.suite;
      let result = 'unknown';

      if (testRunInfo.warnings.length > 0) {
        testCase['_Warnings'] = [];
        testRunInfo.warnings.forEach(function (warning) {
          testCase['_Warnings'].push(warning);
        });
      }

      if (testRunInfo.skipped !== true) {
        if (testRunInfo.errs.length > 0) {
          result = 'fail';
          testCase.reason = [];
          testRunInfo.errs.forEach((err, idx) => {
            testCase.reason.push(this.formatError(err, `${idx + 1}) `));
          });
        } else result = 'pass';
      }

      testCase.result = result; // start, end

      testCase['start'] = this.startTimes[this.fixture + '-' + name];
      testCase['end'] = Date.now();
      testCase['duration'] = testRunInfo.durationMs; // unstable

      const unstable = testRunInfo.unstable;

      if (unstable !== undefined && unstable !== null) {
        if (unstable === true) testCase['_Unstable'] = 'This test case has been marked as unstable.';
      } // meta


      if (meta !== undefined && meta !== null) {
        Object.keys(meta).forEach(function (key) {
          if (key === 'description' || key === 'desc') testCase.desc = meta[key];else testCase['_' + key] = meta[key];
        });
      } // quarantine
      //const quarantine = testRunInfo.quarantine;
      // First store screenshots taken with TestCafe screenshot api


      if (testRunInfo.screenshots !== undefined && testRunInfo.screenshots !== null) {
        if (testRunInfo.screenshots.length > 0) testCase.files = [];
      }

      testRunInfo.screenshots.forEach(function (screenshot) {
        testCase.files.push(screenshot.screenshotPath);
      }); // Second, store any files saved within Tesults expected files directory

      const files = this.caseFiles(testCase.suite, testCase.name);

      if (files.length > 0) {
        if (testCase.files === undefined) testCase.files = [];
        files.forEach(function (file) {
          testCase.files.push(file);
        });
      }

      // Enhanced reporting

      // Files
      if (supplemental_data[testRunInfo.testId] !== undefined) {
        if (supplemental_data[testRunInfo.testId].files !== undefined) {
          const erFiles = supplemental_data[testRunInfo.testId].files;
          if (Array.isArray(erFiles)) {
            for (f of erFiles) {
              if (testCase.files === undefined) {
                testCase.files = [];
              }
              testCase.files.push(f);
            }
          }
        }
      }

      // Description
      if (supplemental_data[testRunInfo.testId] !== undefined) {
        if (supplemental_data[testRunInfo.testId].desc !== undefined) {
          testCase.desc = supplemental_data[testRunInfo.testId].desc;
        }
      }

      // Custom
      if (supplemental_data[testRunInfo.testId] !== undefined) {
        if (supplemental_data[testRunInfo.testId].custom !== undefined) {
          for (const [key, value] of supplemental_data[testRunInfo.testId].custom.entries()) {
            testCase["_" + key] = value;
          }
        }
      }
      
      // Steps
      if (supplemental_data[testRunInfo.testId] !== undefined) {
        if (supplemental_data[testRunInfo.testId].steps !== undefined) {
          testCase.steps = [];
          for (const step of supplemental_data[testRunInfo.testId].steps) {
            testCase.steps.push(step);
          }
        }
      }

      this.data.results.cases.push(testCase);
    },

    timeout: function (ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    async reportTaskDone()
    /* endTime, passed, warnings */
    {
      if (this.disabled === true) return; // build case

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
        } else buildCase.result = 'unknown';

        const files = this.caseFiles(buildCase.suite, buildCase.name);
        if (files.length > 0) buildCase.files = files;
        this.data.results.cases.push(buildCase);
      } // Tesults upload


      this.data.target = this.target;
      console.log('Tesults results upload...');

      try {
        const response = await resultsUploadAsync(this.data);
        console.log('Success: ' + response.success);
        console.log('Message: ' + response.message);
        console.log('Warnings: ' + response.warnings.length);
        console.log('Errors: ' + response.errors.length);
      } catch (err) {
        console.log('Tesults library error, failed to upload.');
      }
    }

  };
};