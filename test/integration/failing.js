/* global fixture */

const { Selector } = require('testcafe');

fixture('TestCafe action reporting')
    .page('data:text/html,<main id="status">ready</main>');

test('reports an intentional failure', async t => {
    await t.expect(Selector('#status').innerText).eql('not ready');
});
