// Your Geoapify API Key
const apiKey = "8155b35e4cef4b79bff7bbfa39470eac";

// Apify dataset of hotels in the Netherlands (scraped from Google Maps),
// shared via its signed URL so no Apify token is exposed client-side
const hotelsDatasetUrl = "https://api.apify.com/v2/datasets/qaDEuxTelSjRqQJWS/items?signature=MC4wLlBzNFYzOXF2NDZqcjc2a0FpalBs&fields=title,address,website,location";

// Initialize the map with default coordinates (before getting the user's location)
const map = L.map('map').setView([0, 0], 2); // Start with a world view

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

// Layer group so a new hotel search clears the previous markers
const hotelsLayer = L.featureGroup().addTo(map);

function loadHotels() {
    hotelsLayer.clearLayers();

    fetch(hotelsDatasetUrl)
        .then(response => response.json())
        .then(hotels => {
            hotels.forEach(hotel => {
                if (!hotel.location) return;

                const { lat, lng } = hotel.location;

                // Skip the Caribbean Netherlands (Bonaire, Saba, Sint Eustatius) so
                // the map fits to mainland NL instead of zooming out across the Atlantic
                if (lat < 50.5 || lat > 53.7 || lng < 3.2 || lng > 7.3) return;

                const name = hotel.title || 'Hotel';
                const address = hotel.address || 'Address unknown';
                const websiteLink = hotel.website
                    ? `<br><a href="${hotel.website}" target="_blank" rel="noopener">Website</a>`
                    : '';

                L.marker([lat, lng])
                    .bindPopup(`<strong>${name}</strong><br>${address}${websiteLink}`)
                    .addTo(hotelsLayer);
            });

            if (hotels.length > 0) {
                map.fitBounds(hotelsLayer.getBounds());
            }
        })
        .catch(error => console.error('Error fetching hotels:', error));
}

document.getElementById('hotels-link').addEventListener('click', event => {
    event.preventDefault();
    loadHotels();
});
