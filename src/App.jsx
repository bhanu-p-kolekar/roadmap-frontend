import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GeneratorPage from './pages/GeneratorPage';
import SavedPage from './pages/SavedPage';
import StudentView from './pages/StudentView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GeneratorPage />} />
  <Route path="/saved" element={<SavedPage />} />
  <Route path="/student" element={<StudentView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
