import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  Bitcoin,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { API_ENDPOINTS } from "../config/api";
import { toast } from "sonner";

interface AuthProps {
  onAuthSuccess: () => void;
}

const ModernAuth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
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

    const endpoint = isLogin ? API_ENDPOINTS.SIGNIN : API_ENDPOINTS.SIGNUP;

    try {
      const response = await fetch(endpoint, {
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
        toast.success(isLogin ? "Welcome back!" : "Account created!", {
          description: isLogin
            ? "You have been logged in successfully"
            : "Your trading account is ready",
        });
        setTimeout(() => onAuthSuccess(), 1000); // Small delay for smooth transition
      } else {
        setMessage(data.message || "An error occurred");
        toast.error(isLogin ? "Login failed" : "Signup failed", {
          description: data.message || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage("Network error or server is unreachable.");
      toast.error("Connection error", {
        description: "Network error or server is unreachable",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700">
          <CardHeader className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-4"
            >
              <Activity className="h-12 w-12 text-purple-400" />
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CryptoTrader Pro
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isLogin
                ? "Welcome back to your trading dashboard"
                : "Create your trading account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-sm ${
                    message.includes("successfully")
                      ? "bg-green-500/20 border border-green-500/50 text-green-200"
                      : "bg-red-500/20 border border-red-500/50 text-red-200"
                  }`}
                >
                  {message}
                </motion.div>
              )}

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Activity className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <>
                      {isLogin ? (
                        <LogIn className="h-5 w-5 mr-2" />
                      ) : (
                        <UserPlus className="h-5 w-5 mr-2" />
                      )}
                      {isLogin ? "Sign In" : "Create Account"}
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-slate-400 hover:text-purple-400 transition-colors text-sm"
              >
                {isLogin ? (
                  <>
                    Don't have an account?{" "}
                    <span className="text-purple-400 hover:text-purple-300 font-semibold">
                      Sign up now
                    </span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <span className="text-purple-400 hover:text-purple-300 font-semibold">
                      Sign in
                    </span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Floating Crypto Elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-10 left-10 opacity-20"
        >
          <Bitcoin className="h-8 w-8 text-purple-400" />
        </motion.div>

        <motion.div
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-10 right-10 opacity-20"
        >
          <Bitcoin className="h-6 w-6 text-pink-400" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ModernAuth;
