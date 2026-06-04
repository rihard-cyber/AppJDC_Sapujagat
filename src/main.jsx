console.log("main.jsx: loading...");
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log("main.jsx: mounting App...");
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log("main.jsx: mount call completed.");
} catch (err) {
  console.error("main.jsx: React mount crashed!", err);
}
