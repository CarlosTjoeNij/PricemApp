// Your Geoapify API Key
const apiKey = "8155b35e4cef4b79bff7bbfa39470eac";

// Apify dataset of hotels in the Netherlands (scraped from Google Maps).
// The dataset's access level is set to "anyone with the ID can read", so no
// Apify token is exposed client-side
const hotelsDatasetUrl = "https://api.apify.com/v2/datasets/RVui8jn05k2d5hF7U/items?fields=title,address,website,location,imageUrl";

// Initialize the map with default coordinates (before getting the user's location)
const map = L.map('map').setView([0, 0], 2); // Start with a world view

// Add Geoapify Tile Layer
L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`, {
    attribution: '&copy; <a href="https://www.geoapify.com/">Geoapify</a>',
    maxZoom: 20,
}).addTo(map);

// Brand-colored pin icon (teardrop with a white core), used for both the
// user's own location and the hotel markers so every pin matches the palette
function createPinIcon(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="5.5" fill="#ffffff"/>
    </svg>`;

    return L.icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });
}

const youIcon = createPinIcon('#240046');
const hotelIcon = createPinIcon('#ff7900');

function showUserLocation(latitude, longitude) {
    map.setView([latitude, longitude], 14);

    L.marker([latitude, longitude], { icon: youIcon }).addTo(map)
        .bindTooltip('You', { permanent: true, direction: 'top', offset: [0, -38] })
        .openTooltip();
}

// Fall back to Geoapify's IP-based lookup (city-level accuracy) when the
// browser's own, much more precise Geolocation API isn't available or is denied
function locateByIp() {
    fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${apiKey}`, {
        method: 'GET',
    })
        .then(response => response.json())
        .then(result => {
            const { latitude, longitude } = result.location;
            showUserLocation(latitude, longitude);
        })
        .catch(error => console.error('Error fetching IP location:', error));
}

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        position => showUserLocation(position.coords.latitude, position.coords.longitude),
        () => locateByIp(),
        { enableHighAccuracy: true, timeout: 10000 }
    );
} else {
    locateByIp();
}

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
                    ? `<br><a href="${hotel.website}" target="_blank" rel="noopener" class="popup-cta">Boek hier bij hotel</a>`
                    : '';
                const photo = hotel.imageUrl
                    ? `<br><img src="${hotel.imageUrl}" alt="${name}" class="hotel-popup-photo" onerror="this.remove()">`
                    : '';

                L.marker([lat, lng], { icon: hotelIcon })
                    .bindPopup(`<strong>${name}</strong>${photo}<br>${address}${websiteLink}`)
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

// Cloudflare Worker that proxies the NDW charge-point GeoJSON API and adds
// the CORS headers it doesn't send itself - see cloudflare-worker/README.md
const chargingProxyUrl = 'https://ndw-charging-proxy.carlostjoenij.workers.dev';

const chargingIcon = createPinIcon('#7b2cbf');
const chargingLayer = L.featureGroup().addTo(map);
let chargingStationsActive = false;

// The NDW API caps requests to a 1 degree squared bounding box, which is
// smaller than the whole of the Netherlands, so charging points are loaded
// for the current map view rather than all at once like the hotels dataset
function boundsToClampedBbox(bounds) {
    const maxSpan = 1.0;
    const center = bounds.getCenter();
    const lonSpan = Math.min(bounds.getEast() - bounds.getWest(), maxSpan);
    const latSpan = Math.min(bounds.getNorth() - bounds.getSouth(), maxSpan);

    return [
        center.lng - lonSpan / 2,
        center.lat - latSpan / 2,
        center.lng + lonSpan / 2,
        center.lat + latSpan / 2,
    ].join(',');
}

function describeAvailability(availabilities) {
    if (!availabilities || availabilities.length === 0) return '';

    return availabilities
        .map(a => `${a.connector_type}: ${a.available}/${a.total} beschikbaar`)
        .join('<br>');
}

function loadChargingStations() {
    const bbox = boundsToClampedBbox(map.getBounds());

    fetch(`${chargingProxyUrl}?bbox=${bbox}`)
        .then(response => response.json())
        .then(geojson => {
            chargingLayer.clearLayers();

            (geojson.features || []).forEach(feature => {
                const [lng, lat] = feature.geometry.coordinates;
                const props = feature.properties;
                const name = props.operator_name || 'Laadpaal';
                const status = props.open ? 'Open' : 'Gesloten';
                const availability = describeAvailability(props.availabilities);

                L.marker([lat, lng], { icon: chargingIcon })
                    .bindPopup(`<strong>${name}</strong><br>${props.address}<br>Status: ${status}<br>${availability}`)
                    .addTo(chargingLayer);
            });
        })
        .catch(error => console.error('Error fetching charging stations:', error));
}

document.getElementById('charging-link').addEventListener('click', event => {
    event.preventDefault();
    chargingStationsActive = true;
    loadChargingStations();
});

// Refresh charging points as the user pans/zooms, since they're loaded for
// the current viewport rather than fetched once like the hotels dataset
map.on('moveend', () => {
    if (chargingStationsActive) loadChargingStations();
});
