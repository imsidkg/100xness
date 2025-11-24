import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  UserPlus, 
  LogIn,
  TrendingUp,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AuthCardProps {
  onAuthSuccess: () => void;
  onClose?: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onAuthSuccess, onClose }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const endpoint = isLogin ? "/api/v1/user/signin" : "/api/v1/user/signup";

    try {
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        setMessage(
          isLogin ? "Logged in successfully!" : "Account created successfully!"
        );
        setTimeout(() => onAuthSuccess(), 1000);
      } else {
        setMessage(data.message || "An error occurred");
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage("Network error or server is unreachable.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-2xl relative rounded-2xl">
        {onClose && (
          <X 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-5 h-5 text-black/60 hover:text-black transition-colors cursor-pointer"
            aria-label="Close"
          />
        )}
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-gray-700" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isLogin ? "Sign in to your trading account" : "Start your trading journey today"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900 focus:border-gray-500 focus:ring-gray-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white border-gray-300 text-gray-900 focus:border-gray-500 focus:ring-gray-500"
                  placeholder="Enter your password"
                  required
                />
                {showPassword ? (
                  <EyeOff 
                    onClick={() => setShowPassword(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/60 hover:text-black transition-colors cursor-pointer"
                  />
                ) : (
                  <Eye 
                    onClick={() => setShowPassword(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/60 hover:text-black transition-colors cursor-pointer"
                  />
                )}
              </div>
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg text-sm ${
                  message.includes("successfully") 
                    ? "bg-green-50 border border-green-200 text-green-700" 
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {message}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 transition-all"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  {isLogin ? (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Create Account
                    </>
                  )}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <span
                  onClick={() => setIsLogin(false)}
                  className="text-gray-900 underline underline-offset-4 hover:text-black cursor-pointer transition-colors"
                >
                  Sign up now
                </span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span
                  onClick={() => setIsLogin(true)}
                  className="text-gray-900 underline underline-offset-4 hover:text-black cursor-pointer transition-colors"
                >
                  Sign in
                </span>
              </>
            )}
          </div>

         
        </CardContent>
      </Card>
    </motion.div>
  );
};
