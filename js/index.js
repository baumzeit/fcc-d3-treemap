"use strict";

document.addEventListener("DOMContentLoaded", function (event) {
  var labels = document.getElementsByClassName("labels")[0].children;
  var controls = document.getElementsByClassName("controls")[0].children;
  var heading = document.getElementById("title");
  var descriptionBox = document.getElementById("description");
  var containerMap = document.getElementById("map-container");
  var containerLegend = document.getElementById("legend-container");

  var titles = ["Games", "Movies", "Kickstarter"];
  // `titles` need to correspond with `metaData` keys
  var metaData = {
    Games: {
      url:
      "https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/video-game-sales-data.json",
      description: "Top 100 Most Sold Video Games Grouped by Platform",
      color: "#CD5700",
      unitName: "Sold Copies",
      unitSize: "million units",
      valueScale: 1 },

    Movies: {
      url:
      "https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/movie-data.json",
      description: "Top 100 Highest Grossing Movies Grouped By Genre",
      color: "SlateBlue",
      unitName: "Gross USA",
      unitSize: "million $",
      valueScale: 0.000001 },

    Kickstarter: {
      url:
      "https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/kickstarter-funding-data.json",
      description:
      "Top 100 Most Pledged Kickstarter Campaigns Grouped By Category",
      color: "#009E74",
      unitName: "Pledges",
      unitSize: "million $",
      valueScale: 0.000001 } };



  // event listeners for dataset navigation
  for (var i = 0; i < titles.length; i++) {
    labels[i].addEventListener("click", handleClick);
    controls[i].addEventListener("click", handleClick);
  }
  window.onkeydown = handleKey;

  var timeoutDelay = 220; // needs to be the same
  // as the duration of the animation

  function handleClick(e) {
    var row = e.target.dataset.row;
    var clicked = titles[row];
    var found = document.getElementById("highlight").innerText;
    while (clicked != found) {
      found = rotateArr(titles);
    }
    diagramAnimationWrapper(renderPage);
  }

  function handleKey(e) {
    if (e.keyCode == "38") {
      // up key
      rotateArr(titles);
      diagramAnimationWrapper(renderPage);
    }
    if (e.keyCode == "40") {
      // down key
      rotateArr(titles, true);
      diagramAnimationWrapper(renderPage);
    }
  }

  // manages animation sequence
  // update diagram in between in and out animations for a smoother transition between two datasets
  // << in | update | out >>
  function diagramAnimationWrapper(func) {
    // necessary to enable animation restart
    containerMap.classList.remove("animate-in");
    containerMap.classList.remove("animate-out");
    void containerMap.offsetWidth;

    containerMap.classList.add("animate-in");
    setTimeout(function () {
      containerMap.classList.add("animate-out");
      func();
    }, timeoutDelay);
  }

  function rotateArr(arr, reverse) {
    if (reverse) {
      titles.push(titles.shift());
    } else {
      titles.unshift(titles.pop());
    }
    return titles[1];
  }

  // check if local storage is supported
  var webStorage = typeof Storage !== "undefined";

  function preloadData() {
    titles.map(function (title) {
      d3.json(metaData[title].url).then(function (data) {
        sessionStorage[title] = JSON.stringify(data);
      });
    });
  }

  // preload all data sets if webStorage is supported
  // fetch each data set only once per session
  webStorage && preloadData();

  renderPage();

  function renderPage() {
    // store the the title of the user selected dataset
    var selected = titles[1];

    updateTitles();
    updateheading();
    updateDescription();

    var stored = function stored() {return sessionStorage.hasOwnProperty(selected);};
    var retrieve = function retrieve() {return JSON.parse(sessionStorage.getItem(selected));};

    // make use of of local storage if supported
    if (stored()) {
      drawDiagram(retrieve());
    } else {
      d3.json(metaData[selected].url).then(function (data) {return drawDiagram(data);});
    }
  }

  function updateTitles() {
    var label = void 0;
    for (var _i = 0; _i < labels.length; _i++) {
      label = labels[_i];
      label.innerText = titles[_i];
      label.style.color = metaData[titles[_i]].color;
    }
  }

  function updateheading() {
    heading.innerText = document.getElementById("highlight").innerText; // sets the title to the selected dataset name
    heading.style.color = metaData[titles[1]].color;
  }

  function updateDescription() {
    descriptionBox.innerText = metaData[titles[1]].description;
  }

  function drawDiagram(data) {
    // map svg sizing
    d3.selectAll("svg").remove();
    d3.selectAll("#tooltip").remove();

    var containerMapD3 = d3.select("#map-container");
    var w = containerMap.offsetWidth - 4;
    var hMap = containerMap.offsetHeight - 4;
    var paddingInner = 2;
    var paddingOuter = 2;

    // create main svg
    var svgMap = containerMapD3.
    append("svg").
    attr("width", w).
    attr("height", hMap);

    // create tooltip element
    var tooltip = d3.
    select("body").
    append("div").
    attr("id", "tooltip").
    style("opacity", 0).
    style("top", "50vh").
    style("right", "50vw");

    var root = d3.
    hierarchy(data).
    sum(function (d) {return d.value;}).
    sort(function (a, b) {return b.value - a.value;});

    var treemap = d3.
    treemap().
    size([w, hMap]).
    paddingInner([paddingInner]).
    paddingOuter([paddingOuter]).
    tile(d3.treemapSquarify.ratio(1.3));
    treemap(root);

    // dynamically create color set for the number of categories in the dataset
    var categories = root.children.map(function (cat) {return cat.data.name;});
    var norm = d3.scaleBand().domain(categories);

    var color = function color(cat) {return d3.interpolateViridis(norm(cat));};

    var category = svgMap.
    selectAll("rect").
    data(root.children).
    enter().
    append("rect").
    attr("class", "category").
    attr("id", function (d) {return toCatId(d.data.name);}).
    attr("x", function (d) {return d.x0;}).
    attr("y", function (d) {return d.y0;}).
    attr("width", function (d) {return d.x1 - d.x0;}).
    attr("height", function (d) {return d.y1 - d.y0;}).
    attr("fill", "transparent");

    function toCatId(str) {
      return "cat-" + str.toLowerCase().replace(/\W/g, "_");
    }

    var cell = svgMap.
    selectAll("g").
    data(root.leaves()).
    enter().
    append("g").
    attr("transform", function (d) {return "translate(" + d.x0 + "," + d.y0 + ")";});

    cell.
    append("rect").
    attr("class", "tile").
    attr("width", function (d) {return d.x1 - d.x0;}).
    attr("height", function (d) {return d.y1 - d.y0;}).
    attr("fill", function (d) {return color(d.data.category);}).
    attr("data-name", function (d) {return d.data.name;}).
    attr("data-category", function (d) {return d.data.category;}).
    attr("data-value", function (d) {return d.data.value;})

    //  add event listeners
    .on("mousemove", function (d) {
      tooltip.style("opacity", 1).attr("data-value", d.data.value);
      d3.event.target.style.stroke = "white";
      var getTooltipLeftOffset = function getTooltipLeftOffset() {
        var posX = d3.event.pageX;
        var screenWidth = window.innerWidth;
        return posX < screenWidth - 260 ?
        posX + 40 + "px" :
        posX - 210 + "px";
      };

      tooltip.
      html(formatDataHTML(d)).
      style("top", d3.event.pageY - 90 + "px").
      style("left", getTooltipLeftOffset());

      document.getElementById("tooltip-title").style.color =
      metaData[titles[1]].color;
    }).
    on("mouseout", function (d) {
      tooltip.style("opacity", 0);
      d3.event.target.style.stroke = "transparent";
    });

    cell.each(addText);

    function addText(rect, i) {
      var width = d3.
      select(this).
      select("rect").
      attr("width"),
      height = d3.
      select(this).
      select("rect").
      attr("height"),
      text = d3.select(this).append("text"),
      x = 4,
      y = 10;
      var word = void 0,
      words = rect.data.name.split(/\s+/).reverse(),
      line = [],
      lineHeight = 10,
      lineNumber = 0,
      full = false,
      maxLines = Math.floor((height - y) / lineHeight),
      tspan = text.
      text(null).
      attr("y", y).
      attr("x", x).
      attr("class", "tile-label").
      append("tspan");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (
        !full &&
        line.length > 1 &&
        tspan.node().getComputedTextLength() > parseFloat(width) - 4)
        {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          lineNumber++;
          tspan = text.
          append("tspan").
          attr("x", x).
          attr("dy", lineHeight).
          text(word);
          if (lineNumber == maxLines) {
            words = ["..."];
            full = true;
          }
        }
      }
    }

    // create HTML for the tooltip
    function formatDataHTML(d) {
      var f2 = d3.format(".2f");
      var scaledValue = f2(d.data.value * metaData[titles[1]].valueScale);
      return "<table>\n              <tr>\n                <td id=\"tooltip-title\" colspan=\"2\">" +

      d.data.name + "</td>\n              </tr>\n              <tr>\n                <th>Category: </th><td>" +


      d.data.category + "</td>\n              </tr>\n              <tr>\n                <th>" +


      metaData[titles[1]].unitName + ":<br>\n                    (" +
      metaData[titles[1]].unitSize + ")</th>\n                <td id=\"tooltip-value\" rowspan=\"2\">" +
      scaledValue + "</td>\n              </tr>\n            </table>";


    }

    // create svg for legend
    var containerLegendD3 = d3.select("#legend-container");
    containerLegend.style.height = 100;
    var hLegend = containerLegend.offsetHeight;
    var twoRows = categories.length > 10;
    var numCatRow = Math.ceil(categories.length / (twoRows ? 2 : 1));
    var xInterval = w / numCatRow;
    var side = 25;

    var svgLegend = containerLegendD3.
    append("svg").
    attr("id", "legend").
    attr("width", w).
    attr("height", hLegend);

    var legendEntry = svgLegend.
    selectAll("g").
    data(categories).
    enter().
    append("g").
    attr("transform", function (d, i) {return "translate(" + calcX(d, i) + ", " + calcY(d, i) + ")";});

    legendEntry.
    append("rect").
    attr("class", "legend-item").
    attr("fill", function (d) {return color(d);}).
    attr("x", 0).
    attr("y", 0).
    attr("width", side).
    attr("height", side).
    on("mouseover", function (d) {
      var id = toCatId(d);
      d3.
      select("#" + id).
      attr("stroke", "white").
      attr("stroke-width", 2);
    }).
    on("mouseout", function (d) {
      var id = toCatId(d);
      d3.select("#" + id).attr("stroke", "transparent");
    });

    legendEntry.
    append("text").
    attr("class", "legend-label").
    attr("x", side / 2).
    attr("y", side + 18).
    text(function (d) {return d;}).
    attr("fill", "white").
    attr("text-anchor", "middle");

    function calcX(d, i) {
      return xInterval * (i % numCatRow) + xInterval / 2 - side / 2;
    }
    function calcY(d, i) {
      return twoRows ? i >= numCatRow ? side + 55 : 15 : 50;
    }
  }
});