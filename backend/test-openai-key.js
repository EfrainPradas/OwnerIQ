require('dotenv').config();

async function testOpenAIKey() {
    console.log('Testing OpenAI API Key...\n');

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.log('ERROR: OPENAI_API_KEY not found in .env file');
        return;
    }

    console.log('API Key found in .env');
    console.log('Key starts with:', apiKey.substring(0, 20) + '...');
    console.log('Key length:', apiKey.length, 'characters\n');

    // Test the key with OpenAI API
    console.log('Making test request to OpenAI...');

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        console.log('Response status:', response.status);

        if (response.status === 200) {
            const data = await response.json();
            console.log('\nSUCCESS! API key is valid');
            console.log('Available models:', data.data.length);
            console.log('Sample models:', data.data.slice(0, 3).map(m => m.id).join(', '));
        } else if (response.status === 401) {
            const error = await response.json();
            console.log('\nERROR: Invalid API key');
            console.log('Message:', error.error?.message || 'Unauthorized');
            console.log('\nAction needed:');
            console.log('1. Go to https://platform.openai.com/api-keys');
            console.log('2. Create a new API key');
            console.log('3. Update backend/.env with the new key');
        } else {
            const text = await response.text();
            console.log('\nUnexpected response:', text);
        }
    } catch (error) {
        console.log('\nERROR making request:', error.message);
    }
}

testOpenAIKey();
