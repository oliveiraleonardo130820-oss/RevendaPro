
import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // Redirecionamento baseado no tipo de usuário
      const currentPath = window.location.pathname;
      
      // Permitir que funcionários acessem o perfil
      const funcionarioAllowedPaths = ['/funcionario-dashboard', '/profile'];
      
      if (user.tipo_usuario === 'funcionario' && !funcionarioAllowedPaths.includes(currentPath)) {
        navigate('/funcionario-dashboard');
      } else if (user.tipo_usuario === 'dono' && currentPath === '/funcionario-dashboard') {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
