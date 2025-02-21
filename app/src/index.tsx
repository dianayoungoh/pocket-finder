import React from "react";
import ReactDOM from "react-dom";
import { Model } from "./model/model";

const App = () => (
  <React.Fragment>
    <span className="title"> HADRIAN </span>

    <Model />
  </React.Fragment>
);

ReactDOM.render(<App />, document.getElementById("root"));
