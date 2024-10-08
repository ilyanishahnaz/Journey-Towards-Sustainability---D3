d3.csv("data/global-data-on-sustainable-energy-d3.csv", d3.autoType).then(function(data) {
    data = d3.sort(data, (a, b) => d3.descending(a.Primary_energy_consumption_per_capita, b.Primary_energy_consumption_per_capita));
    data = data.filter(function(d) {
        return d.Entity != "Guinea-Bissau" && 
        d.Entity != "Liberia" && 
        d.Entity != "South Sudan" && 
        d.Entity != "Montenegro"
    })
    data = newCols(data);
    console.log(data);

    var countrySelectState = false;
    var countrySelect = null;

    let year = parseInt(document.getElementById("yearSlider").value);
    d3.selectAll("#year").text(year)
    
    const el = document.getElementById("yearSlider");
    el.oninput = function() {
        year = parseInt(this.value);

        d3.selectAll("#year").text(year)

        updateMap(data, year);
        updateScatter(data, year);

        if (countrySelectState == false) { 
            updateDonutElec(data, year);
            updateDonutCons(data, year);  
        }
        else {
            updateDonutElec(data, year, countrySelect);
            updateDonutCons(data, year, countrySelect);
        }

        updateBarChart1(data, year);
        updateBarChart2(data, year);
    }

    function nullFilter(data) {
        return data.filter(function(d) {
            return d.Gdp_per_capita != null && 
            d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita != null &&
            d.Primary_energy_consumption_per_capita != null;
        })
    }

    function mapFilter(data){
        data = d3.sort(data, (a, b) => d3.descending(a.Population_density, b.Population_density));

        return data.filter(function(d) {
            return d.Clean_fuels_access != null &&
            d.Population_density != null &&
            d.Electricity_access != null;
        })
    }

    function lineFilter(data){
        return data.filter(function (d) {
            return d.Year != null &&
            d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita != null;
        })
    }

    function nullFilterDonutElec(data) {
        return data.filter(function(d) {
            return (!!d.Electricity_fossil_fuels) &&
            (!!d.Electricity_nuclear) &&
            (!!d.Electricity_renewables)
        });
    }

    function nullFilterDonutCons(data) {
        return data.filter(function(d) {
            return d.Percent_Non_renewable_energy_share_in_the_total_final_energy_consumption != null;
        });
    }

    function newCols(data) {
        data.forEach(function(d) {
            if (d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita != null &&
                d.Primary_energy_consumption_per_capita != null
            ) {
                d.Renewable_energy_share_in_primary_energy_consumption_per_capita = d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita/100 * d.Primary_energy_consumption_per_capita;
            }

            if (d.Percent_Renewable_energy_share_in_the_total_final_energy_consumption != null) {

                d.Percent_Non_renewable_energy_share_in_the_total_final_energy_consumption = 100 - d.Percent_Renewable_energy_share_in_the_total_final_energy_consumption;
            }

            if (d.Electricity_fossil_fuels != null &&
                d.Electricity_nuclear != null &&
                d.Electricity_renewables != null
            ) {
                d.Total_electricity = d.Electricity_fossil_fuels + d.Electricity_nuclear + d.Electricity_renewables;
                d.Percent_electricity_fossil_fuels = (d.Electricity_fossil_fuels / d.Total_electricity) * 100
                d.Percent_electricity_nuclear = (d.Electricity_nuclear / d.Total_electricity) * 100
                d.Percent_electricity_renewables = (d.Electricity_renewables / d.Total_electricity) * 100
            }
        })
        return data;
    }

    // Reset button
    
    d3.select("#resetButton").on("click", function() {
        countrySelectState = false;
        countrySelect = null;

        d3.selectAll("circle")
            .transition()
            .duration(500)
            .attr("opacity", 0.7);
   
        d3.select("#infoBox h3").text("Country Name");
        d3.select("#year").text(year);
        d3.select("#popDensity").text("");
        d3.select("#elecAccess").text("");
        d3.select("#fuelAccess").text("");

        updateDonutElec(data, year, null);
        updateDonutCons(data, year, null);
        updateLineChart(data, null);
    });

// #region Scatterplot

    const margin = {top: 30, right: 30, bottom: 30, left: 60};
    const height = 375 - margin.right - margin.left;
    const width = 520 - margin.top - margin.bottom;

    // tried to move the title a bit to the right but doesn't work
    // d3.select("#scatterTitle")
    //     .attr("transform", "translate(" + margin.left * 1.5 + ", 0)")

    var svgScatter = d3.select("#svgScatter")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + 10)
            .attr("transform", "translate(0," + margin.top + ")")
        .append("g")
            .attr("transform", "translate(" + margin.left * 1.5 + "," + margin.top + ")");

    var xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.Gdp_per_capita)-10000, d3.max(data, d => d.Gdp_per_capita)+10000])
        .range([0, width]);

    var yScale = d3.scaleSymlog()
        .constant(10)
        .domain([d3.min(data, d => d.Renewable_energy_share_in_primary_energy_consumption_per_capita)-10, d3.max(data, d => d.Renewable_energy_share_in_primary_energy_consumption_per_capita)+100000])
        .range([height, 0]);

    var rScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.Primary_energy_consumption_per_capita), d3.max(data, d => d.Primary_energy_consumption_per_capita)])
        .range([4, 25]);
    
    var xAxis = d3.axisBottom()
        .scale(xScale)
        .tickValues([0, 30000, 60000, 90000, 120000])
        .tickSizeOuter(0);

    var yAxis = d3.axisLeft()
        .scale(yScale)
        .tickValues([10, 100, 1000, 10000, 100000])
        .tickSizeOuter(0);
    
    var colorScale = d3.scaleOrdinal()
        .range(["#fee087","#fec965","#feab4b","#fd893c","#fa5c2e","#ec3023","#d31121","#af0225"]);

    var tooltip = d3.select("#svgScatter")
        .append("div")
            .attr("class", "tooltip")
            .attr("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "5px");

    function updateScatter(data, year) {
        var filteredData = data.filter(d => d.Year === year);
        filteredData = nullFilter(filteredData);

        var dots = svgScatter.selectAll(".my-circle")
            .data(filteredData, d => d.Entity);

        dots.enter()
            .append("circle")
                .attr("class", "my-circle")
                .attr("cx", d => xScale(d.Gdp_per_capita) )
                .attr("cy", d => yScale(d.Renewable_energy_share_in_primary_energy_consumption_per_capita) )
                .attr("r", 0)
                .style("fill", d => colorScale(d.Entity))
                .attr("opacity", 0.7)
            .merge(dots)
                .on("mouseover", function(e, d) {
                    d3.select(this)
                        .style("stroke", "black");
                    tooltip
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                    tooltip
                        .html(`Country: ${d.Entity}
                            <br>GDP per capita: $${Math.round(d.Gdp_per_capita)}
                            <br>Primary energy consumption per capita: ${Math.round(d.Primary_energy_consumption_per_capita)} kWh/person
                            <br>Renewable energy share: ${Math.round(d.Renewable_energy_share_in_primary_energy_consumption_per_capita)} kWh/person`)
                        .style("left", e.pageX+30 + "px")
                        .style("top", e.pageY-30 + "px");
                })
                .on("mouseout", function(e, d) {
                    d3.select(this)
                        .style("stroke", "none");
                    tooltip
                        .transition()
                        .duration(200)
                        .style("opacity", 0);
                })
                .on("click", function(e, d) {
                    d3.select("#infoBox h3").text(d.Entity);
                    d3.select("#year").text(d.Year);
                    d3.select("#popDensity").text(d.Population_density);
                    d3.select("#elecAccess").text(d.Electricity_access.toFixed(2));
                    d3.select("#fuelAccess").text(d.Clean_fuels_access.toFixed(2));

                    d3.selectAll("circle")
                        .transition()
                        .duration(500)
                        .attr("opacity", 0.2)

                    d3.selectAll("circle")
                        .filter(function(e) { return e.Entity === d.Entity})
                        .transition()
                        .duration(500)
                        .attr("opacity", 0.9)

                    countrySelectState = true
                    countrySelect = d.Entity

                    updateDonutElec(data, year, d.Entity)
                    updateDonutCons(data, year, d.Entity)
                    updateLineChart(data, d.Entity)
                })
                .transition()
                .duration(1000)
                .attr("cx", d => xScale(d.Gdp_per_capita) )
                .attr("cy", d => yScale(d.Renewable_energy_share_in_primary_energy_consumption_per_capita) )
                .attr("r", d => rScale(d.Primary_energy_consumption_per_capita) )
                .style("fill", d => colorScale(d.Entity))
                .style("fill-opacity", 0.9);

        dots.exit()
            .transition()
            .duration(1000)
            .remove();
    }

    svgScatter.append("g")
        .attr("transform", "translate(0, " + height + ")")
        .call(xAxis);
    
    svgScatter.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", width/2 + 20)
        .attr("y", height + 35)
        .text("GDP per capita");
    
    svgScatter.append("g")
        .call(yAxis);
    
    svgScatter.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", -margin.left)
        .attr("x", -margin.top-margin.bottom)
        .attr("transform", "rotate(-90)")
        .text("Renewable energy share per capita");

// #endregion

// #region Donut Charts

    const widthPie = 500;
    const heightPie = 210;
    const radiusPie = Math.min(widthPie, heightPie-60) / 2;

    var arc = d3.arc()
        .innerRadius(radiusPie - 30)
        .outerRadius(radiusPie - 10);

    var pie = d3.pie()
        .value(d => d.Percentage)
        .startAngle(1.1*Math.PI)
        .endAngle(3.1*Math.PI)
        .sort(null);

    const average = arr => arr.reduce((a, b) => a + b) / arr.length;

    var svgDonutElec = d3.select("#svgDonutElec")
        .append("svg")
            .attr("width", widthPie)
            .attr("height", heightPie)
        .append("g")
            .attr("transform", "translate(" + (widthPie / 2) + "," + (heightPie / 2 - 20) + ")");

    var svgDonutCons = d3.select("#svgDonutCons")
        .append("svg")
            .attr("width", widthPie)
            .attr("height", heightPie)
        .append("g")
            .attr("transform", "translate(" + (widthPie / 2) + "," + (heightPie / 2 - 20) + ")");

    var colorScaleDonut = d3.scaleOrdinal()
        .range(["#1f77b4","#d62728","#ff7f0e"]);

    function updateDonutElec(data, year, entity) {
        var filteredData = data.filter(d => d.Year === year);
        if (entity != null) { filteredData = filteredData.filter(d => d.Entity === entity); }
        filteredData = nullFilterDonutElec(filteredData);

        var arr = [];

        try {
            var elec_fossil_fuels = {"Name": "Fossil Fuels"};
            elec_fossil_fuels.Percentage = Math.round(
                average((filteredData).map(({ Percent_electricity_fossil_fuels }) => Percent_electricity_fossil_fuels)) * 10) / 10;
        
            var elec_nuclear = {"Name": "Nuclear"};
            elec_nuclear.Percentage = Math.round(
                average((filteredData).map(({ Percent_electricity_nuclear }) => Percent_electricity_nuclear)) * 10) / 10;
        
            var elec_renewables = {"Name": "Renewables"};
            elec_renewables.Percentage = Math.round(
                average((filteredData).map(({ Percent_electricity_renewables }) => Percent_electricity_renewables)) * 10) / 10;
            
            arr.push(elec_fossil_fuels);
            arr.push(elec_nuclear);
            arr.push(elec_renewables);
        }
        catch {
            console.log("Donut data contains null values")
        }

        var arc = d3.arc()
            .innerRadius(radiusPie - 30)
            .outerRadius(radiusPie - 10);
    
        var pie = d3.pie()
            .value(d => d.Percentage)
            .startAngle(1.1*Math.PI)
            .endAngle(3.1*Math.PI)
            .sort(null);

        var path = svgDonutElec.selectAll(".my-path")
            .data(pie(arr), d => d.data.Name);
    
        path.each(function(d) {
            this._current = this._current || d;
            });
    
        path.transition()
            .duration(1000)
            .attrTween("d", function(d) {
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    return arc(interpolate(t));
                };
            });
    
        path.enter()
            .append("path")
                .attr("class", "my-path")
                .attr("fill", d => colorScaleDonut(d.data.Name))
                .each(function(d) { this._current = d; })
                .attr("d", arc)
                .transition()
                .duration(750)
                .attrTween("d", function(d) {
                    var interpolate = d3.interpolate({startAngle: 1.1 * Math.PI, endAngle: 1.1 * Math.PI}, d);
                    return function(t) {
                        return arc(interpolate(t));
                    };
                });
    
        path.exit()
            .remove();

        var text = svgDonutElec.selectAll(".my-text")
            .data(pie(arr), d => d.data.Name);
    
        text.enter()
            .append("text")
                .attr("class", "my-text")
                .attr("transform", function(d) {
                    var c = arc.centroid(d);
                    return "translate(" + c[0]*1.5 +"," + c[1]*1.5 + ")";
                })
                .attr("dy", "0.35em")
                .style("text-anchor", "middle")
                .text(d => d.data.Percentage + "%");

        text.transition()
            .duration(1000)
            .attr("transform", function(d) {
                var c = arc.centroid(d);
                return `translate( ${c[0]*1.5}, ${c[1]*1.5 })`;
            })
            .attr("dy", "0.35em")
            .style("text-anchor", "middle")
            .text(d => d.data.Percentage + "%");

        text.exit()
            .remove()
            
        var legend = svgDonutElec.selectAll(".legend")
            .data(arr, d => d.Name);
    
        var legendEnter = legend.enter()
            .append("g")
                .attr("class", "legend")
                .attr("transform", (d, i) => `translate(${10}, ${i * 20})`);
    
        legendEnter.append("rect")
            .attr("x", radiusPie + 30)
            .attr("y", -radiusPie + 10)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", d => colorScaleDonut(d.Name));
    
        legendEnter.append("text")
            .attr("x", radiusPie + 50)
            .attr("y", -radiusPie + 17)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(d => d.Name);
    }

    function updateDonutCons(data, year, entity) {
        var filteredData = data.filter(d => d.Year === year);
        if (entity != null) { filteredData = filteredData.filter(d => d.Entity === entity); }
        filteredData = nullFilterDonutCons(filteredData);

        var arr = [];

        try {
            var percent_renew = {"Name": "Renewable"};
            percent_renew.Percentage = Math.round(
                average((filteredData).map(({ Percent_Renewable_energy_share_in_the_total_final_energy_consumption }) => Percent_Renewable_energy_share_in_the_total_final_energy_consumption)) * 10) / 10;
            
            var percent_nonrenew = {"Name": "Non-Renewable"};
            percent_nonrenew.Percentage = Math.round(
                average((filteredData).map(({ Percent_Non_renewable_energy_share_in_the_total_final_energy_consumption }) => Percent_Non_renewable_energy_share_in_the_total_final_energy_consumption)) * 10) / 10;
    
            arr.push(percent_renew);
            arr.push(percent_nonrenew);
        }
        catch {
            console.log("Donut data contains null values 2")
        }

        var path = svgDonutCons.selectAll(".my-path")
            .data(pie(arr), d => d.data.Name);
    
        path.each(function(d) {
            this._current = this._current || d;
            });
    
        path.transition()
            .duration(1000)
            .attrTween("d", function(d) {
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    return arc(interpolate(t));
                };
            });
    
        path.enter()
            .append("path")
                .attr("class", "my-path")
                .attr("fill", d => colorScaleDonut(d.data.Name))
                .each(function(d) { this._current = d; })
                .attr("d", arc)
                .transition()
                .duration(750)
                .attrTween("d", function(d) {
                    var interpolate = d3.interpolate({startAngle: 1.1 * Math.PI, endAngle: 1.1 * Math.PI}, d);
                    return function(t) {
                        return arc(interpolate(t));
                    };
                });
    
        path.exit()
            .remove();

        var text = svgDonutCons.selectAll(".my-text")
            .data(pie(arr), d => d.data.Name);
    
        text.enter()
            .append("text")
                .attr("class", "my-text")
                .attr("transform", function(d) {
                    var c = arc.centroid(d);
                    return "translate(" + c[0]*1.5 +"," + c[1]*1.5 + ")";
                })
                .attr("dy", "0.35em")
                .style("text-anchor", "middle")
                .text(d => d.data.Percentage + "%");

        text.transition()
            .duration(1000)
            .attr("transform", function(d) {
                var c = arc.centroid(d);
                return `translate( ${c[0]*1.5}, ${c[1]*1.5 })`;
            })
            .attr("dy", "0.35em")
            .style("text-anchor", "middle")
            .text(d => d.data.Percentage + "%");

        text.exit()
            .remove()
            
        var legend = svgDonutCons.selectAll(".legend")
            .data(arr, d => d.Name);
    
        var legendEnter = legend.enter()
            .append("g")
                .attr("class", "legend")
                .attr("transform", (d, i) => `translate(${10}, ${i * 20})`);
    
        legendEnter.append("rect")
            .attr("x", radiusPie + 30)
            .attr("y", -radiusPie + 10)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", d => colorScaleDonut(d.Name));
    
        legendEnter.append("text")
            .attr("x", radiusPie + 50)
            .attr("y", -radiusPie + 17)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(d => d.Name);
    }
    
