# testcafe-reporter-tesults
[![Build Status](https://travis-ci.org/ /testcafe-reporter-tesults.svg)](https://travis-ci.org/ /testcafe-reporter-tesults)

This is the **tesults** reporter plugin for [TestCafe](http://devexpress.github.io/testcafe).

<p align="center">
    <img src="https://raw.github.com/ /testcafe-reporter-tesults/master/media/preview.png" alt="preview" />
</p>

## Install

```
npm install testcafe-reporter-tesults
```

## Usage

When you run tests from the command line, specify the reporter name by using the `--reporter` option:

```
testcafe chrome 'path/to/test/file.js' --reporter tesults
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

## Author
 (https://tesults.com)
