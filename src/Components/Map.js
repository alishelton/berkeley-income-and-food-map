import style from 'bootstrap/dist/css/bootstrap.css';
import React, { Component } from 'react';
import '../App.css';
import * as d3 from 'd3';
import d3Tip from 'd3-tip';
import * as topojson from 'topojson';
import { Button, ButtonGroup } from 'react-bootstrap';
let stores = require('../berkeley-map/store_data_by_tract');
let income = require("../berkeley-map/berkeley_income");

class ColorMap extends Component {
  constructor(props) {
    super(props);
    this.createMap = this.createMap.bind(this);
    this.updateMap = this.updateMap.bind(this);
    this.createPlot = this.createPlot.bind(this);
    this.updatePlot = this.updatePlot.bind(this);
    this.state = {
      activeTract: d3.select(null),
      activeColorScheme: "income",
      activePlotScheme: "fast_food"
    };
    this.colorMap =  {
      "fast_food": [[0, 8], d3.schemeGreens[8]],
      "income": [[0, 260000], d3.schemeBlues[9]],
      "convenience": [[0, 10], d3.schemeReds[9]]
    };
    this.titles = {
      "fast_food": "Count of Fast Food Chains by Census Tract",
      "income": "Median Income By Census Tract",
      "convenience": "Count of Convenience Stores by Census Tract"
    }
    this.incomeData = new Map(income.map(d => [d.geo_name.slice(13), d.income]));
  }

  componentDidMount() {
    this.createMap();
    this.createPlot();
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (this.state.activeColorScheme !== nextState.activeColorScheme);
  }

  componentDidUpdate(prevProps, prevState) {
    this.updateMap();
    if (prevState.activePlotScheme !== this.state.activePlotScheme) {
      this.updatePlot();
    }
  }

  clicked = (d, geoPath, path) => {
    if (this.state.activeTract.node() === path) {
      return this.reset();
    }
    //inform analytics section
    this.props.tractCallback(d.properties.NAME, this.incomeData.get(d.properties.NAME));

    //update the state and map styling
    d3.select(this.node).selectAll("path").attr("stroke-width", 1.5);
    d3.select(path).attr("stroke-width", 5);
    this.setState({
      activeTract: d3.select(path),
      activeColorScheme: this.state.activeColorScheme,
      activePlotScheme: this.state.activePlotScheme
    });

    //update selected plot point
    d3.select(this.sNode).selectAll("circle")
      .attr("r", 3)
      .attr("fill", "white")
      .attr("fill-opacity", 0.9);
    d3.select(this.sNode).selectAll("#p" + (d.properties.NAME).split(".").join(""))
      .attr("r", 7)
      .attr("fill", "#D85858")
      .attr("fill-opacity", 1);
  }

  reset = () => {
    //inform the analytic section
    this.props.tractCallback(null, null);

    //redraw the map and update state
    this.tracts.selectAll("path")
      .attr("stroke-width", 1.5);
    d3.select(this.sNode).selectAll("circle")
      .attr("r", 5)
      .attr("fill", "white")
      .attr("fill-opacity", 0.8);
    this.setState({
      activeTract: d3.select(null),
      activeColorScheme: this.state.activeColorScheme,
      activePlotScheme: this.state.activePlotScheme
    });
  }

