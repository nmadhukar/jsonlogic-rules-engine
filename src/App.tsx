import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Playground } from './pages/Playground';
import { DomainList } from './pages/DomainList';
import { DomainEditor } from './pages/DomainEditor';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<Playground />} />
          <Route path="/domains" element={<DomainList />} />
          <Route path="/domains/:id" element={<DomainEditor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
