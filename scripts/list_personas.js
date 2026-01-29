const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = '36b17bc35b054764ace6ee66ff209761';

async function listPersonas() {
    try {
        const response = await fetch('https://tavusapi.com/v2/personas', {
            method: 'GET',
            headers: {
                'x-api-key': API_KEY
            }
        });

        if (!response.ok) {
            console.error('Error:', response.status, await response.text());
            return;
        }

        const data = await response.json();

        if (data.data) {
            data.data.forEach(p => {
                console.log(p.persona_id + ' - ' + p.persona_name);
            });
        }
    } catch (error) {
        console.error('Failed:', error.message);
    }
}

listPersonas();
