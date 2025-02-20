import React from 'react';
import ReactDOM from 'react-dom';
import { Model } from './model/model';

const App = () => (
    <React.Fragment>
        <span> HADRIAN </span>
        {/*}
        <img 
    src="/images/hadrian_logo_transparent.png" 
    alt="Hadrian Logo" 
            style={{ height: '50px' }} 
/>*/}
        <Model />
    </React.Fragment>
);

ReactDOM.render(
    <App />,
    document.getElementById('root')
);
