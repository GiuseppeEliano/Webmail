import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useConnectionMonitor } from "@/hooks/use-connection-monitor";
import { useAuth } from "@/hooks/use-auth";
import Inbox from "@/pages/inbox";
import AuthPage from "@/pages/auth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // If not authenticated, show auth routes
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route component={AuthPage} /> {/* Default route for non-authenticated users */}
      </Switch>
    );
  }
  
  // If authenticated, show app routes
  return (
    <Switch>
      <Route path="/" component={Inbox} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/folder/:folderType" component={Inbox} />
      {/* Fallback to inbox for authenticated users */}
      <Route component={Inbox} />
    </Switch>
  );
}

function App() {
  // Monitor connection status
  useConnectionMonitor();

  useEffect(() => {
    // Initialize theme on app startup
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    
    // Remove existing classes
    root.classList.remove('dark', 'light');
    
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else if (savedTheme === 'light') {
      root.classList.add('light');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="gradient-bg min-h-screen">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
