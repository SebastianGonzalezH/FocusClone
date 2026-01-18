import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading, profileLoading } = useAuth();

  // Wait for auth to load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  // Wait for profile to load before making onboarding decision
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading profile...</div>
      </div>
    );
  }

  // If user hasn't completed onboarding, redirect to template selection
  if (!profile || !profile.onboarding_completed) {
    return <Navigate to="/onboarding/template" replace />;
  }

  return <>{children}</>;
}
