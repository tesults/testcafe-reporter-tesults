# testcafe-reporter-tesults
[![Test](https://github.com/tesults/testcafe-reporter-tesults/actions/workflows/test.yml/badge.svg)](https://github.com/tesults/testcafe-reporter-tesults/actions/workflows/test.yml)

This is the **tesults** reporter plugin for [TestCafe](http://devexpress.github.io/testcafe).

<p align="center">
    <img src="https://raw.githubusercontent.com/tesults/testcafe-reporter-tesults/master/media/preview.png" alt="preview" />
</p>

## Install

```sh
npm install --save-dev testcafe-reporter-tesults
```

## Usage

When you run tests from the command line, specify the reporter name by using the `--reporter` option:

```sh
testcafe chrome 'path/to/test/file.js' --reporter tesults -- tesults-target=YOUR_TARGET_TOKEN
```


When you use API, pass the reporter name to the `reporter()` method:

```js
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('chrome')
    .reporter('tesults') // <-
    .run();
```

## GitHub Actions reporting

Version 1.3.0 and later supports `tesults/test-automation-reporting` without a Tesults account or target token:

```yaml
- name: Set up test automation reporting
  uses: tesults/test-automation-reporting@v1

- name: Run TestCafe tests
  run: npx testcafe chrome:headless 'path/to/test/file.js' --reporter tesults
```

The action sets `TESULTS_OUTPUT_FILE` automatically. Existing target-token uploads continue to work, and both destinations are written when a target and the environment variable are present.

## Author

[Tesults](https://www.tesults.com)
