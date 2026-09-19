import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RequestsPage } from './pages/RequestsPage'

function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/requests" element={<RequestsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/requests" replace />} />
  </Routes></BrowserRouter></AuthProvider>
}
export default App
