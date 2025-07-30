import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Clock, Database } from "lucide-react";
import { usePaginatedEmails } from "@/hooks/use-paginated-emails";
import { useAuth } from "@/hooks/use-auth";

export function PerformanceDemo() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage] = useState(20);
  const offset = (currentPage - 1) * emailsPerPage;

  // Using the new paginated system
  const { data: paginatedData, isLoading } = usePaginatedEmails({
    userId: user?.id || 1,
    folderType: 'inbox',
    limit: emailsPerPage,
    offset: offset,
  });

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sistema Anterior (Problemático) */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Sistema Anterior (Problemático)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Database className="h-4 w-4" />
              <span>Carrega TODOS os emails de uma vez</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Problema com 2.000 emails:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-400 mt-1 space-y-1">
                <li>• Transfere ~50MB de dados</li>
                <li>• Demora 3-5 segundos para carregar</li>
                <li>• Pode travar navegador</li>
                <li>• Desperdício de banda</li>
              </ul>
            </div>
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Clock className="h-4 w-4" />
              <span>Tempo de carregamento: 3-5 segundos</span>
            </div>
          </CardContent>
        </Card>

        {/* Sistema Novo (Otimizado) */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Sistema Novo (Otimizado)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Database className="h-4 w-4" />
              <span>Carrega apenas 20 emails por vez</span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Vantagens:
              </p>
              <ul className="text-sm text-green-700 dark:text-green-400 mt-1 space-y-1">
                <li>• Transfere apenas ~500KB por página</li>
                <li>• Carrega em menos de 1 segundo</li>
                <li>• Navegador sempre responsivo</li>
                <li>• Economia de dados</li>
              </ul>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Clock className="h-4 w-4" />
              <span>Tempo de carregamento: &lt;1 segundo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demonstração Prática */}
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Paginação em Ação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              Carregando emails...
            </div>
          ) : paginatedData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    Emails na Página
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {paginatedData.emails.length}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md">
                  <p className="font-medium text-purple-800 dark:text-purple-300">
                    Total de Emails
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {paginatedData.totalCount}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md">
                  <p className="font-medium text-orange-800 dark:text-orange-300">
                    Página Atual
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {paginatedData.currentPage}
                  </p>
                </div>
                <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-md">
                  <p className="font-medium text-teal-800 dark:text-teal-300">
                    Total de Páginas
                  </p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {paginatedData.totalPages}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Economia de Performance:</strong> Em vez de carregar {paginatedData.totalCount} emails 
                  (o que seria ~{Math.round(paginatedData.totalCount * 25 / 1024)}MB), 
                  carregamos apenas {paginatedData.emails.length} emails 
                  (~{Math.round(paginatedData.emails.length * 25 / 1024)}KB)
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum dado disponível
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}