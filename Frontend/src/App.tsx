
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage'
import AuthPage from './components/auth/AuthPage'
import PartyAuthPage from './components/partyAuth/PartyAuthPage';
import VoterDash from './components/Dashboard/VoterDashboard/VoterDash';
import RegisteredParties from './components/Dashboard/VoterDashboard/RegisteredParties';
function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/voter/auth" element= {<AuthPage />} />
        <Route path="/party/auth" element= {<PartyAuthPage />} />
        <Route path="/voter/dashboard/:token" element= {<VoterDash />} />
        <Route path="/voter/dashboard/registeredParties" element= {<RegisteredParties />} />
      </Routes>
    </Router>
  )
}

export default App
