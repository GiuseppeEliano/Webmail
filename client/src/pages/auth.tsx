import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, RefreshCw, Mail, Lock, User, Phone } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

// Simple CAPTCHA generator
function generateCaptcha(): { question: string; answer: number } {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let answer: number;
  let question: string;
  
  switch (operation) {
    case '+':
      answer = num1 + num2;
      question = `${num1} + ${num2}`;
      break;
    case '-':
      answer = Math.max(num1, num2) - Math.min(num1, num2);
      question = `${Math.max(num1, num2)} - ${Math.min(num1, num2)}`;
      break;
    case '*':
      answer = num1 * num2;
      question = `${num1} × ${num2}`;
      break;
    default:
      answer = num1 + num2;
      question = `${num1} + ${num2}`;
  }
  
  return { question, answer };
}

// Form schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Nome de usuário ou email é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  stayLoggedIn: z.boolean().optional(),
});

const registerSchema = z.object({
  firstName: z.string()
    .min(2, 'Nome é obrigatório')
    .regex(/^[a-zA-ZÀ-ÿ'\s]+$/, "Nome deve conter apenas letras, espaços e apostrofes")
    .refine(val => !val.startsWith(' ') && !val.startsWith("'"), "Nome não pode começar com espaço ou apostrofe")
    .transform(val => val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
  lastName: z.string()
    .min(2, 'Sobrenome é obrigatório')
    .regex(/^[a-zA-ZÀ-ÿ'\s]+$/, "Sobrenome deve conter apenas letras, espaços e apostrofes")
    .refine(val => !val.startsWith(' ') && !val.startsWith("'"), "Sobrenome não pode começar com espaço ou apostrofe")
    .transform(val => val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
  phone: z.string().optional(),
  email: z.string().min(1, 'Email é obrigatório').email('Email deve ter formato válido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string(),
  captcha: z.string().min(1, 'Captcha é obrigatório'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Check for existing block on component mount
  useEffect(() => {
    // Check server for any existing IP block
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.blocked) {
          setIsBlocked(true);
          setLoginAttempts(data.attempts || 4);
          setBlockTimeLeft(data.timeLeft || 3600);
          setError('IP bloqueado pelo servidor.');
        }
      })
      .catch(() => {
        // Ignore error, server might not have this endpoint yet
      });
  }, []);
  
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', stayLoggedIn: false }
  });
  
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      captcha: ''
    }
  });

  // Block timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBlocked && blockTimeLeft > 0) {
      interval = setInterval(() => {
        setBlockTimeLeft((prev) => {
          if (prev <= 1) {
            setIsBlocked(false);
            setLoginAttempts(0);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, blockTimeLeft]);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    registerForm.setValue('captcha', '');
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const onLogin = async (data: LoginForm) => {
    if (isBlocked) return;
    
    try {
      setError('');
      
      // Transform username to add @eliano.dev if needed
      let usernameToSend = data.username;
      if (!usernameToSend.includes('@')) {
        usernameToSend = `${usernameToSend}@eliano.dev`;
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, username: usernameToSend, stayLoggedIn: data.stayLoggedIn })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle blocked IP from server
        if (response.status === 429) {
          setIsBlocked(true);
          setBlockTimeLeft(errorData.timeLeft || 3600);
          setError(errorData.message);
          return;
        }
        
        // Handle login attempts
        const newAttempts = errorData.attempts || loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (errorData.blocked) {
          setIsBlocked(true);
          setBlockTimeLeft(3600);
          setError('Muitas tentativas incorretas. IP bloqueado por 1 hora.');
        } else {
          setError(`Credenciais inválidas. Tentativa ${newAttempts}/4`);
        }
        return;
      }
      
      // Success - show toast and reload after 3 seconds
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando...",
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error: any) {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      setError('');
      
      // Validate captcha
      if (parseInt(data.captcha) !== captcha.answer) {
        setError('Captcha incorreto');
        refreshCaptcha();
        return;
      }
      
      // Prepare registration data
      const registerData = {
        fullName: data.fullName,
        phone: data.phone || null,
        email: data.email.toLowerCase(),
        password: data.password
      };
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Redirecionando para o email...'
      });
      
      // Success - redirect to main app
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error: any) {
      setError(error.message);
      refreshCaptcha();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[95vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Eliano Mail</CardTitle>
          <CardDescription>
            Acesse sua conta ou crie uma nova
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Registrar</TabsTrigger>
            </TabsList>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isBlocked && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  IP bloqueado. Tempo restante: {formatTime(blockTimeLeft)}
                </AlertDescription>
              </Alert>
            )}
            
            <TabsContent value="login" className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide px-2">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de usuário ou Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              placeholder="teste ou teste@dominio.com"
                              className="pl-10"
                              disabled={isBlocked}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              className="pl-10 pr-10"
                              disabled={isBlocked}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              disabled={isBlocked}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Checkbox para permanecer conectado */}
                  <div className="flex items-center space-x-3 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 border border-blue-200 dark:border-blue-800">
                    <input
                      type="checkbox"
                      id="stayLoggedIn"
                      checked={loginForm.watch("stayLoggedIn") || false}
                      onChange={(e) => loginForm.setValue("stayLoggedIn", e.target.checked)}
                      disabled={isBlocked}
                      className="h-5 w-5 text-blue-600 bg-white border-2 border-blue-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="stayLoggedIn"
                        className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer block"
                      >
                        Permanecer conectado
                      </label>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Manter sessão ativa mesmo após fechar o navegador
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isBlocked || loginForm.formState.isSubmitting}
                  >
                    {loginForm.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
                  </Button>
                  
                  <p className="text-center text-sm text-gray-500">
                    Não tem uma conta? <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => setActiveTab('register')}>Registre-se aqui</span>
                  </p>
                  
                  {loginAttempts > 0 && !isBlocked && (
                    <p className="text-sm text-center text-yellow-600">
                      Tentativas restantes: {4 - loginAttempts}
                    </p>
                  )}
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-2">
              <Form {...registerForm}>
                <div className="max-h-[70vh] overflow-y-auto scrollbar-hide px-2" style={{ overflowY: 'auto' }}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="João"
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sobrenome *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="Silva"
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  

                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <div className="relative flex">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                            <Input
                              type="text"
                              placeholder="seunome"
                              className="pl-10 pr-0 rounded-r-none border-r-0"
                              value={field.value?.replace('@eliano.dev', '') || ''}
                              onChange={(e) => {
                                const username = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '');
                                field.onChange(username + '@eliano.dev');
                              }}
                            />
                            <div className="bg-gray-100 dark:bg-gray-800 border border-l-0 rounded-r-md px-3 py-2 text-sm text-gray-600 dark:text-gray-300 flex items-center">
                              @eliano.dev
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 8 char"
                                className="pl-10 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repetir Senha *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Repita senha"
                                className="pl-10 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-sm">Captcha *</Label>
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded border text-center font-mono text-base flex-1">
                        {captcha.question} = ?
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={refreshCaptcha}
                        className="px-2"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="captcha"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Resultado"
                              type="number"
                              style={{ overflow: 'hidden' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerForm.formState.isSubmitting}
                  >
                    {registerForm.formState.isSubmitting ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                  </form>
                </div>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}