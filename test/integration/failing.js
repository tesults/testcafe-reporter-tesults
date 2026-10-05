/* global fixture */

fixture('TestCafe action reporting');

test('reports an intentional failure', async t => {
    await t.expect(1).eql(2);
});
