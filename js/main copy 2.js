// Pseudo-global variables

// List of attributes to visualize in the map and chart
var attrArray = ["varA", "varB", "varC", "varD", "varE"];

// Initial attribute to visualize (first item in attrArray)
var expressed = attrArray[0];

// Chart frame dimensions
var chartWidth = window.innerWidth * 0.425, // Width of the chart
    chartHeight = 473, // Height of the chart
    leftPadding = 25, // Padding on the left
    rightPadding = 2, // Padding on the right
    topBottomPadding = 5, // Padding on the top and bottom
    chartInnerWidth = chartWidth - leftPadding - rightPadding, // Inner width of the chart
    chartInnerHeight = chartHeight - topBottomPadding * 2, // Inner height of the chart
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")"; // Translation for positioning

// Create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([463, 0]) // Output range
    .domain([0, 110]); // Input domain

// Global variables to hold the map and data
var map; // The map SVG element
var franceRegions; // GeoJSON features of France regions
var csvData; // CSV data loaded

// Begin script when window loads
window.onload = setMap();

// Function to set up the map and visualizations
function setMap(){
    // Map frame dimensions
    var width = window.innerWidth * 0.5, // Width of the map
        height = 460; // Height of the map

    // Create new SVG container for the map
    map = d3.select("body") // Assign to global variable 'map'
        .append("svg")
        .attr("class", "map") // Class name for styling
        .attr("width", width) // Set width
        .attr("height", height); // Set height

    // Create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 46.2]) // Center the projection
        .rotate([-2, 0]) // Rotate the projection
        .parallels([43, 62]) // Set the parallels
        .scale(2500) // Scale the projection
        .translate([width / 2, height / 2]); // Translate the projection

    // Create path generator using the projection
    var path = d3.geoPath()
        .projection(projection);

    // Update the data loading promises to reflect the correct file extensions if necessary
    var promises = [
        d3.csv("data/unitsData.csv"),               // Load attributes from CSV
        d3.json("data/EuropeCountries.geojson"),    // Load Europe countries GeoJSON
        d3.json("data/FranceRegions.geojson")       // Load France regions GeoJSON
    ];

    // Use Promise.all to parallelize asynchronous data loading
    Promise.all(promises).then(callback);

    // Callback function to handle the data after loading
    function callback(data) {
        // Assign data to variables
        csvData = data[0];              // CSV data loaded
        var europe = data[1];           // Europe countries GeoJSON
        var france = data[2];           // France regions GeoJSON

        // Place graticule (grid lines) on the map
        setGraticule(map, path);

        // Since the data is already in GeoJSON format, you don't need to convert it
        // Extract the features from the GeoJSON data
        var europeCountries = europe.features;         // Get Europe countries features
        var franceRegionsGeoJSON = france.features;    // Get France regions features

        // Add Europe countries to map
        var countries = map.selectAll(".countries")
            .data(europeCountries)                    // Bind data to elements
            .enter()                                  // Create new elements
            .append("path")                           // Append path elements
            .attr("class", "countries")               // Assign class for styling
            .attr("d", path);                         // Project the data as SVG paths

        // Join CSV data to GeoJSON enumeration units
        franceRegions = joinData(franceRegionsGeoJSON, csvData);

        // Create the color scale
        var colorScale = makeColorScale(csvData);

        // Add regions to the map as enumeration units
        setEnumerationUnits(franceRegions, map, path, colorScale);

        // Add coordinated bar chart to the map
        setChart(csvData, colorScale);

        // Create dropdown menu for attribute selection
        createDropdown(csvData);
    }
}