// #endregion

// #region Map

    const widthMap = 920;
    const heightMap = 480;
    
    const svgMap = d3.select("#map").append("svg")
        .attr("width", widthMap)
        .attr("height", heightMap);
    
    const projection = d3.geoMercator()
        .scale(150)
        .translate([widthMap / 2, heightMap / 1.5]);
    
    const path = d3.geoPath().projection(projection);
    
    const colorScaleMap = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain([0, 100]);
    
    const tooltipMap = d3.select("body")
        .append("div")
            .attr("class", "tooltip")
            .attr("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "5px");
    
    d3.json("https://d3js.org/world-110m.v1.json").then(function(world) {
        const countries = topojson.feature(world, world.objects.countries).features;
 
        svgMap.append("g")
            .selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", "#ccc")
            .attr("stroke", "#333");
    
        updateMap(data, year);
    });

    d3.select("#colorMetric").on("change", function() {
        updateMap(data, year);
        updateTitle();
    });
    
    function updateTitle() {
        const colorMetric = d3.select("#colorMetric").property("value");
        d3.select("#mapTitle")
            .text(colorMetric === "Clean_fuels_access" ? "Countries with Access to Clean Fuels" : "Countries with Access to Electricity");
    }
    
    function updateMap(data, year) {
        const colorMetric = d3.select("#colorMetric").property("value");
        year = parseInt(document.getElementById("yearSlider").value);
        var filteredData = data.filter(d => d.Year === year);
        filteredData = mapFilter(filteredData);
    
        const rScaleMap = d3.scaleSqrt()
            .domain([0, d3.max(filteredData, d => d.Population_density)])
            .range([2, 20]);
    
        var circles = svgMap.selectAll("circle")
            .data(filteredData, d => d.Entity);
    
        circles.enter()
            .append("circle")
            .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
            .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
            .attr("r", 0)
            .attr("fill", d => colorScaleMap(d[colorMetric]))
            .attr("opacity", 0.7)
            .merge(circles)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("stroke", "black");
                tooltipMap
                    .transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltipMap
                    .html(`Country: ${d.Entity}<br>
                              Year: ${d.Year}<br>
                              Access to clean fuels: ${d.Clean_fuels_access.toFixed(2)}%<br>
                              Access to electricity: ${d.Electricity_access.toFixed(2)}%<br>
                              Population density: ${d.Population_density}`)
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                d3.select(this)
                    .style('stroke','none');
                tooltipMap
                    .transition()
                    .duration(500)
                    .style("opacity", 0)
                    .style("stroke", "black");
            })
            .on("click", function(event, d) {
                d3.select("#infoBox h3").text(d.Entity);
                d3.select("#year").text(d.Year);
                d3.select("#popDensity").text(d.Population_density);
                d3.select("#elecAccess").text(d.Electricity_access.toFixed(2));
                d3.select("#fuelAccess").text(d.Clean_fuels_access.toFixed(2));
                
                d3.selectAll("circle")
                    .transition()
                    .duration(500)
                    .attr("opacity", 0.2)

                d3.selectAll("circle")
                    .filter(function(e) { return e.Entity === d.Entity})
                    .transition()
                    .duration(500)
                    .attr("opacity", 0.9)

                countrySelectState = true
                countrySelect = d.Entity

                updateDonutElec(data, year, d.Entity)
                updateDonutCons(data, year, d.Entity)
                updateLineChart(data, d.Entity)

            })
            .transition().duration(1000)
            .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
            .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
            .attr("r", d => rScaleMap(d.Population_density))
            .style("fill", d => colorScaleMap(d[colorMetric]))
            .style("fill-opacity", 0.9);
    
        circles.exit()
               .transition()
               .duration(1000)
               .attr("r", 0)
               .remove();
    }
    
