import React from "react";
import { PerformanceDemo } from "@/components/performance-demo";
import { useAuth } from "@/hooks/use-auth";

export default function PerformanceDemoPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Você precisa estar logado para ver esta demonstração.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Demonstração de Performance
          </h1>
          <p className="text-muted-foreground">
            Comparação entre o sistema anterior e o novo sistema de paginação
          </p>
        </div>
        
        <PerformanceDemo />
      </div>
    </div>
  );
}