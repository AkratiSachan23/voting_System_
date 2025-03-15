
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage'
import AuthPage from './components/auth/AuthPage'
import PartyAuthPage from './components/partyAuth/PartyAuthPage';
import VoterDash from './components/Dashboard/VoterDashboard/VoterDash';
import AdminDash from './components/Dashboard/AdminDashboard/AdminDash';
import PartyDash from './components/Dashboard/PartyDashboard/PartyDash';
import Settings from './components/Dashboard/PartyDashboard/Settings';
import View from './components/Dashboard/PartyDashboard/View';
import Verification from './components/Dashboard/PartyDashboard/Verification';
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
        <Route path="/party/dashboard/:token" element= {<PartyDash />} />
        <Route path="/party/dashboard/:token/settings" element= {<Settings />} />
        <Route path="/party/dashboard/:token/updateProfile" element= {<View />} />
        <Route path="/party/dashboard/:token/verify" element= {<Verification />} />
        
      </Routes>
    </Router>
  )
}

export default App
