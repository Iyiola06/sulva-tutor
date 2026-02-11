
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="h-screen flex items-center justify-center"><i className="fas fa-spinner fa-spin text-4xl text-brand-600"></i></div>;
    }

    if (!user) {
        return <Navigate to="/auth" />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
