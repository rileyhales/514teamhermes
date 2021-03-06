// Getting the csrf token
let csrftoken = Cookies.get('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});


// Main Function for Map
$(document).ready(function () {
    require([
        "esri/Map",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/geometry/Point",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/tasks/Geoprocessor",
        "esri/tasks/support/LinearUnit",
        "esri/tasks/support/FeatureSet",
        "esri/views/MapView",
        "esri/layers/MapImageLayer",
        "esri/widgets/LayerList",
        "esri/geometry/Polyline",
        "esri/symbols/SimpleLineSymbol",
    ], function (Map, GraphicsLayer, Graphic, Point, SimpleMarkerSymbol, Geoprocessor, LinearUnit, FeatureSet, MapView,
                 MapImageLayer, LayerList, Polyline, SimpleLineSymbol) {

        // Layers
        const policeLayerURL = "http://geoserver2.byu.edu/arcgis/rest/services/TeamHermes/LawEnforcement/MapServer";
        const policeLayer = new MapImageLayer({
            url: policeLayerURL,
            title: "Police Stations in Utah County"
        });

        const fireStationURL = "http://geoserver2.byu.edu/arcgis/rest/services/TeamHermes/Fire_Stations/MapServer";
        const fireStationLayer = new MapImageLayer({
            url: fireStationURL,
            title: "Fire Stations in Utah County"
        });

        const emsLayerURL = "http://geoserver2.byu.edu/arcgis/rest/services/TeamHermes/EMS_UTC/MapServer";
        const emsLayer = new MapImageLayer({
            url: emsLayerURL,
            title: "EMS Locations in Utah County"
        });

        // The map with basemap
        const map = new Map({
            basemap: "streets",
        });

        map.add(policeLayer);
        map.add(fireStationLayer);
        map.add(emsLayer);

        const view = new MapView({
            container: "viewDiv",
            map: map,
            center: [-111.647070, 40.251468],
            zoom: 10
        });

        // a graphics layer to show input point and output polygon
        const graphicsLayer = new GraphicsLayer({
            title: "Saved Results Layer"
        });
        map.add(graphicsLayer);

        const layerList = new LayerList({
            view: view,
        });

        view.ui.add(layerList, {
            position: "top-right",
        });

        // Add saved feature to map on click
        $("input[name='options']").change(function () {

            let tableId = $("input[name='options']:checked").val();

            $.ajax({
                url: "/apps/teamhermes/retrieve_data/", // the endpoint
                type: "POST", // http method
                data: JSON.stringify({"type": "graphics", "id": tableId}), // data sent with the post request, the form data from above
                dataType: "json",

                // handle a successful response
                success: function (resp) {
                    graphicsLayer.removeAll();

                    let pointArray = [];
                    let polylineArray = [];
                    for (let i = 0; i < resp.graphics.length; i++) {
                        if (resp.graphics[i]["layerType"] === "point") {
                            let point = new Point({
                                longitude: resp.graphics[i].geometry.x,
                                latitude: resp.graphics[i].geometry.y,
                            });

                            const symbol = SimpleMarkerSymbol.fromJSON(resp.graphics[i].symbol);

                            let pointGraphic = new Graphic({
                                geometry: point,
                                symbol: symbol,
                            });

                            pointArray.push(pointGraphic);
                        } else {
                            let polyline = new Polyline({
                                paths: resp.graphics[i].geometry.paths[0],
                                spatialReference: resp.graphics[i].geometry.spatialReference,
                            });

                            let lineSymbol;

                            if ("isBlockage" in resp.graphics[i]) {
                                lineSymbol = new SimpleLineSymbol({
                                    color: [4, 90, 141],
                                    width: 4,
                                    cap: "round",
                                    join: "round"
                                })
                            } else {
                                lineSymbol = new SimpleLineSymbol({
                                    color: [255, 0, 0, 0.5],
                                    width: 5,
                                });
                            }
                            let polylineGraphic = new Graphic({
                                geometry: polyline,
                                symbol: lineSymbol
                            });
                            polylineArray.push(polylineGraphic);
                        }
                    }

                    // Add the graphics to the view
                    for (let pointObject of pointArray) {
                        graphicsLayer.add(pointObject);
                    }
                    for (let polylineObject of polylineArray) {
                        graphicsLayer.add(polylineObject);
                    }
                },
                // handle a non-successful response
                error: function (xhr, errmsg, err) {
                    console.log(xhr.status + ": " + xhr.responseText);
                }
            });
        });
    });
});
