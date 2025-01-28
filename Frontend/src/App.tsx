
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage'
import AuthPage from './components/auth/AuthPage'
import PartyAuthPage from './components/partyAuth/PartyAuthPage';
import VoterDash from './components/Dashboard/VoterDashboard/voterDash';
function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/voter/auth" element= {<AuthPage />} />
        <Route path="/party/auth" element= {<PartyAuthPage />} />
        <Route path="/voter/dashboard/:voterId" element= {<VoterDash />} />
      </Routes>
    </Router>
  )
}

export default App
