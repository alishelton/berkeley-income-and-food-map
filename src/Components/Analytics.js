import React, { Component } from 'react';
import '../App.css';
import * as d3 from 'd3';
let tractData = require('../berkeley-map/store_data_by_tract.json');

class Analytics extends Component {
  constructor(props) {
    super(props);
    this.createAnalyticsSection = this.createAnalyticsSection.bind(this);
  }

  rounder = (num) => {
    return Math.ceil(num * 100) / 100;
  }

  createAnalyticsSection() {
    if (this.props.tract === null) {
      return (
        <div>
          <div className="analytics-info">
            <h2>Info</h2>
            <p>Welcome to the Berkeley Neighborhood Food Mapping Project! Click
            on any neighborhood to learn some stats on the food available there.</p>
          </div>
        </div>
      )
    } else {
      let currentTractData = tractData[this.props.tract];
      let format = d3.format(",.5r");
      return (
        <div>
          <div className="analytics-data">
            <h2>Store Data</h2>
            <h3>Median Income: ${format(this.props.income)}</h3>
            <h3>Fast Food Chain Count: {currentTractData.fast_food.count}</h3>
            <h3>Convenience Stores Count: {currentTractData.convenience.count}</h3>
          </div>
        </div>
      )
    }
  }

  render() {
    var currentTract = "Berkeley"
    if (this.props.tract != null) {
      currentTract= 'Census Tract: ' + this.props.tract;
    }
    return (
      <div className="analytics-div">
        <h1 className="analytics-title">{currentTract}</h1>
        {this.createAnalyticsSection()}
        {this.props.store != null &&
          <h1 className="selected-store">{this.props.store.properties.name}</h1>
        }
      </div>
    );
  }
}

export default Analytics;
