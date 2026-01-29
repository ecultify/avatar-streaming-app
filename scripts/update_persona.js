import fetch from 'node-fetch';

const API_KEY = 'e8e1034569f047129d63defd4e2b4ca2';
const PERSONA_ID = 'p760922fcb87';

async function updatePersona() {
    console.log('Updating Persona:', PERSONA_ID);

    const tools = [
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
    ];

    try {
        const response = await fetch(`https://tavusapi.com/v2/personas/${PERSONA_ID}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                layers: {
                    llm: {
                        tools: tools
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Example Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Success! Persona Updated:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Failed to update persona:', error);
    }
}

updatePersona();