// map legend
const legendWidth = 170;
const legendHeight = 20;

const legendSvg = svgMap.append("g")
    .attr("transform", `translate(20, ${heightMap - legendHeight - 35})`);

// define gradient
const defs = legendSvg.append("defs");

const linearGradient = defs.append("linearGradient")
    .attr("id", "linear-gradient");

linearGradient.selectAll("stop")
    .data([
        { offset: "0%", color: d3.interpolateRdYlGn(0) },
        { offset: "50%", color: d3.interpolateRdYlGn(0.5) },
        { offset: "100%", color: d3.interpolateRdYlGn(1) }
    ])
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);


legendSvg.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#linear-gradient)");

//def scale
const legendScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, legendWidth]);


const legendAxis = d3.axisBottom(legendScale)
    .ticks(5);


legendSvg.append("g")
    .attr("class", "legend axis")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);


legendSvg.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", legendHeight + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Access (%)");

// #endregion

// #region Bar Charts

const marginBar = { top: 0, right: 30, bottom: 0, left: 100 };
const widthBar = 520 - marginBar.left - marginBar.right;
const heightBar = 140 - marginBar.top - marginBar.bottom;

const xScaleBarRenCon = d3.scaleLinear().range([0, widthBar]);
const yScaleBarRenCon = d3.scaleBand().range([heightBar, 0]).padding(0.1);

