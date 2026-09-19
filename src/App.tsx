import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { RequestsPage } from './pages/RequestsPage'

function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/requests/new" element={<RequestsPage />} />
      <Route path="/requests/:requestId" element={<RequestsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/requests" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}
export default App
