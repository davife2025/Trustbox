import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { WalletProvider } from "./context/WalletContext"
import { AuthProvider }   from "./context/AuthContext"
import NavBar       from "./components/NavBar"
import Landing      from "./pages/Landing"
import Dashboard    from "./pages/Dashboard"
import HistoryPage    from "./pages/HistoryPage"
import Marketplace  from "./pages/Marketplace"
import AgentChat    from "./pages/AgentChat"

export default function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Routes>
            <Route path="/"          element={<Landing />} />
            <Route path="/dashboard" element={<><NavBar /><Dashboard /></>} />
            <Route path="/history"   element={<><NavBar /><HistoryPage /></>} />
            <Route path="/market"    element={<><NavBar /><Marketplace /></>} />
            <Route path="/chat"     element={<><NavBar /><AgentChat /></>} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </WalletProvider>
  )
}