const xScaleBarGreenTech = d3.scaleLinear().range([0, widthBar]);
const yScaleBarGreenTech = d3.scaleBand().range([heightBar, 0]).padding(0.1);

const barRenCon = d3.select("#svgBarRenCon")
    .append("svg")
        .attr("width", widthBar + marginBar.left + marginBar.right)
        .attr("height", heightBar + marginBar.top + marginBar.bottom)
    .append("g")
        .attr("transform", `translate(${marginBar.left},${marginBar.top})`);

const barGreenTech = d3.select("#svgGreenTech")
    .append("svg")
        .attr("width", widthBar + marginBar.left + marginBar.right)
        .attr("height", heightBar + marginBar.top + marginBar.bottom)
    .append("g")
        .attr("transform", `translate(${marginBar.left},${marginBar.top})`);

const xAxis1 = d3.axisBottom(xScaleBarRenCon);
const yAxis1 = d3.axisLeft(yScaleBarRenCon);

const xAxis2 = d3.axisBottom(xScaleBarGreenTech);
const yAxis2 = d3.axisLeft(yScaleBarGreenTech);

barRenCon.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`);

barRenCon.append("g")
    .attr("class", "y axis");

barGreenTech.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`);

barGreenTech.append("g")
    .attr("class", "y axis");