// Function to join CSV data to GeoJSON features
function joinData(franceRegionsGeoJSON, csvData){
    // Loop through CSV data to assign each set of CSV attribute values to GeoJSON region
    for (var i = 0; i < csvData.length; i++){
        var csvRegion = csvData[i]; // The current region in CSV
        var csvKey = csvRegion.adm1_code; // The CSV primary key

        // Loop through GeoJSON regions to find matching region
        for (var a = 0; a < franceRegionsGeoJSON.length; a++){
            var geojsonProps = franceRegionsGeoJSON[a].properties; // The current region's GeoJSON properties
            var geojsonKey = geojsonProps.adm1_code; // The GeoJSON primary key

            // Where primary keys match, transfer CSV data to GeoJSON properties
            if (geojsonKey == csvKey){
                // Assign all attributes and values to GeoJSON properties
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); // Get CSV attribute value
                    geojsonProps[attr] = val; // Assign attribute and value
                });
            }
        }
    }
    return franceRegionsGeoJSON; // Return the updated GeoJSON features
}

// Function to create graticule (grid lines) on the map
function setGraticule(map, path){
    // Create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); // Place graticule lines every 5 degrees

    // Create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) // Bind graticule background
        .attr("class", "gratBackground") // Assign class for styling
        .attr("d", path); // Project graticule

    // Create graticule lines
    var gratLines = map.selectAll(".gratLines") // Select elements to be created
        .data(graticule.lines()) // Bind graticule lines data
        .enter() // Create elements for each datum
        .append("path") // Append path elements
        .attr("class", "gratLines") // Assign class for styling
        .attr("d", path); // Project graticule lines
}

// Function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    // Create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    // Build array of expressed attribute values
    var domainArray = [];
    for (var i = 0; i < data.length; i++){
        var val = parseFloat(data[i][expressed]);
        if (!isNaN(val)){
            domainArray.push(val);
        }
    }

    // Assign array as scale domain
    colorScale.domain(domainArray);

    return colorScale;
}

// Function to add enumeration units (regions) to the map
function setEnumerationUnits(franceRegions, map, path, colorScale){
    // Add France regions to map
    var regions = map.selectAll(".regions")
        .data(franceRegions)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.adm1_code; // Assign class for styling
        })
        .attr("d", path) // Project the data as SVG paths
        .style("fill", function(d){
            var value = d.properties[expressed]; // Get the value of the expressed attribute
            if (value){
                return colorScale(value); // Assign color based on data value
            } else {
                return "#ccc"; // Assign gray color if no data
            }
        })
        .on("mouseover", function(event, d){
            highlight(d.properties); // Highlight on mouseover
        })
        .on("mouseout", function(event, d){
            dehighlight(d.properties); // Remove highlight on mouseout
        })
        .on("mousemove", moveLabel); // Move label with mouse

    // Add style descriptor to each path
    var desc = regions.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}'); // Default styles
}

// Function to create coordinated bar chart
function setChart(csvData, colorScale){
    // Create a second SVG element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth) // Set width
        .attr("height", chartHeight) // Set height
        .attr("class", "chart"); // Class name for styling

    // Create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground") // Class name for styling
        .attr("width", chartInnerWidth) // Set width
        .attr("height", chartInnerHeight) // Set height
        .attr("transform", translate); // Position the chart

    // Create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([chartInnerHeight, 0]) // Output range
        .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed]); }) * 1.1]); // Input domain

    // Set bars for each region
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed] - a[expressed]; // Sort bars based on value
        })
        .attr("class", function(d){
            return "bar " + d.adm1_code; // Assign class for styling
        })
        .attr("width", chartInnerWidth / csvData.length - 1) // Set bar width
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding; // Position bars horizontally
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + topBottomPadding; // Position bars vertically
        })
        .attr("height", function(d){
            return chartInnerHeight - yScale(parseFloat(d[expressed])); // Set bar height
        })
        .style("fill", function(d){
            var value = d[expressed];
            if (value){
                return colorScale(value); // Assign color based on data value
            } else {
                return "#ccc"; // Assign gray color if no data
            }
        })
        .on("mouseover", function(event, d){
            highlight(d); // Highlight on mouseover
        })
        .on("mouseout", function(event, d){
            dehighlight(d); // Remove highlight on mouseout
        })
        .on("mousemove", moveLabel); // Move label with mouse

    // Create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40) // Position x
        .attr("y", 40) // Position y
        .attr("class", "chartTitle") // Class name for styling
        .text("Number of Variable " + expressed + " in each region"); // Set chart title

    // Create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale); // Use the yScale

    // Place axis
    var axis = chart.append("g")
        .attr("class", "axis") // Class name for styling
        .attr("transform", translate) // Position the axis
        .call(yAxis); // Call the axis generator

    // Create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame") // Class name for styling
        .attr("width", chartInnerWidth) // Set width
        .attr("height", chartInnerHeight) // Set height
        .attr("transform", translate); // Position the frame
}

