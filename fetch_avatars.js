
import https from 'https';
import fs from 'fs';

const API_KEY = 'sk_V2_hgu_k0vSWoBNPPB_L2VKgNhkBZ5m24mrrXVCng0Zek8O9Pt4';

const options = {
    hostname: 'api.heygen.com',
    path: '/v2/avatars',
    method: 'GET',
    headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
    }
};

console.log('Fetching avatars...');

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);

            // Save to JSON file
            fs.writeFileSync('heygen_avatars.json', JSON.stringify(json, null, 2));
            console.log('Saved list to heygen_avatars.json');

            if (json.data && json.data.avatars) {
                console.log(`Total Avatars: ${json.data.avatars.length}`);

                // Search for Marianne
                const marianne = json.data.avatars.find(a => a.avatar_name.toLowerCase().includes('marianne'));

                if (marianne) {
                    console.log('\n✅ FOUND MARIANNE:');
                    console.log(JSON.stringify(marianne, null, 2));
                } else {
                    console.log('\n❌ Marianne NOT found in this account.');
                }
            } else {
                console.log('Structure unexpected:', Object.keys(json));
            }
        } catch (e) {
            console.error('Error:', e.message);
            console.log('Raw Data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.end();
