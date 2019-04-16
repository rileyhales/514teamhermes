// Getting the csrf token
let csrftoken = Cookies.get('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
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
        "esri/tasks/Geoprocessor",
        "esri/tasks/support/LinearUnit",
        "esri/tasks/support/FeatureSet",
        "esri/views/MapView",
        "esri/layers/MapImageLayer",
        "esri/widgets/LayerList",
        'esri/views/draw/Draw',
        "esri/geometry/geometryEngine",
        "esri/widgets/Sketch",
    ], function (Map, GraphicsLayer, Graphic, Point, Geoprocessor, LinearUnit, FeatureSet, MapView, MapImageLayer,
                 LayerList, Draw, geometryEngine, Sketch) {

        //////////////////////////////////////////////////////////////////////////// MAP SETUP
        // The map with basemap
        const map = new Map({
            basemap: "streets",
        });

        const view = new MapView({
            container: "viewDiv",
            map: map,
            center: [-111.647070, 40.251468], //40.251468, -111.647070
            zoom: 10
        });

        //////////////////////////////////////////////////////////////////////////// EMS, FIRE, POLICE LAYERS
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

        map.add(policeLayer);
        map.add(fireStationLayer);
        map.add(emsLayer);

        //////////////////////////////////////////////////////////////////////////// ADD DRAWING LAYERS
        const pointLayer = new GraphicsLayer({
            title: "Incident Location"
        });
        const obstructionsLayer = new GraphicsLayer({
            title: "Obstructions drawn by the user"
        });
        const resultsLayer = new GraphicsLayer({
            title: "Routes to Take"
        });
        map.add(pointLayer);
        // map.add(obstructionsLayer);
        map.add(resultsLayer);

        // add the legend to the map
        const layerList = new LayerList({
            view: view,
        });
        view.ui.add(layerList, {
            position: "top-right",
        });


        //////////////////////////////////////////////////////////////////////////// DRAWING CONTROLS
        const draw = new Draw({
            view: view
        });
        // add the control buttons to the map
        view.ui.add("line-button", "top-left");
        view.ui.add("point-button", "top-left");
        view.ui.add("erase-button", "top-left");

        // listeners for the 3 buttons
        $("#line-button").click(function() {
            // clear the layer then start drawing
            view.graphics.removeAll();
            const action = draw.create("polyline");
            view.focus(); // focus the view to activate keyboard shortcuts for sketching

            // listen polylineDrawAction events to give immediate visual feedback
            // to users as the line is being drawn on the view.
            action.on(
                [
                    "vertex-add",
                    "vertex-remove",
                    "cursor-update",
                    "redo",
                    "undo",
                    "draw-complete"
                ],
                updateVertices
            );
        });

        $("#point-button").click(function() {
            view.on("click", addPoint);
        });

        $("#erase-button").click(function() {
            view.graphics.removeAll();
            pointLayer.removeAll();
            obstructionsLayer.removeAll();
            resultsLayer.removeAll();
        });

        //////////////////////////////////////////////////////////////////////////// FUNCTIONS FOR DRAWING A POLYLINE
        // Checks if the last vertex is making the line intersect itself.
        function updateVertices(event) {
            // create a polyline from returned vertices
            if (event.vertices.length > 1) {
                const result = createGraphic(event);

                // if the last vertex is making the line intersects itself,
                // prevent the events from firing
                if (result.selfIntersects) {
                    event.preventDefault();
                }
            }
        }
        // create a new graphic presenting the polyline that is being drawn on the view
        const blockage_featureSet = new FeatureSet();
        function createGraphic(event) {
            view.graphics.removeAll();
            obstructionsLayer.removeAll();
            // a graphic representing the polyline that is being drawn
            const graphic = new Graphic({
                geometry: {
                    type: "polyline",
                    paths: event.vertices,
                    spatialReference: view.spatialReference
                },
                symbol: {
                    type: "simple-line", // autocasts as new SimpleFillSymbol
                    color: [4, 90, 141],
                    width: 4,
                    cap: "round",
                    join: "round"
                }
            });
            obstructionsLayer.add(graphic);
            let blockGraphicContainer = [];
            blockGraphicContainer.push(graphic);
            blockage_featureSet.features = blockGraphicContainer;

            // check if the polyline intersects itself.
            const intersectingSegment = getIntersectingSegment(graphic.geometry);
            // Add a new graphic for the intersecting segment.
            if (intersectingSegment) {
                view.graphics.addMany([graphic, intersectingSegment]);
            }
            // Just add the graphic representing the polyline if no intersection
            else {
                view.graphics.add(graphic);
            }
            return {
                selfIntersects: intersectingSegment
            };
        }
        // function that checks if the line intersects itself
        function isSelfIntersecting(polyline) {
            if (polyline.paths[0].length < 3) {
                return false;
            }
            const line = polyline.clone();

            //get the last segment from the polyline that is being drawn
            const lastSegment = getLastSegment(polyline);
            line.removePoint(0, line.paths[0].length - 1);

            // returns true if the line intersects itself, false otherwise
            return geometryEngine.crosses(lastSegment, line);
        }
        // Checks if the line intersects itself. If yes, change the last
        // segment's symbol giving a visual feedback to the user.
        function getIntersectingSegment(polyline) {
            if (isSelfIntersecting(polyline)) {
                return new Graphic({
                    geometry: getLastSegment(polyline),
                    symbol: {
                        type: "simple-line", // autocasts as new SimpleLineSymbol
                        style: "short-dot",
                        width: 3.5,
                        color: "yellow"
                    }
                });
            }
            return null;
        }
        // Get the last segment of the polyline that is being drawn
        function getLastSegment(polyline) {
            const line = polyline.clone();
            const lastXYPoint = line.removePoint(0, line.paths[0].length - 1);
            const existingLineFinalPoint = line.getPoint(0, line.paths[0].length - 1);

            return {
                type: "polyline",
                spatialReference: view.spatialReference,
                hasZ: false,
                paths: [
                    [
                        [existingLineFinalPoint.x, existingLineFinalPoint.y],
                        [lastXYPoint.x, lastXYPoint.y]
                    ]
                ]
            };
        }

        //////////////////////////////////////////////////////////////////////////// FUNCTIONS FOR DRAWING A POINT
        // symbol for input point
        const markerSymbol = {
            type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
            color: [255, 0, 0],
            outline: { // autocasts as new SimpleLineSymbol()
                color: [255, 255, 255],
                width: 2
            }
        };
        // symbol for buffered polygon
        const fillSymbol = {
            type: "simple-line", // autocasts as new SimpleFillSymbol()
            color: [255, 0, 0, 0.5],
            // outline: { // autocasts as new SimpleLineSymbol()
            //     color: [0, 0, 0],
            //     width: 1
            // },
            width: 5,
        };
        //main function
        function addPoint(event) {
            pointLayer.removeAll();

            const lat = event.mapPoint.latitude;
            const lon = event.mapPoint.longitude;

            const point = new Point({
                longitude: lon,
                latitude: lat,
            });
            const inputGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol
            });
            pointLayer.add(inputGraphic);

            $("#point-location").fadeIn();
            $("#lat").html("<p style='margin-left: 15px'>- Latitude: " + lat + "</p>");
            $("#lon").html("<p style='margin-left: 15px'>- Longitude: " + lon + "</p>");
        }

        //////////////////////////////////////////////////////////////////////////// GEOPROCESSING FUNCTIONS
        // links to each of the 3 geoprocessing services
        const ems_gpurl = "http://geoserver2.byu.edu/arcgis/rest/services/TeamHermes/NetworkAnalystEMS/GPServer/NetworkAnalystEMS";
        const fire_gpurl = "http://geoserver2.byu.edu/arcgis/rest/services/TeamHermes/NetworkAnalystfirerouter/GPServer/NetworkAnalystfirerouter";
        const polic_gpurl = "http://geoserver2.byu.edu/arcgis/rest/services/TeamHermes/NetworkAnalystpolicerouter/GPServer/NetworkAnalystpolicerouter";

        // create a new Geoprocessor and spatial reference for each service
        const gpems = new Geoprocessor(ems_gpurl);
        gpems.outSpatialReference = { // autocasts as new SpatialReference()
            wkid: 102100 //EPSG3857
        };
        const gpfire = new Geoprocessor(fire_gpurl);
        gpfire.outSpatialReference = { // autocasts as new SpatialReference()
            wkid: 102100 //EPSG3857
        };
        const gppolice = new Geoprocessor(polic_gpurl);
        gppolice.outSpatialReference = { // autocasts as new SpatialReference()
            wkid: 102100 //EPSG3857
        };

        // On click event for the Analyze button
        $(document).ready(function () {
            $("#process-request").click(function () {
                processRequest();
            });
        });

        // On click event for the Save Analysis button
        $(document).ready(function () {
            $("#save-results").click(function () {
                saveResults();
            });
        });

        function processRequest() {
            resultsLayer.removeAll();

            const lat = parseFloat($("#lat").text().substr(12));
            const lon = parseFloat($("#lon").text().substr(13));

            if (isNaN(lat) && isNaN(lon)) {  // User did not click a point
                alert("Please place a point on the map by clicking it.");
            } else if (!($("#medical").is(":checked")) && !($("#fire").is(":checked")) && !($("#police").is(":checked"))) {
                alert("Please choose at least one emergency service to route");
            } else {  // Run the tool

                $("#loader").fadeIn();

                const point = new Point({
                    longitude: lon,
                    latitude: lat,
                });
                const inputGraphic = new Graphic({
                    geometry: point,
                    symbol: markerSymbol
                });
                pointLayer.add(inputGraphic);
                const pointGraphicContainer = [];
                pointGraphicContainer.push(inputGraphic);
                const location_featureSet = new FeatureSet();
                location_featureSet.features = pointGraphicContainer;

                console.log(location_featureSet);
                console.log(blockage_featureSet);
                // input parameters
                const params = {
                    "Input_Locations": location_featureSet,
                    "Blockage": blockage_featureSet,
                };

                if ($("#medical").is(":checked")) {
                    gpems.submitJob(params).then(completeCallback_ems, errBack, statusCallback);
                }
                if ($("#fire").is(":checked")) {
                    gpfire.submitJob(params).then(completeCallback_fire, errBack, statusCallback);
                }
                if ($("#police").is(":checked")) {
                    gppolice.submitJob(params).then(completeCallback_police, errBack, statusCallback);
                }
            }
        }

        function completeCallback_ems(result) {
            gpems.getResultData(result.jobId, "Routes").then(drawResult, drawResultErrBack);
        }

        function completeCallback_fire(result) {
            gpfire.getResultData(result.jobId, "Routes").then(drawResult, drawResultErrBack);
        }

        function completeCallback_police(result) {
            gppolice.getResultData(result.jobId, "Routes").then(drawResult, drawResultErrBack);
        }

        function drawResult(data) {

            console.log("Drawing Shape");
            const polygon_feature = data.value.features[0];
            polygon_feature.symbol = fillSymbol;
            resultsLayer.add(polygon_feature);

            $("#loader").fadeOut();
            $("#save-results").fadeIn();
        }

        function drawResultErrBack(err) {
            alert("One of the services failed to route correctly, please review the console for details then try again");
            console.log("draw result error: ", err);
            $("#loader").fadeOut();
        }

        function statusCallback(data) {
            console.log(data.jobStatus);
        }

        function errBack(err) {
            console.log("gp error: ", err);
        }

        function saveResults() {

            console.log(resultsLayer.graphics);
            console.log(pointLayer.graphics);

            console.log(blockage_featureSet.features);
            let blockageFeatureLength = blockage_featureSet.features.length;

            let allResults = resultsLayer.graphics.concat(pointLayer.graphics, blockage_featureSet.features);

            let isBlockage;
            isBlockage = blockageFeatureLength > 0;

            $.ajax({
                url: "/apps/teamhermes/save_graphics_layer/", // the endpoint
                type: "POST", // http method
                data: JSON.stringify({results: allResults, blockage: isBlockage}), // data sent with the post request, the form data from above
                dataType: "json",

                // handle a successful response
                success: function (resp) {
                    console.log(resp);

                    if (resp.status === "success") {
                        $("#save-results-status").html(`<p style="margin-left: 15px">Results Saved Successfully</p>`)
                    } else {
                        $("#save-results-status").html(`<p style="margin-left: 15px">
                                                            The following error occurred: ${resp.error_message}
                                                        </p>`)
                    }
                },
                // handle a non-successful response
                error: function (xhr, errmsg, err) {
                    console.log(xhr.status + ": " + xhr.responseText);
                }
            });
        }
    });
});