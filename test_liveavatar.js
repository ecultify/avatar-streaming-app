
import https from 'https';

const API_KEY = '387d33c7-f69d-11f0-a99e-066a7fa2e369';
const CHAR_ID = 'bf00036b-558a-44b5-b2ff-1e3cec0f4ceb';

// Helper for requests
function makeRequest(path, method, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.liveavatar.com',
            path: '/v1' + path,
            method: method,
            headers: {
                'X-Api-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    console.log('Testing LiveAvatar API (CUSTOM Mode)...');

    // Try CUSTOM mode
    console.log('\n--- Attempting Create Token (mode: CUSTOM) ---');
    try {
        const payload = {
            mode: 'CUSTOM', // Validation required uppercase
            avatar_id: CHAR_ID,
        };
        const tokenRes = await makeRequest('/sessions/token', 'POST', payload);
        console.log('Status:', tokenRes.status);
        if (tokenRes.status !== 200) {
            console.log('Response:', JSON.stringify(tokenRes.data, null, 2));
        } else {
            console.log('✅ Token creation successful!');
            if (tokenRes.data && tokenRes.data.data) {
                console.log('Token:', tokenRes.data.data.token.substring(0, 20) + '...');
            }
        }
    } catch (e) {
        console.error('Token Error:', e);
    }
}

test();
