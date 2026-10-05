/* global fixture */

fixture('TestCafe action reporting');

test('reports a passing test', async t => {
    await t.expect(true).ok();
    await t.takeScreenshot('passing.png');
});

test.skip('reports a skipped test', async t => {
    await t.expect(true).ok();
});
