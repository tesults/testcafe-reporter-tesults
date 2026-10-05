/* global fixture */

fixture('TestCafe action reporting');

test('reports a passing test', async t => {
    await t.expect(true).ok();
});

test.skip('reports a skipped test', async t => {
    await t.expect(true).ok();
});
