d3.csv("data/global-data-on-sustainable-energy-d3.csv", d3.autoType).then(function(data) {
    data = d3.sort(data, (a, b) => d3.descending(a.Primary_energy_consumption_per_capita, b.Primary_energy_consumption_per_capita));
    data = newCols(data);
    console.log(data);

    let year = parseInt(document.getElementById("yearSlider").value);
    
    const el = document.getElementById("yearSlider");
    el.oninput = function() {
        year = parseInt(this.value);
        updateScatter(data, year);
        updateDonutElec(data, year);
        updateDonutCons(data, year);
        updateMap(data, year);
    }

    function nullFilter(data) {
        return data.filter(function(d) {
            return d.Gdp_per_capita != null && 
            d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita != null &&
            d.Primary_energy_consumption_per_capita != null;
        })
    }

    function mapFilter(data){
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

// #region Scatterplot

    const margin = {top: 10, right: 30, bottom: 30, left: 60};
    const height = 425 - margin.right - margin.left;
    const width = 425 - margin.top - margin.bottom;

    var svgScatter = d3.select("#svgScatter")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + 30)
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

    var colorScaleDonut = d3.scaleOrdinal()
        .range(["#1f77b4","#d62728","#ff7f0e"]);

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

                    updateDonutElec(data, year, d.Entity)
                    updateDonutCons(data, year, d.Entity)
                })
                .transition()
                .duration(1000)
                .attr("cx", d => xScale(d.Gdp_per_capita) )
                .attr("cy", d => yScale(d.Renewable_energy_share_in_primary_energy_consumption_per_capita) )
                .attr("r", d => rScale(d.Primary_energy_consumption_per_capita) )
                .style("fill", d => colorScale(d.Entity))
                .style("fill-opacity", 0.7);

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
    const heightPie = 200;
    const radiusPie = Math.min(widthPie, heightPie-50) / 2;

    const average = arr => arr.reduce((a, b) => a + b) / arr.length;

    var svgDonutElec = d3.select("#svgDonutElec")
        .append("svg")
            .attr("width", widthPie)
            .attr("height", heightPie)
            .attr("transform", "translate(0," + margin.top + ")")
        .append("g")
            .attr("transform", "translate(" + (widthPie / 2) + "," + (heightPie / 2 - 10) + ")");

    var svgDonutCons = d3.select("#svgDonutCons")
        .append("svg")
            .attr("width", widthPie)
            .attr("height", heightPie)
            .attr("transform", "translate(0," + margin.top + ")")
        .append("g")
            .attr("transform", "translate(" + (widthPie / 2) + "," + (heightPie / 2) + ")");

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
            console.log("Null")
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

        console.log(filteredData);

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
            console.log("Null values detected")
        }

        // console.log(arr);

        var arc = d3.arc()
            .innerRadius(radiusPie - 30)
            .outerRadius(radiusPie - 10);
    
        var pie = d3.pie()
            .value(d => d.Percentage)
            .startAngle(1.1*Math.PI)
            .endAngle(3.1*Math.PI)
            .sort(null);

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

    const widthMap = 960;
    const heightMap = 425;
    
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
    
        // IDK WHY ITS NOT APPENDING THE COUNTRY NAMESSSSSSSSSSS AHHHHHGHHHH
        // svgMap.append("g")
        //     .selectAll("text")
        //     .data(countries)
        //     .enter().append("text")
        //     .attr("x", d => projection(d3.geoCentroid(d))[0])
        //     .attr("y", d => projection(d3.geoCentroid(d))[1])
        //     .attr("dy", ".35em")
        //     .attr("text-anchor", "middle")
        //     .style("font-size", "10px")
        //     .style("fill", "#000")
        //     .text(d => d.properties.name);
    
        updateMap(data, year);
    });
    
    function updateMap(data, year) {
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
            .attr("fill", d => colorScaleMap(d.Clean_fuels_access))
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

                updateDonutElec(data, year, d.Entity)
                updateDonutCons(data, year, d.Entity)
            })
            .transition().duration(1000)
            .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
            .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
            .attr("r", d => rScaleMap(d.Population_density))
            .style("fill", d => colorScaleMap(d.Clean_fuels_access))
            .style("fill-opacity", 0.9);
    
        circles.exit()
               .transition()
               .duration(1000)
               .attr("r", 0)
               .remove();
    }
    
    // #endregion
    
    d3.selectAll("path, line").remove();

