// get the available timeslice
function fetchTimeSlice() {
    fetch('https://api.weather.com/v3/TileServer/series/productSet/PPAcore?apiKey=4dbdefdb996648c4bdefdb9966f8c4ec')
    .then(res => res.json())
    .then(response => {
        const { seriesInfo:{ precip24hr }} = response;
        console.log(precip24hr);

        // update the zoom, extents, timeslice
    })
    .catch(error => {
        console.log(error);
    })
}

fetchTimeSlice();

function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 5, lng: 13 },
      zoom: 6,
      streetViewControl: false,
      mapTypeControlOptions: {
        mapTypeIds: ["roadmap", "satellite"],
      },
    });

    const precipiation24hrs = new google.maps.ImageMapType({
      getTileUrl: function (coord, zoom) {
        console.log(coord);

        const bound = Math.pow(2, zoom);
        let url = 'https://api.weather.com/v3/TileServer/tile/precip24hr?ts=1605019800&xyz='
            + coord.x +':'+ coord.y+':'+ zoom +'&apiKey=4dbdefdb996648c4bdefdb9966f8c4ec';
        console.log(url);

        return url;
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 9,
      minZoom: 0,
      radius: 1738000,
      name: "Moon",
    });

    map.overlayMapTypes.insertAt(0, precipiation24hrs);

}
  
// Keep track of the zoom level, coordinates and time slice