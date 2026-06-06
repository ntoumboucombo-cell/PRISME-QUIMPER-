import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth, RequirePermission } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Comptabilite } from './pages/Comptabilite'
import { Adherents } from './pages/Adherents'
import { Cotisations } from './pages/Cotisations'
import { Dons } from './pages/Dons'
import { Projets } from './pages/Projets'
import { ProjetDetail } from './pages/ProjetDetail'
import { Documents } from './pages/Documents'
import { Secretariat } from './pages/Secretariat'
import { Admin } from './pages/Admin'
import { Profil } from './pages/Profil'

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={
            <RequirePermission permission="agenda.read">
              <Dashboard />
            </RequirePermission>
          }
        />
        <Route path="/profil" element={<Profil />} />
        <Route
          path="/comptabilite"
          element={
            <RequirePermission permission="finances.read">
              <Comptabilite />
            </RequirePermission>
          }
        />
        <Route
          path="/adherents"
          element={
            <RequirePermission permission="adherents.read">
              <Adherents />
            </RequirePermission>
          }
        />
        <Route
          path="/cotisations"
          element={
            <RequirePermission permission="finances.read">
              <Cotisations />
            </RequirePermission>
          }
        />
        <Route
          path="/dons"
          element={
            <RequirePermission permission="finances.read">
              <Dons />
            </RequirePermission>
          }
        />
        <Route
          path="/projets"
          element={
            <RequirePermission permission="projets.read">
              <Projets />
            </RequirePermission>
          }
        />
        <Route
          path="/projets/:id"
          element={
            <RequirePermission permission="projets.read">
              <ProjetDetail />
            </RequirePermission>
          }
        />
        <Route
          path="/documents"
          element={
            <RequirePermission permission="documents.read">
              <Documents />
            </RequirePermission>
          }
        />
        <Route
          path="/secretariat"
          element={
            <RequirePermission permission="secretariat.read">
              <Secretariat />
            </RequirePermission>
          }
        />
        <Route
          path="/admin"
          element={
            <RequirePermission permission="admin.manage">
              <Admin />
            </RequirePermission>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
