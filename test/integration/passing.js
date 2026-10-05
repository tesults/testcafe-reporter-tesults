/* global fixture */

const { Selector } = require('testcafe');

fixture('TestCafe action reporting')
    .page('data:text/html,<main id="status">ready</main>');

test('reports a passing test', async t => {
    await t.expect(Selector('#status').innerText).eql('ready');
    await t.takeScreenshot('passing.png');
});

test.skip('reports a skipped test', async t => {
    await t.expect(true).ok();
});
