
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

    let token = null;

    // Try CUSTOM mode
    console.log('\n--- Attempting Create Token (mode: CUSTOM) ---');
    try {
        const payload = {
            mode: 'CUSTOM', // Validation required uppercase
            avatar_id: CHAR_ID,
        };
        const tokenRes = await makeRequest('/sessions/token', 'POST', payload);
        console.log('Status:', tokenRes.status);
        console.log('Raw Data:', JSON.stringify(tokenRes.data, null, 2)); // Add this
        if (tokenRes.status !== 200) {
            console.log('Response:', JSON.stringify(tokenRes.data, null, 2));
        } else {
            // Correct field is session_token
            if (tokenRes.data && tokenRes.data.data && tokenRes.data.data.session_token) {
                token = tokenRes.data.data.session_token;
                console.log('Token (first 50):', token.substring(0, 50) + '...');
            } else {
                console.log('Warning: No session_token found. Full Data:', JSON.stringify(tokenRes.data, null, 2));
            }
        }
    } catch (e) {
        console.error('Token Error:', e.message);
    }

    if (token) {
        console.log('\n--- Testing Session Start Endpoints ---');

        const endpoints = ['/sessions/new', '/sessions/start', '/streaming.new'];

        for (const ep of endpoints) {
            console.log(`\nTesting endpoint: ${ep}`);
            try {
                // Note: We need to use the TOKEN for session start auth usually, or API Key.
                // HeyGen SDK calls streaming.new with API Key? 
                // Let's try with headers as configured.

                const startRes = await makeRequest(ep, 'POST', {
                    quality: 'medium',
                    avatar_name: CHAR_ID, // Some use avatar_name, some avatar_id
                    voice: { voice_id: 'en-US-Neural2-A' }
                    // LiveAvatar might need different body?
                });

                console.log(`Status [${ep}]:`, startRes.status);
                if (startRes.status === 200 || startRes.status === 201) {
                    console.log(`✅ SUCCESS with endpoint: ${ep}`);
                    console.log('Response:', JSON.stringify(startRes.data, null, 2));
                    break;
                } else {
                    console.log(`❌ Failed [${ep}]. Msg:`, startRes.data?.message || startRes.status);
                }
            } catch (e) {
                console.error(`Error [${ep}]:`, e.message);
            }
        }
    }
}

test();
