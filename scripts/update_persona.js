import fetch from 'node-fetch';

const API_KEY = '235de3bbab2146729f7e263dc26c9a65';
const PERSONA_ID = 'pb0e49e1a085';

async function updatePersona() {
    console.log('Updating Persona:', PERSONA_ID);

    // Tavus API uses JSON Patch format (RFC 6902)
    const patchOperations = [
        {
            op: "add",
            path: "/layers/llm/tools",
            value: [
                {
                    type: "function",
                    function: {
                        name: "web_search",
                        description: "Search the web for real-time information, news, or facts when you do not know the answer.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The search query to send to the search engine."
                                }
                            },
                            required: ["query"]
                        }
                    }
                }
            ]
        }
    ];

    try {
        const response = await fetch(`https://tavusapi.com/v2/personas/${PERSONA_ID}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify(patchOperations)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Success! Persona Updated.');
        console.log('Tools configured:', JSON.stringify(data.layers?.llm?.tools, null, 2));

    } catch (error) {
        console.error('Failed to update persona:', error.message);
    }
}

updatePersona();
