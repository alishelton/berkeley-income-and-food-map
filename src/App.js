import React, { Component } from 'react';
import './App.css';
import ColorMap from './Components/Map'
import Analytics from './Components/Analytics'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clickedTract : null,
      tractIncome: null
    };
  }

  lastTractCallback = (tract, income) => {
    this.setState({clickedTract : tract, tractIncome: income});
  }

  render() {
    //put this after color map to include the analytics section
    //<Analytics tract={this.state.clickedTract} income={this.state.tractIncome}/>
    return (
      <div className="App">
        <h1 className="title">Berkeley Income and Food Mapping</h1>
        <ColorMap tractCallback={this.lastTractCallback} width={500} height={400} />
      </div>
    );
  }
}

export default App;
