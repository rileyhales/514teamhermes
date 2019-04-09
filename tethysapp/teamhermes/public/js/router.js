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
    ], function (Map, GraphicsLayer, Graphic, Point, Geoprocessor, LinearUnit, FeatureSet, MapView, MapImageLayer,
                 LayerList) {

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
            center: [-111.647070, 40.251468], //40.251468, -111.647070
            zoom: 10
        });

        // a graphics layer to show input point and output polygon
        const graphicsLayer = new GraphicsLayer({
            title: "User Input and Results Layer"
        });
        map.add(graphicsLayer);

        const layerList = new LayerList({
            view: view,
        });

        view.ui.add(layerList, {
            position: "top-right",
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

        function processRequest() {


            const lat = parseFloat($("#lat").text().substr(12));
            const lon = parseFloat($("#lon").text().substr(13));

            if (isNaN(lat) && isNaN(lon)) {  // User did not click a point

                alert("Please place a point on the map by clicking it.");
            // } else if (all the checkboxes are false) {
            //     alert("Please choose at least one emergency service to route")
            // }
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