  createMap() {
    const legendNode = d3.select(this.lNode);
    const svgNode = d3.select(this.node);
    const component = this;

    //projection and path
    var albersProjection = d3.geoAlbers()
      .scale(190000*1.7)
      .parallels([0, 10])
      .rotate([0, 0])
      .center([-122.2787, 37.8644])
      .translate([svgNode.attr('width') / 2, svgNode.attr('height') / 2]);
    var geoPath = d3.geoPath()
      .projection(albersProjection);

    //setup vars for choropleth
    var tip = d3Tip()
      .attr('class', 'd3-tip')
      .offset([-5, 0])
      .html(function(d) {
        var tractIncome = component.incomeData.get(d.properties.NAME);
        var fastFoodCount = stores[d.properties.NAME].fast_food.count;
        var convenienceCount = stores[d.properties.NAME].convenience.count;
        return "Median Income: " + tractIncome
          + "<br /> Fast Food Count: " + fastFoodCount
          + "<br /> Convenience Store Count: " + convenienceCount;
    });
    var format = d3.format(".3~s");
    let colorScheme = this.colorMap[this.state.activeColorScheme];
    var color = d3.scaleQuantize()
      .domain(colorScheme[0])
      .range(colorScheme[1]);
    const x = d3.scaleLinear()
          .domain(d3.extent(color.domain()))
          .rangeRound([500, 200]);

    //legend
    var legendGroups = legendNode
      .selectAll("g")
      .data(color.range().map(d => color.invertExtent(d)));
    var enterGroups = legendGroups.enter()
      .append("g")
      .attr("class","legendGroup");
    enterGroups.append("rect")
      .attr("y", d => x(d[0]) - 120)
      .attr("height", d => x(d[0]) - x(d[1]) + 10)
      .attr("width", 20)
      .attr("fill", d => color(d[0]));
    enterGroups.append("text")
      .attr("x", 30)
      .attr("y", d => (x(d[0]) - 105))
      .attr("fill", "white")
      .text(d => format(d[1]));

    //background rect
    svgNode.append("rect")
    .attr("class", "background")
    .attr("width", svgNode.attr('width'))
    .attr("height", svgNode.attr('height'))
    .on("click", function() {
      component.reset();
    });

    let berkeley = require('../berkeley-map/tracts-topo');

    //tract grouping
    this.tracts = svgNode.append('g');
    this.tracts.call(tip);

    //drawing the map
    this.tracts.selectAll("path")
      .data(topojson.feature(berkeley, berkeley.objects.tracts).features)
      .enter()
      .append("path")
      .attr("fill", d => color(component.incomeData.get(d.properties.NAME)))
      .attr("d", geoPath)
      .attr("stroke", "#373C47")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "bevel")
      .on('click', function(d) {
        component.clicked(d, geoPath, this);
      })
      .on('mouseover', function(d) {
        d3.select(this).attr('stroke-width', 5);
        tip.show(d, this);
      })
      .on('mouseout', function() {
        if (component.state.activeTract.node() !== this) {
          d3.select(this).attr('stroke-width', 1.5);
          tip.hide(this);
        }
      })
      .append("title")
        .text(d => format(this.incomeData.get(d.properties.NAME)));
  }

  updateMap() {
    let legendNode = d3.select(this.lNode);
    let colorScheme = this.colorMap[this.state.activeColorScheme];

    let color = d3.scaleQuantize()
      .domain(colorScheme[0])
      .range(colorScheme[1]);

    //maybe use height and width?
    let x = d3.scaleLinear()
          .domain(d3.extent(color.domain()))
          .rangeRound([500, 200]);

    var f = null;
    var formatStr = ".0f";
    if (this.state.activeColorScheme === "income") {
      f = (d) => color(this.incomeData.get(d.properties.NAME));
      formatStr = ".3~s";
    } else if (this.state.activeColorScheme === "fast_food") {
      f = (d) => color(stores[d.properties.NAME].fast_food.count);
    } else if (this.state.activeColorScheme === "convenience") {
      f = (d) => color(stores[d.properties.NAME].convenience.count);
    }
    let format = d3.format(formatStr);
    var t = d3.transition()
      .duration(500)
      .ease(d3.easeLinear);

    //update legend
    var legendGroups = legendNode
      .selectAll("g")
      .data(color.range().map(d => color.invertExtent(d)), d => d);
    legendGroups.selectAll("rect")
      .attr("y", d => x(d[0]) - 120)
      .attr("height", d => x(d[0]) - x(d[1]) + 10)
      .attr("fill", d => color(d[0]));
    legendGroups.selectAll("text")
      .attr("y", d => (x(d[0]) - 105))
      .text(d => format(d[1]));
    var enterGroups = legendGroups.enter()
      .append("g")
      .attr("class", "legendGroup");
    enterGroups.append("rect")
      .attr("y", d => x(d[0]) - 120)
      .attr("height", d => x(d[0]) - x(d[1]) + 10)
      .attr("width", 20)
      .attr("fill", d => color(d[0]));
    enterGroups.append("text")
        .attr("x", 30)
        .attr("y", d => x(d[0]) - 105)
        .attr("fill", "white")
        .text(d => format(d[1]));
    legendGroups.exit().remove();

    //update map colors
    this.tracts.selectAll("path")
      .transition(t)
      .attr("fill", f);
  }

  createPlot() {
    let g = d3.select(this.sNode).append('g');
    let component = this;
    let xAxisG = g.append('g')
      .attr("class", "x axis")
      .attr("fill", "white")
      .attr("stroke", "white")
      .attr("transform", "translate(20, 370)");
    //translate with height and width
    xAxisG.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .attr("x", 350)
      .attr("y", 30)
      .style("stroke-width", 0.5)
      .style("font-size", "1vw")
      .text("Tract Median Income");
    let yAxisG = g.append('g')
      .attr("class", "y axis")
      .attr("stroke", "white")
      .attr("transform", "translate(40, 10)");
    //translate with height and width
    yAxisG.append("text")
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("x", -70)
      .attr("y", -30)
      .style("stroke-width", 0.5)
      .style("font-size", "1vw")
      .attr("transform", "rotate(-90)")
      .text("Fast Food Restaurant Count");

    var incomeScale = this.colorMap["income"][0];
    var plotScale = (this.colorMap[this.state.activePlotScheme][0]).slice();
    plotScale[1]++;

    //use height and width
    let xScale = d3.scaleLinear()
      .domain(incomeScale)
      .range([20, 500]);
    let yScale = d3.scaleLinear()
      .domain(plotScale)
      .range([360, 0]);

    let xAxis = d3.axisBottom()
      .scale(xScale)
      .tickFormat(d3.format("~s"));

    let yAxis = d3.axisLeft()
      .scale(yScale);

    g.selectAll("circle").data([...this.incomeData.keys()])
          .enter().append("circle")
            .attr("id", d => "p" + d.split(".").join(""))
            .attr("cx", d => xScale(this.incomeData.get(d)))
            .attr("cy", d => yScale(stores[d][component.state.activePlotScheme].count))
            .attr("fill", "white")
            .attr("fill-opacity", 0.9)
            .attr("r", 5);

    xAxisG.call(xAxis);
    yAxisG.call(yAxis);
  }

  updatePlot() {
    let plotNode = d3.select(this.sNode);
    let component = this;

    var plotScale = (this.colorMap[this.state.activePlotScheme][0]).slice();
    plotScale[1]++;

    //use height and width
    let yScale = d3.scaleLinear()
      .domain(plotScale)
      .range([360, 0]);
    let yAxis = d3.axisLeft()
      .scale(yScale);

    plotNode.selectAll("circle")
      .transition()
      .duration(1000)
      .attr("cy", d => yScale(stores[d][component.state.activePlotScheme].count));

    plotNode.select(".y.axis")
      .transition()
      .duration(1000)
      .call(yAxis);

    var yLabel = "Fast Food Restaurant";
    if (this.state.activePlotScheme === "convenience") {
      yLabel = "Convenience Store";
    }
    plotNode.select(".y.label")
      .text(yLabel + " Count");
  }

  fastFoodPressed = () => {
    this.setState({
      activeTract: this.state.activeTract,
      activeColorScheme: "fast_food",
      activePlotScheme: "fast_food"
    });
  }

  incomePressed = () => {
    this.setState({
      activeTract: this.state.activeTract,
      activeColorScheme: "income",
      activePlotScheme: this.state.activePlotScheme
    });
  }

  conveniencePressed = () => {
    this.setState({
      activeTract: this.state.activeTract,
      activeColorScheme: "convenience",
      activePlotScheme: "convenience"
    });
  }

  render() {
    var plotDesc = "Fast Food Restaurant";
    if (this.state.activePlotScheme === "convenience") {
      plotDesc = "Convenience Store";
    }
    return (
      <div className="map-div">
        <h3 className="map-title">{this.titles[this.state.activeColorScheme]}</h3>
        <svg ref={node => this.lNode = node} width={100} height={this.props.height} className="map-legend"></svg>
        <svg ref={node => this.node = node} width={this.props.width} height={this.props.height} className="map-svg"></svg>
        <h3 className="plot-title">Median Income vs. {plotDesc} Count</h3>
        <svg ref={node => this.sNode = node} width={this.props.width} height={this.props.height} className="plot-svg"></svg>
        <div className="color-button">
          <ButtonGroup justified>
            <ButtonGroup>
              <Button bsStyle="primary" bsSize="large" onClick={this.incomePressed}>Income</Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button bsStyle="primary" bsSize="large" onClick={this.fastFoodPressed}>Fast Food</Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button bsStyle="primary" bsSize="large" onClick={this.conveniencePressed}>Convenience</Button>
            </ButtonGroup>
          </ButtonGroup>
        </div>
      </div>
    );
  }
}

export default ColorMap;
