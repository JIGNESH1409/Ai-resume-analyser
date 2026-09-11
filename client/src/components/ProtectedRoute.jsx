import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Protects a route requiring authentication.
 * Optionally pass requiredRole="org" or requiredRole="user" to restrict by role.
 */
const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role check — legacy accounts with no role treated as 'org'
    if (requiredRole) {
        const userRole = user?.role || 'org';
        if (userRole !== requiredRole) {
            // Redirect to their proper home instead of an error page
            const fallback = userRole === 'user' ? '/analyzer' : '/dashboard';
            return <Navigate to={fallback} replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