function updateBarChart1(data, year) {

    var filteredData = data.filter(d => d.Year === year);
    filteredData = d3.flatRollup(filteredData, v => d3.sum(v, d => Math.round(d.Renewable_energy_share_in_primary_energy_consumption_per_capita)), e => e.Entity)
    filteredData = filteredData.map(([Entity, Renewable_energy_share_in_primary_energy_consumption_per_capita, values]) => ({Entity, Renewable_energy_share_in_primary_energy_consumption_per_capita, ...values}))
    
    filteredData = d3.sort(filteredData, (a, b) => d3.descending(a.Renewable_energy_share_in_primary_energy_consumption_per_capita, b.Renewable_energy_share_in_primary_energy_consumption_per_capita));
    filteredData = filteredData.slice(0, 5)
    filteredData = d3.sort(filteredData, (a, b) => d3.ascending(a.Renewable_energy_share_in_primary_energy_consumption_per_capita, b.Renewable_energy_share_in_primary_energy_consumption_per_capita));

    xScaleBarRenCon.domain([0, d3.max(filteredData, d => d.Renewable_energy_share_in_primary_energy_consumption_per_capita)]);
    yScaleBarRenCon.domain(filteredData.map(d => d.Entity));

    var bars = barRenCon.selectAll(".bar")
        .data(filteredData, d => d.Entity);

    bars
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => yScaleBarRenCon(d.Entity))
            .attr("height", yScaleBarRenCon.bandwidth())
            .attr("width", d => 0)
            .attr("opacity", 0.8)
            .style("fill", "#ff7f0e")
        .merge(bars)
            .transition()
            .duration(750)
            .attr("y", d => yScaleBarRenCon(d.Entity))
            .attr("width", d => xScaleBarRenCon(d.Renewable_energy_share_in_primary_energy_consumption_per_capita));
    
    bars.exit().remove();

    barRenCon.selectAll(".bar-text").remove();
    
    barRenCon.selectAll(".bar-text")
        .data(filteredData, d => d.Entity)
        .enter()
        .append("text")
        .attr("class", "bar-text")
        .attr("y", d => yScaleBarRenCon(d.Entity) + yScaleBarRenCon.bandwidth() / 2) // Vertically centered in each bar
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(d => `${d.Renewable_energy_share_in_primary_energy_consumption_per_capita.toLocaleString()}`) // Format with commas
        .attr("x", function(d) {
            var textWidth = this.getComputedTextLength();
            return textWidth + 5 > xScaleBarRenCon(d.Renewable_energy_share_in_primary_energy_consumption_per_capita) ?
            xScaleBarRenCon(d.Renewable_energy_share_in_primary_energy_consumption_per_capita) + textWidth + 5 :
            xScaleBarRenCon(d.Renewable_energy_share_in_primary_energy_consumption_per_capita) - 5
            
        })

    barRenCon.select(".x.axis")
        .transition()
        .duration(750)
        .call(xAxis1);

    barRenCon.select(".y.axis")
        .transition()
        .duration(750)
        .call(yAxis1);

    barRenCon.selectAll("path, line").remove()
}


