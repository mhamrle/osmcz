var OSMCZ_APP_VERSION = '0.5';

var map, baseLayers = {}, overlays = {}, controls = {};
var marker = L.marker([0, 0]);
initmap();

function initmap() {
    map = new L.Map('map', {zoomControl: false});
    map.attributionControl.setPrefix("<a href='https://github.com/osmcz/osmcz' title='Projekt na Githubu'><img src='http://github.com/favicon.ico' width='10' style='margin-right:1ex'>osmcz-app</a> " + OSMCZ_APP_VERSION);

    // -------------------- map layers --------------------
    new osmcz.layers(map, baseLayers, overlays);

    // -------------------- map controls --------------------
    new osmcz.controls(map, baseLayers, overlays, controls);

    // -------------------- modules --------------------
    new osmcz.guideposts(map, baseLayers, overlays, controls);

    // -------------------- map state --------------------

    // set location from hash OR remembered cookie OR deafult home
    OSM.home = {lat: 49.8, lon: 15.44, zoom: 8};
    var params = OSM.mapParams();
    updateLayersFromCode(params.layers);  //default layer without code
    if (params.bounds) {
        map.fitBounds(params.bounds);
    } else {
        map.setView([params.lat, params.lon], params.zoom);
    }
    if (params.marker) {
        marker.setLatLng([params.mlat, params.mlon]).addTo(map);
    }
    if (params.object)
        alert('Zatím nepodporováno / Not supported yet //TODO!');

    // update on hash change
    var lastHash;
    $(window).bind('hashchange', function (e) {
        if (location.hash != lastHash) {
            var hash = OSM.parseHash(location.hash);
            if (hash.center)
                map.setView([hash.lat, hash.lon], hash.zoom);
            updateLayersFromCode(hash.layers);
            lastHash = location.hash;
        }
    });

    // remember last location in hash AND cookie
    map.on('moveend zoomend layeradd layerremove', function () {
        lastHash = OSM.formatHash(map)
        location.hash = lastHash;
        Cookies.set("_osm_location", OSM.locationCookie(map), {expires: 31});
    });


    // when baselayer out of max zoom - zoom it correctly
    map.on("baselayerchange", function (e) {
        if (map.getZoom() > e.layer.options.maxZoom) {
            map.setView(map.getCenter(), e.layer.options.maxZoom, {reset: true});
        }
    });

    // -------------------- home-splash-screen or text-content splash --------------------

    var showSplashOnClick = function () {
        $('nav .active').on('click.fader', function (event) {
            event.preventDefault();
            map.scrollWheelZoom.disable();
            container.fadeIn('slow');
            $(this).addClass('active').off('click.fader');
        });
    };

    var closeSplash = function () {
        map.scrollWheelZoom.enable();
        container.fadeOut('slow', function () {
            setTimeout(function () {
                $('nav .active').removeClass('active');
            }, 700);
        });

        showSplashOnClick();

        if (location.pathname == '/splash') {
            history.pushState({}, "", "/");
        }
    };

    // hide splash on map-click or map-move
    var container = $('#main .container');
    map.on('click movestart', closeSplash);

    map.scrollWheelZoom.disable(); // text-content splash is opened by default = disable scroll-zoom

    if (container.hasClass('splash')) { //home-splash-screen is hidden with CSS
        $('.close-overlay').click(closeSplash);
        container.click(function (event) {
            if (event.target.parentNode == this) //<div.row> children in <.container>
                setTimeout(closeSplash, 200);
        });

        // skrytí overlay
        if (!Cookies.get('overlayShown') || location.pathname == '/splash') {
            container.show();
            Cookies.set('overlayShown', 'yes', {expires: 7}); // expires in 7 days
        }
        else {
            map.scrollWheelZoom.enable();
            showSplashOnClick();
            $('nav .active').removeClass('active');
        }
    }

}

// set layers from coded string
function updateLayersFromCode(codedString) {
    var setLayer = function (key, layer) {
        for (var pos in codedString) {
            if (layer.options && layer.options.code == codedString[pos])
                map.addLayer(layer);
        }

        // blank code or having only UPPERCASE = overlays --> display default layer
        if ((!codedString || !codedString.match(/[a-z]/)) && layer.options && layer.options.osmczDefaultLayer)
            map.addLayer(layer);
    };
    $.each(baseLayers, setLayer);
    $.each(overlays, setLayer);
}