// #region Line Graph

function aggregateByYear(data) {
    const yearData = {};
    data.forEach(d => {
        if (d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita != null) {
            if (!yearData[d.Year]) {
                yearData[d.Year] = [];
            }
            yearData[d.Year].push(d.Percent_Renewable_energy_share_in_primary_energy_consumption_per_capita);
        }
    });

    const aggregatedData = [];
    for (const year in yearData) {
        const average = yearData[year].reduce((a, b) => a + b) / yearData[year].length;
        aggregatedData.push({ Year: +year, AverageRenewableEnergyShare: average });
    }

    return aggregatedData;
}

// Create SVG for line chart
const marginLine = { top: 10, right: 30, bottom: 30, left: 60 };
const widthLine = 500 - marginLine.left - marginLine.right;
const heightLine = 325 - marginLine.top - marginLine.bottom;

const svgLine = d3.select("#lineChart")
    .append("svg")
        .attr("width", widthLine + marginLine.left + marginLine.right)
        .attr("height", heightLine + marginLine.top + marginLine.bottom)
    .append("g")
        .attr("transform", "translate(" + marginLine.left + "," + marginLine.top + ")");

// Create scales for the line chart
const xScaleLine = d3.scaleLinear()
    .range([0, widthLine]);

const yScaleLine = d3.scaleLinear()
    .range([heightLine, 0]);

// Create axes for the line chart
const xAxisLine = d3.axisBottom(xScaleLine)
    .tickFormat(d3.format("d"))
    .tickSize(0)
    .tickPadding(10);  // Format ticks as integer

const yAxisLine = d3.axisLeft(yScaleLine)
    .tickSize(0)
    .tickPadding(10)  // Remove ticks
    .tickValues([8, 10, 12, 14, 16]);

// Append axes to the line chart
svgLine.append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + heightLine + ")")
    .call(xAxisLine);

svgLine.append("g")
    .attr("class", "y-axis")
    .call(yAxisLine);

// Line generator
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
;

// Function to update the line chart
function updateLineChart(data, entity) {
    const aggregatedData = aggregateByYear(data);

    // Update the scales
    xScaleLine.domain(d3.extent(aggregatedData, d => d.Year));
    yScaleLine.domain([8, d3.max(aggregatedData, d => d.AverageRenewableEnergyShare)]);

    // Update the axes
    svgLine.select(".x-axis")
        .transition()
        .duration(1000)
        .call(xAxisLine);

    svgLine.select(".y-axis")
        .transition()
        .duration(1000)
        .call(yAxisLine);

    // Bind data to the line
    const linePath = svgLine.selectAll(".line-path")
        .data([aggregatedData]);

    // Update the line path
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

            // Use xScale.invert to find the corresponding year from mouseX
            const year = Math.round(xScaleLine.invert(mouseX));

            // Find the closest data point to the mouse position
            const closestData = aggregatedData.reduce((closest, current) => {
                return Math.abs(current.Year - year) < Math.abs(closest.Year - year) ? current : closest;
            });

            // Update tooltip position and content
            tooltipLine.html(`<strong>Year:</strong> ${closestData.Year}<br><strong>Average Renewable Energy Share:</strong> ${closestData.AverageRenewableEnergyShare.toFixed(2)}%`)
                .style("left", (event.pageX + 30) + "px")
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

// Add titles to the axes
svgLine.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", widthLine / 2 + 40)
    .attr("y", heightLine + 40)
    .text("Year");

svgLine.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("x", -heightLine / 2 + 70)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .text("Average Renewable Energy Share (%)");

// // Update all charts on slider input
// el.oninput = function() {
//     year = parseInt(this.value);
//     updateScatter(data, year);
//     updateDonutElec(data, year);
//     updateDonutCons(data, year);
//     updateMap(data, year);
//     updateLineChart(data);  // Add this line to update the line chart
// }

// #endregion

updateScatter(data, year);
updateDonutElec(data, year);
updateDonutCons(data, year);
updateLineChart(data);

});   