function updateBarChart2(data, year) {

    var filteredData = data.filter(d => d.Year === year);
    filteredData = d3.flatRollup(filteredData, v => d3.sum(v, d => Math.round(d.Financial_flows_to_developing_countries)), e => e.Entity);
    filteredData = filteredData.map(([Entity, Financial_flows_to_developing_countries, values]) => ({Entity, Financial_flows_to_developing_countries, ...values}));

    filteredData = d3.sort(filteredData, (a, b) => d3.descending(a.Financial_flows_to_developing_countries, b.Financial_flows_to_developing_countries));
    filteredData = filteredData.slice(0, 5);
    filteredData = d3.sort(filteredData, (a, b) => d3.ascending(a.Financial_flows_to_developing_countries, b.Financial_flows_to_developing_countries));

    xScaleBarGreenTech.domain([0, d3.max(filteredData, d => d.Financial_flows_to_developing_countries)]);
    yScaleBarGreenTech.domain(filteredData.map(d => d.Entity));

    var bars = barGreenTech.selectAll(".bar")
        .data(filteredData, d => d.Entity);

    bars.exit().remove();

    bars
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => yScaleBarGreenTech(d.Entity))
            .attr("height", yScaleBarGreenTech.bandwidth())
            .attr("width", 0) 
            .attr("opacity", 0.8)
            .style("fill", "#ff7f0e")
        .merge(bars)
            .transition()
            .duration(750)
            .attr("width", d => xScaleBarGreenTech(d.Financial_flows_to_developing_countries))
            .attr("y", d => yScaleBarGreenTech(d.Entity));

    barGreenTech.selectAll(".bar-text").remove();

    barGreenTech.selectAll(".bar-text")
        .data(filteredData, d => d.Entity)
        .enter()
        .append("text")
        .attr("class", "bar-text")
        .attr("y", d => yScaleBarGreenTech(d.Entity) + yScaleBarGreenTech.bandwidth() / 2)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(d => `${((Math.round(d.Financial_flows_to_developing_countries/1000000))).toLocaleString()}M`)
        .attr("x", function(d) {
            var textWidth = this.getComputedTextLength();
            return textWidth + 5 > xScaleBarGreenTech(d.Financial_flows_to_developing_countries) ?
            xScaleBarGreenTech(d.Financial_flows_to_developing_countries) + textWidth + 5 :
            xScaleBarGreenTech(d.Financial_flows_to_developing_countries) - 5
            
        })

    barGreenTech.select(".x.axis")
        .transition()
        .duration(750)
        .call(xAxis2);

    barGreenTech.select(".y.axis")
        .transition()
        .duration(750)
        .call(yAxis2);

    barGreenTech.selectAll("path, line").remove()
}

