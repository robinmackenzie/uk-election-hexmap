var config = {}

// jquery events
$(main);
$(".region-toggles > div > input").change(function(evt) {
  config["selectedRegions"] = [];
  $(".region-toggles input").each(function(ix, el) {
    if ($(el).prop("checked")) {
      config["selectedRegions"].push($(el).data("region"));
    } 
  });
  renderMap();
});

// main
async function main() {

  config["hexjson"] = await d3.json("./constituencies.hex.json");
  config["data2015"] = await d3.json("./uk_ge_2015_v2.json");
  config["data2017"] = await d3.json("./uk_ge_2017_v2.json");
  config["selectedRegions"] = ["EA", "EM", "LO", "NE", "NW", "SE", "SW", "WM", "YH", "NI", "SC", "WA"];
  const allPartyColours = config["data2017"]
    .map(k => { return {
      "party": k["Summary"]["WinningParty2"], 
      "partyDescription": k["Summary"]["WinningParty3"], 
      "colour": k["Summary"]["PartyColour"]
    }})
  config["allPartyColours"] = [...new Set(allPartyColours.map(o => JSON.stringify(o)))].map(s => JSON.parse(s));
  config["partyColours"] = d3.scaleOrdinal()
    .domain(config["allPartyColours"].map(k => k["party"]))
    .range(config["allPartyColours"].map(k => k["colour"]));
  // Object.keys(config["hexjson"]["hexes"]).map(k => config["hexjson"]["hexes"]["2017"][k] = confgig["2017"][k]);
  // Object.keys(config["hexjson"]["hexes"]).map(k => config["hexjson"]["hexes"]["2015"][k] = confgig["2015"][k]);
  Object.keys(config["hexjson"]["hexes"]).forEach((k, i) => config["hexjson"]["hexes"][k]["key"] = k);
  renderMap();
}

