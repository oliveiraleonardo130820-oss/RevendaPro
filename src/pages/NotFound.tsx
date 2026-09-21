
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Página não encontrada
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-gray-600">
            A página que você está procurando não existe ou foi movida.
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