// #endregion

// removing axis lines
 d3.selectAll("path, line").remove();

// #region Line Graph

function aggregateByYear(data, entity=null) {
    const yearData = {};

    data.forEach(d => {
        if (d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita != null) {
            if (entity === null || d.Entity === entity) {
                if (!yearData[d.Year]) {
                    yearData[d.Year] = [];
                }
                yearData[d.Year].push(d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita);
            }
        }
    });

    const aggregatedData = [];
    for (const year in yearData) {
        const average = yearData[year].reduce((a, b) => a + b) / yearData[year].length;
        aggregatedData.push({ Year: +year, AverageRenewableEnergyShare: average });
    }

    return aggregatedData;
}

// Line chart
const marginLine = { top: 30, right: 30, bottom: 30, left: 60 };
const widthLine = 940 - marginLine.left - marginLine.right;
const heightLine = 375 - marginLine.top - marginLine.bottom;

const svgLine = d3.select("#lineChart")
    .append("svg")
        .attr("width", widthLine + marginLine.left + marginLine.right)
        .attr("height", heightLine + marginLine.top + marginLine.bottom + 10) 
    .append("g")
        .attr("transform", "translate(" + marginLine.left + "," + marginLine.top + ")");


const xScaleLine = d3.scaleLinear()
    .range([0, widthLine]);

