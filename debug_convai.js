
import fs from 'fs';

const API_KEY = 'f80eb380f6538e70b50519e5528dcf05';
const CHAR_ID = '02ae1594-0021-11f1-9abf-42010a7be027';

async function getCharDetails() {
    console.log('Fetching details for:', CHAR_ID);
    try {
        const response = await fetch('https://api.convai.com/character/get', {
            method: 'POST',
            headers: {
                'CONVAI-API-KEY': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ charID: CHAR_ID })
        });

        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            fs.writeFileSync('convai_details.json', JSON.stringify(data, null, 2));
            console.log('Saved to convai_details.json');
        } else {
            const text = await response.text();
            console.log('Error:', text);
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

getCharDetails();