function renderMap() {


  // Set the size and margins of the svg
	var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = 500 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

  // remove the existing viz
  d3.select("#viz").html(null);

  // (re)create the svg element
  var svg = d3
    .select("#viz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var g = svg.append("g")

  svg.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 8])
    .on("zoom", zoomed));

  // Render the hexes
  var regions = config["selectedRegions"];
  var hexjson = config["hexjson"];
  Object.keys(hexjson["hexes"]).forEach(function(key, index) {
    if (regions.indexOf(hexjson["hexes"][key]["a"]) > -1) {
      hexjson["hexes"][key]["selected"] = 1;
    } else {
      hexjson["hexes"][key]["selected"] = 0;
    }
  });
  console.log(hexjson)

  // Create the grid hexes and render them
  var grid = d3.getGridForHexJSON(config["hexjson"]);
  var gridHexes = d3.renderHexJSON(grid, width, height);

  // Render the data hexes
  var hexes = d3.renderHexJSON(hexjson, width, height);

  // boundaries
  var boundarySegments = d3.getBoundarySegmentsForHexJSON(hexjson, width, height, "a");

  // Bind the grid hexes to g.grid elements of the svg and position them
	var hexgrid = g
    .selectAll("g.grid")
    .data(gridHexes)
    .enter()
    .append("g")
    .attr("transform", function(hex) {
      return "translate(" + hex.x + "," + hex.y + ")";
    });

	// Draw the polygons around each grid hex's centre
	hexgrid
		.append("polygon")
		.attr("points", function(hex) {return hex.points;})
		.attr("stroke", "#b0b0b0")
		.attr("stroke-width", "1")
    .attr("fill", "#f0f0f0");
    
  // Bind the hexes to g elements of the svg and position them
  var hexmap = g
    .selectAll("g.data")
    .data(hexes)
    .enter()
    .append("g")
    .attr("transform", function(hex) {
      return "translate(" + hex.x + "," + hex.y + ")";
    });


  // var colour = d3.scaleOrdinal()
  //   .domain(["EA", "EM", "LO", "NE", "NW", "SE", "SW", "WM", "YH", "NI", "SC", "WA"])
  //   .range(d3.schemeSet1);

  // var pops = Object.values(hexjson.hexes).map(h => h.p);
  // console.log(pops);
  // var colour = d3.scaleQuantize()
  //   .domain([d3.min(pops), d3.max(pops)])
  //   .range(d3.schemePiYG[7]);

  // Draw the polygons around each hex's centre
  hexmap
    .append("polygon")
    .attr("points", function(hex) {return hex.points;})
    .attr("stroke", "white")
    .attr("stroke-width", "2")
    // .attr("fill", function(hex) {return hex.selected ? colour(hex.a) : "#f0f0f0"}) // "#b0e8f0")
    .attr("fill", function(hex) {
      let party = (config["data2017"].find(k => k["Id"] == [hex["key"]]))["Summary"]["WinningParty2"];
      return hex.selected ? config["partyColours"](party) : "#f0f0f0";
    }) // "#b0e8f0")
    .on("mouseover", hexOver)
    .on("mouseleave", hexLeave);
    
	// Draw boundary lines
	var boundaryLines = g
		.selectAll("g.lines")
		.data(boundarySegments)
		.enter()
		.append("line")
		.attr("x1", function(d) { return d.x1;})
		.attr("y1", function(d) { return d.y1;})
		.attr("x2", function(d) { return d.x2;})
		.attr("y2", function(d) { return d.y2;})
		.attr("stroke", "black")
		.attr("stroke-width", 2)
		.attr("stroke-linecap", "round")
    .attr("fill", "none");

  // info panel init
  var info = d3.select("#info")
    .html(d3.select('#infoPanelTemplate').html());
    
  function hexOver(d) {
    if (d.selected) {
      d3.select(this)
        .style("opacity", 0.4);
      updateInfo(d);
    }
    // if (d.key == 'N06000007' || d.key == 'N06000009') {
      // console.log(d)
    // }
  }

  function hexLeave(d) {
    if (d.selected) {
      d3.select(this)
        .style("opacity", 1)

    }
  }

  function zoomed() {
    g.attr("transform", d3.event.transform);
    // g.selectAll("circle").attr("r", 1.5 / transform.k);
  }
  // // Add the hex codes as labels
  // hexmap
  //   .append("text")
  //   .append("tspan")
  //   .attr("text-anchor", "middle")
  //   .text(function(hex) {return hex.key;});

  function updateInfo(d) {
    var data = config["data2017"].find(k => k["Id"] == d["key"]);
    console.log(data);

    info.select('#constituencyName')
      .text(data.Summary.Constituency);
    info.select('#winningCandidateName')
      .text('Winner: ' + data.Summary.WinningCandidate);
    info.select('#winningPartyName')
      .text('Winner: ' + data.Summary.WinningPartyName);
    info.select('#partyColourBlock')
      .style('background-color', data.Summary.PartyColour)
      .style('height', '5px')
      .style('width', '100%');
    info.select('#electorate')
      .text('Electorate: ' + data.Summary.Electorate.toLocaleString('en-uk'));
    info.select('#turnout')
      .text('Turnout: ' + data.Summary.ValidVotes.toLocaleString('en-uk'));
    info.select('#votes')
      .text('Votes for winner: ' + data.Summary.WinningVoteCount.toLocaleString('en-uk'));
    info.select('#share')
      .text('Winning share: ' + data.Summary.ValidVotePercent.toLocaleString('en-uk', {'style': 'percent'}));

    // votes bar chart
    // amended from https://bl.ocks.org/alandunning/7008d0332cc28a826b37b3cf6e7bd998
    // and https://bl.ocks.org/mbostock/7341714

    // get voting data
    var votesRaw = data.CandidateVoteInfo.map(function(k) {
      return {
        'party': k.PartyAbbrevTransformed, 
        'votes': k.Votes, 
        'color': k.PartyColour 
      };
    });
    // sum over duplicate keys e.g. OTH
    var votes = [];
    var parties = [];
    votesRaw.forEach(function(item, index) {
      if (parties.indexOf(item.party) < 0) {
        parties.push(item.party);
        votes.push(item);
      } else {
        votes.filter(function(k) {
          return k.party == item.party;
        })[0].votes += item.votes;
      }
    });
    // sort ascending
    votes.sort(function(a, b) { return a.votes - b.votes; });

    var margin = {top: 5, left: 40},
      width = 150,
      height = votes.length * 30; 

    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleBand().range([height, 0]);

    // remove old g from chart svg
    info.select('#svgVotes')
      .select('g')
      .remove();
    
    // add new g to chart svg
    var g = info 
      .select('#svgVotes') 
      .attr('height', height + 20)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // set up axes
    x.domain([0, d3.max(votes, function(d) { return d.votes; })]);
    y.domain(votes.map(function(d) { return d.party; })).padding(0.1);

    // append new g to chart svg
    g.append('g')
      .attr('class', 'y axis')
      .call(d3.axisLeft(y));

    // add bars per votes data using party color
    // set up a g element for each entry in votes array
    var bars = g.selectAll('.bar')
      .data(votes)
      .enter();
      
    // append a rect for each g and set color, x, y, height and width
    bars.append('rect')
      .style('fill', function(d) {
        return d.color;
      })
      .attr('x', 0)
      .attr('height', y.bandwidth() )
      .attr('y', function(d) { return y(d.party); })
      .attr('width', function(d) { return x(d.votes); });

    // append a label just after rect with vote count
    bars.append('text')
      .attr('x', function(d) { return x(d.votes) + 4; })
      .attr('y', function(d, i) { return y(d.party) + (y.bandwidth() / 2); })
      .attr('dy', '.35em')
      .text(function(d) { return d.votes.toLocaleString('en-uk'); });
  }
}