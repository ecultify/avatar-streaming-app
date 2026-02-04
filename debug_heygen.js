
import fs from 'fs';
import https from 'https';

// Manual simple env parser to avoid issues
let envContent = '';
try {
    envContent = fs.readFileSync('.env', 'utf8');
    if (envContent.includes('\0')) { // heuristic for null bytes in utf16 read as utf8
        console.log('Detected UTF-16LE via null bytes, re-reading...');
        envContent = fs.readFileSync('.env', 'utf16le');
    }
} catch (e) { console.error(e); }

let apiKey = '';
// Look for VITE_HEYGEN_API_KEY
// Clean up content first just in case
const cleanContent = envContent.replace(/\r\n/g, '\n');
const match = cleanContent.match(/VITE_HEYGEN_API_KEY=["']?([^"'\n]+)["']?/);
if (match) {
    apiKey = match[1].trim();
} else {
    // try fallback liveavatar
    const match2 = cleanContent.match(/VITE_LIVEAVATAR_API_KEY=["']?([^"'\n]+)["']?/);
    if (match2) apiKey = match2[1].trim();
}

console.log('Using API Key starts with:', apiKey.substring(0, 5));

const options = {
    hostname: 'api.heygen.com',
    path: '/v2/avatars', // v2 list endpoint
    method: 'GET',
    headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.data && json.data.avatars) {
                const targetId = '3448df7404a3424d9ca2543956ca010c';
                const found = json.data.avatars.find(a => a.avatar_id === targetId);
                if (found) {
                    console.log('FOUND AVATAR:', found.avatar_name);
                    console.log('Details:', JSON.stringify(found, null, 2));
                } else {
                    console.log('Avatar ID not found in list. Listing first 5:');
                    json.data.avatars.slice(0, 5).forEach(a => console.log(a.avatar_id, a.avatar_name));
                }
            } else {
                console.log('No avatars data:', JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error('Parse error:', e);
            console.log('Raw:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