// Function to create dropdown menu for attribute selection
function createDropdown(csvData){
    // Add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown") // Class name for styling
        .on("change", function(){
            changeAttribute(this.value, csvData); // Function to execute on change
        });

    // Add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption") // Class name for styling
        .attr("disabled", true) // Disable the option
        .text("Select Attribute"); // Text for the option

    // Add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d; }) // Set the value
        .text(function(d){ return d; }); // Set the text
}

// Function to change expressed attribute and update visualizations
function changeAttribute(attribute, csvData){
    // Change the expressed attribute
    expressed = attribute;

    // Recreate the color scale
    var colorScale = makeColorScale(csvData);

    // Recolor regions
    var regions = d3.selectAll(".regions")
        .transition()
        .duration(1000) // Animation duration
        .style("fill", function(d){
            var value = d.properties[expressed];
            if (value){
                return colorScale(value); // Assign new color
            } else {
                return "#ccc"; // Assign gray color if no data
            }
        });

    // Update bars in the chart
    var bars = d3.selectAll(".bar")
        .sort(function(a, b){
            return b[expressed] - a[expressed]; // Sort bars based on new attribute
        })
        .transition()
        .duration(1000) // Animation duration
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + topBottomPadding; // Update position
        })
        .attr("height", function(d){
            return chartInnerHeight - yScale(parseFloat(d[expressed])); // Update height
        })
        .style("fill", function(d){
            var value = d[expressed];
            if (value){
                return colorScale(value); // Assign new color
            } else {
                return "#ccc"; // Assign gray color if no data
            }
        });

    // Update the chart title
    var chartTitle = d3.select(".chartTitle")
        .text("Number of Variable " + expressed + " in each region");
}

// Function to highlight regions and bars
function highlight(props){
    // Change stroke to highlight
    var selected = d3.selectAll("." + props.adm1_code)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    setLabel(props); // Show label on highlight
}

// Function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.adm1_code)
        .style("stroke", function(){
            return getStyle(this, "stroke"); // Retrieve original stroke
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width"); // Retrieve original stroke-width
        });

    // Remove label
    d3.select(".infolabel").remove();

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName]; // Return the style property
    }
}

// Function to create dynamic label
function setLabel(props){
    // Label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    // Create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel") // Class name for styling
        .attr("id", props.adm1_code + "_label") // Set unique ID
        .html(labelAttribute); // Add HTML content

    var regionName = infolabel.append("div")
        .attr("class", "labelname") // Class name for styling
        .html(props.name); // Add region name
}

// Function to move info label with mouse
function moveLabel(event){
    // Get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    // Use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10, // Horizontal label coordinate when to the right of mouse
        y1 = event.clientY - 75, // Vertical label coordinate above mouse
        x2 = event.clientX - labelWidth - 10, // Horizontal label coordinate when to the left of mouse
        y2 = event.clientY + 25; // Vertical label coordinate below mouse

    // Horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    // Vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1;

    // Set position of label
    d3.select(".infolabel")
        .style("left", x + "px") // Set horizontal position
        .style("top", y + "px"); // Set vertical position
}