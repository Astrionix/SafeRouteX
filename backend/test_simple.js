import axios from 'axios';

const test = async () => {
    try {
        const res = await axios.post('http://localhost:4000/api/route/get', {
            origin: { lat: 12.9716, lon: 77.5946 },
            destination: { lat: 12.9352, lon: 77.6245 }
        });
        const { fastest, safest } = res.data.routes;
        console.log(`FAST: ${fastest.duration} / ${fastest.distance}km / Safe:${fastest.safetyScore}`);
        console.log(`SAFE: ${safest.duration} / ${safest.distance}km / Safe:${safest.safetyScore}`);

        if (fastest.duration !== safest.duration) console.log("DIFFERENT ✅");
        else console.log("SAME ❌");
    } catch (e) { console.error(e.message); }
};
test();
