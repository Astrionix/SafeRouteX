import axios from 'axios';

const testRoute = async () => {
    try {
        console.log('Testing /api/route/get...');
        const response = await axios.post('http://localhost:4000/api/route/get', {
            origin: { lat: 12.9716, lon: 77.5946 },
            destination: { lat: 12.9352, lon: 77.6245 }
        });

        console.log('Response Status:', response.status);
        // console.log('Response Data:', JSON.stringify(response.data, null, 2));

        const { fastest, safest } = response.data.routes;

        console.log('\n--- Route Comparison ---');
        console.log(`🏎️  Fastest Route: ${fastest.duration} (${fastest.distance.toFixed(2)} km) | Safety Score: ${fastest.safetyScore}`);
        console.log(`🛡️  Safest Route:  ${safest.duration} (${safest.distance.toFixed(2)} km) | Safety Score: ${safest.safetyScore}`);
        console.log('------------------------\n');

        if (fastest.duration !== safest.duration) {
            console.log('✅ SUCCESS: Safest route has different metrics (simulated safety bias).');
        } else {
            console.log('⚠️  WARNING: Metrics are identical. Safety bias might not be applied.');
        }

        if (fastest.distance === 5.2 && fastest.duration === '15 min') {
            console.warn('⚠️  WARNING: Returned FALLBACK data. Real routing failed.');
        } else {
            console.log('✅ SUCCESS: Returned REAL route data from GraphHopper.');
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
};

testRoute();
