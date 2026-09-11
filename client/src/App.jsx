import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Candidates from './pages/Candidates';
import Jobs from './pages/Jobs';
import JobFinder from './pages/JobFinder';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelect from './pages/RoleSelect';
import BulkUpload from './pages/BulkUpload';

function App() {
    return (
        <Routes>
            {/* Landing page — role selection */}
            <Route path="/" element={<RoleSelect />} />

            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ── Organisation-only routes ── */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute requiredRole="org">
                        <Layout><Dashboard /></Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/bulk-upload"
                element={
                    <ProtectedRoute requiredRole="org">
                        <Layout><BulkUpload /></Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/candidates"
                element={
                    <ProtectedRoute requiredRole="org">
                        <Layout><Candidates /></Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/analytics"
                element={
                    <ProtectedRoute requiredRole="org">
                        <Layout><Analytics /></Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute requiredRole="org">
                        <Layout><Settings /></Layout>
                    </ProtectedRoute>
                }
            />

            {/* ── Shared route — accessible to BOTH roles ── */}
            <Route
                path="/analyzer"
                element={
                    <ProtectedRoute>
                        <Layout><Home /></Layout>
                    </ProtectedRoute>
                }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
