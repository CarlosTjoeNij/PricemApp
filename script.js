// Your Geoapify API Key
const apiKey = "8155b35e4cef4b79bff7bbfa39470eac";

// Initialize the map
const map = L.map('map').setView([37.7749, -122.4194], 12); // San Francisco coordinates

// Add Geoapify Tile Layer
L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`, {
    attribution: '&copy; <a href="https://www.geoapify.com/">Geoapify</a>',
    maxZoom: 20,
}).addTo(map);

// Add a marker with po pup
const marker = L.marker([37.7749, -122.4194]).addTo(map)
    .bindPopup("<b>Welcome to San Francisco!</b><br>Geoapify map example.")
    .openPopup();


    map.on('click', (event) => {
        const { lat, lng } = event.latlng;
        L.marker([lat, lng]).addTo(map)
            .bindPopup(`You clicked at<br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`)
            .openPopup();
    });

    var requestOptions = {
        method: 'GET',
      };
      
      fetch("https://api.geoapify.com/v1/ipinfo?&apiKey=161de40590c6496abb7d48bf9cfbdb79", requestOptions)
        .then(response => response.json())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
