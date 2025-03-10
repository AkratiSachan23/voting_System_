
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage'
import AuthPage from './components/auth/AuthPage'
import PartyAuthPage from './components/partyAuth/PartyAuthPage';
import VoterDash from './components/Dashboard/VoterDashboard/VoterDash';
import AdminDash from './components/Dashboard/AdminDashboard/AdminDash';
// import RegisteredParties from './components/Dashboard/VoterDashboard/RegisteredParties';
// import VoterSettings from './components/Dashboard/VoterDashboard/VoterSettings'
function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/voter/auth" element= {<AuthPage />} />
        <Route path="/party/auth" element= {<PartyAuthPage />} />
        <Route path="/voter/dashboard/:token" element= {<VoterDash />} />
        {/* <Route path="/voter/dashboard/registeredParties" element= {<RegisteredParties />} />
        <Route path="/voter/dashboard/voterSettings" element= {<VoterSettings />} /> */}
        <Route path="/admin/dashboard" element= {<AdminDash />} />
        
      </Routes>
    </Router>
  )
}

export default App
