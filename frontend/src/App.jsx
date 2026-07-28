import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Public pages
import Home from './pages/public/Home'
import Fixtures from './pages/public/Fixtures'
import Standings from './pages/public/Standings'
import Results from './pages/public/Results'

// Auth pages
import Login from './pages/auth/Login'
import Logout from './pages/auth/Logout'

// Portal pages
import Dashboard from './pages/portal/Dashboard'
import TeamManagerLonglist from './pages/portal/team-manager/Longlist'
import WSCCLonglists from './pages/portal/wscc/Longlists'
import RefereeAppointments from './pages/portal/referee/Appointments'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="fixtures" element={<Fixtures />} />
        <Route path="standings" element={<Standings />} />
        <Route path="results" element={<Results />} />
        
        {/* Auth routes */}
        <Route path="login" element={<Login />} />
        <Route path="logout" element={<Logout />} />
        
        {/* Protected portal routes */}
        <Route path="portal" element={<ProtectedRoute />}>
          <Route index element={<Dashboard />} />
          
          {/* Team Manager routes */}
          <Route path="team-manager">
            <Route path="longlist" element={<TeamManagerLonglist />} />
          </Route>
          
          {/* WSCC routes */}
          <Route path="wscc">
            <Route path="longlists" element={<WSCCLonglists />} />
          </Route>
          
          {/* Referee routes */}
          <Route path="referee">
            <Route path="appointments" element={<RefereeAppointments />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
