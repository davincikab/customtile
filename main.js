var map;
var precipiation24hrs;
var precipitationSeries;
var nZoom, mZoom, series, activeTimeSlice, rAnimFrame;

// get the available timeslice
function fetchTimeSlice() {
    fetch('https://api.weather.com/v3/TileServer/series/productSet/PPAcore?apiKey=4dbdefdb996648c4bdefdb9966f8c4ec')
    .then(res => res.json())
    .then(response => {
        console.log(response);

        const { seriesInfo:{ radar }} = response;
        console.log(radar);

        // const { seriesInfo: { precip24hr}} = data;

        // update the zoom, extents, timeslice
        const { nativeZoom, maxZoom, series} = radar;
        mZoom = maxZoom; nZoom = nativeZoom;

        precipitationSeries = [...series].reverse();
        activeTimeSlice = series[0] ? series[0].ts : null;

        createOverlay(nativeZoom, maxZoom, series[0].ts);
    })
    .catch(error => {
        console.log(error);
    })
}


function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 41.46, lng: -100.38 },
      zoom: 4,
      streetViewControl: false,
      mapTypeControlOptions: {
        mapTypeIds: ["roadmap", "satellite"],
      },
    });

    fetchTimeSlice();

}

function createOverlay(nativeZoom, maxZoom, timeslice) {
    // map.setOptions({
    //     zoom:nativeZoom,
    //     maxZoom:maxZoom
    // });

    precipiation24hrs = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
        //   console.log(coord);
  
          let url = 'https://api.weather.com/v3/TileServer/tile/radar?'+
            'ts=' + timeslice +'&xyz='+
            coord.x +':'+ coord.y+':'+ zoom +'&apiKey=4dbdefdb996648c4bdefdb9966f8c4ec';

        //   console.log(url);
  
          return url;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity:1,
        maxZoom: 9,
        minZoom: 0,
        radius: 1738000,
        name: "Moon",
      });
  
      map.overlayMapTypes.insertAt(0, precipiation24hrs);

      animate({timing:linear, draw:updateOpacity, duration:1000});
}
  
// Keep track of the zoom level, coordinates and time slice
function animate({timing, draw, duration}) {

    let start = performance.now();
  
    rAnimFrame = requestAnimationFrame(function animate(time) {
      // timeFraction goes from 0 to 1
      let timeFraction = (time - start) / duration;
      if (timeFraction > 1) timeFraction = 1;
  
      // calculate the current animation state
      let progress = timing(timeFraction)
  
      draw(progress); // draw it
      if(progress == 1) {
          cancelAnimationFrame(rAnimFrame);
      }
  
      if (timeFraction < 1) {
        rAnimFrame = requestAnimationFrame(animate);
      }
  
    });
}

function linear(timeFraction) {
    return timeFraction;
}

function updateOpacity(opacity) {
    precipiation24hrs.setOpacity(opacity);
}

function updateOverlay(index) {
    activeTimeSlice = precipitationSeries[index].ts;
    console.log(activeTimeSlice);

    createOverlay(nZoom, mZoom, activeTimeSlice);
}

function changeTimeSlice() {
    interval = 0;
    setInterval(function(e) {
        interval += 1;
        if(interval >= precipitationSeries.length) {
            interval = 0;
        }

        updateOverlay(interval);
    }, 2000);
}