const yScaleLine = d3.scaleLinear()
    .range([heightLine, 0]);

const xAxisLine = d3.axisBottom(xScaleLine)
    .tickFormat(d3.format("d"))
    .tickSize(0)
    .tickPadding(10);  

const yAxisLine = d3.axisLeft(yScaleLine)
    .tickSize(0)
    .tickPadding(10);  

svgLine.append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + heightLine + ")")
    .call(xAxisLine);

svgLine.append("g")
    .attr("class", "y-axis")
    .call(yAxisLine);

const line = d3.line()
    .x(d => xScaleLine(d.Year))
    .y(d => yScaleLine(d.AverageRenewableEnergyShare));

const tooltipLine = d3.select("#lineChart")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "5px");

function updateLineChart(data, entity=null) {

    let filteredData = lineFilter(data);

    const aggregatedData = aggregateByYear(filteredData, entity);

    xScaleLine.domain(d3.extent(aggregatedData, d => d.Year));
    yScaleLine.domain([d3.min(aggregatedData, d => d.AverageRenewableEnergyShare)-1, d3.max(aggregatedData, d => d.AverageRenewableEnergyShare)+1]);

    svgLine.select(".x-axis")
        .transition()
        .duration(1000)
        .call(xAxisLine);

    svgLine.select(".y-axis")
        .transition()
        .duration(1000)
        .call(yAxisLine);

        svgLine.selectAll("path, line").remove()

    const linePath = svgLine.selectAll(".line-path")
        .data([aggregatedData]);

    linePath.enter()
        .append("path")
        .attr("class", "line-path")
        .merge(linePath)
        .transition()
        .duration(1000)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2);

    svgLine.selectAll(".line-path")
        .on("mouseover", function() {
            tooltipLine.style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
            const mouseX = d3.pointer(event)[0];
            const mouseY = d3.pointer(event)[1];

            const year = Math.round(xScaleLine.invert(mouseX));

            const closestData = aggregatedData.reduce((closest, current) => {
                return Math.abs(current.Year - year) < Math.abs(closest.Year - year) ? current : closest;
            });

            tooltipLine.html(`<strong>Year:</strong> ${closestData.Year}<br><strong>Average Renewable Energy Share:</strong> ${closestData.AverageRenewableEnergyShare.toFixed(2)}%`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltipLine
                .transition()
                .duration(1000)
                .style("opacity", 0);
        });

    linePath.exit().remove();
}


svgLine.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "middle")
    .attr("x", widthLine / 2)
    .attr("y", heightLine + 35)
    .text("Year");

svgLine.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("x", -heightLine / 2 + 70)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .text("Average Renewable Energy Share (%)");

// #endregion

updateScatter(data, year);
updateDonutElec(data, year);
updateDonutCons(data, year);
updateLineChart(data);
updateBarChart1(data, year);
updateBarChart2(data, year);

});


