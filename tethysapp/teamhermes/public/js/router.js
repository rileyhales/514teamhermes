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
        "dojo/domReady!"
    ], function (Map, GraphicsLayer, Graphic, Point, Geoprocessor, LinearUnit, FeatureSet, MapView) {

        //a map with basemap
        const map = new Map({
            basemap: "streets"
        });

        //a graphics layer to show input point and output polygon
        const graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        const view = new MapView({
            container: "viewDiv",
            map: map,
            center: [-111.647070, 40.251468], //40.251468, -111.647070
            zoom: 10
        });

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

        // Geoprocessing service url
        const gpUrl = "http://geoserver2.byu.edu/arcgis/rest/services/TeamHermes/NetworkAnalystEMS/GPServer/NetworkAnalystEMS";

        // create a new Geoprocessor
        const gp = new Geoprocessor(gpUrl);
        // define output spatial reference
        gp.outSpatialReference = { // autocasts as new SpatialReference()
            wkid: 102100 //EPSG3857
        };

        //add map click function
        view.on("click", addPoint);

        //main function
        function addPoint(event) {

            graphicsLayer.removeAll();

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
            graphicsLayer.add(inputGraphic);

            $("#point-location").fadeIn();
            $("#lat").html("<p style='margin-left: 15px'>- Latitude: " + lat + "</p>");
            $("#lon").html("<p style='margin-left: 15px'>- Longitude: " + lon + "</p>");
        }

        $(document).ready(function () {
            $("#process-request").click(function () {
                processRequest();
            });
        });

        function processRequest() {


            const lat = parseFloat($("#lat").text().substr(12));
            const lon = parseFloat($("#lon").text().substr(13));

            if ( isNaN(lat) && isNaN(lon) ) {  // User did not click a point

                alert("Please place a point on the map by clicking it.");

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
                graphicsLayer.add(inputGraphic);
                const inputGraphicContainer = [];
                inputGraphicContainer.push(inputGraphic);
                const featureSet = new FeatureSet();
                featureSet.features = inputGraphicContainer;

                // input parameters
                const params = {
                    "Input_Locations": featureSet,
                };

                gp.submitJob(params).then(completeCallback, errBack, statusCallback);

            }
        }

        function completeCallback(result) {
            gp.getResultData(result.jobId, "Routes").then(drawResult, drawResultErrBack);

        }

        function drawResult(data) {

            console.log("Drawing Shape");
            const polygon_feature = data.value.features[0];
            polygon_feature.symbol = fillSymbol;
            graphicsLayer.add(polygon_feature);

            $("#loader").fadeOut();
        }

        function drawResultErrBack(err) {
            console.log("draw result error: ", err);
            $("#loader").fadeOut();
        }

        function statusCallback(data) {
            console.log(data.jobStatus);
        }

        function errBack(err) {
            console.log("gp error: ", err);
        }
    });
});