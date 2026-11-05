import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { getFilterRecipients } from '../src/services/recipientService';
import { pool } from '../src/database';

after(async () => {
    await pool.end();
});

test('matches accounts satisfying all filter criteria', async () => {
    const filters = [
        { id: 1, type: 'COUNTRY', value: 'US' },
        { id: 2, type: 'POLICY', value: 'MONTHLY' },
        { id: 3, type: 'MIN_CREDITS', value: '8' }
    ];

    const accountIds = await getFilterRecipients(filters);
    console.log('Matching account IDs:', accountIds);

    assert.ok(accountIds.includes(2));
    assert.ok(accountIds.includes(6));
});

test('supports OR logic within the same filter type', async () => {
    const filters = [
        { id: 1, type: 'COUNTRY', value: 'US' },
        { id: 2, type: 'COUNTRY', value: 'CA' },
        { id: 3, type: 'MIN_CREDITS', value: '10' }
    ];

    const accountIds = await getFilterRecipients(filters);

    assert.ok(accountIds.includes(2));

    assert.ok(!accountIds.includes(6));
});