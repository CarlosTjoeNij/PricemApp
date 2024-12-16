// Your Geoapify API Key
const apiKey = "8155b35e4cef4b79bff7bbfa39470eac";

// Initialize the map with default coordinates (before getting the user's location)
//const map = L.map('map').setView([0, 0], 2); // Start with a world view

const map = new maplibregl.Map({
    container: 'my-map',
    style: 'https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=YOUR_API_KEY',
});

// Add Geoapify Tile Layer
L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`, {
    attribution: '&copy; <a href="https://www.geoapify.com/">Geoapify</a>',
    maxZoom: 20,
}).addTo(map);

// Fetch user's location using Geoapify IP info API
fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${apiKey}`, {
    method: 'GET',
})
    .then(response => response.json())
    .then(result => {
        // Extract the latitude and longitude from the response
        const { latitude, longitude } = result.location;

        // Center the map on the user's location
        map.setView([latitude, longitude], 12);

        // Add a marker for the user's location
        L.marker([latitude, longitude]).addTo(map)
            .openPopup();
    })
    .catch(error => console.error('Error fetching IP location:', error));
