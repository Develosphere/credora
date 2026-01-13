"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import type { User } from "@/lib/api/types";

/**
 * Authentication hook for managing user session
 * Provides login, logout, and session management functions
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Query for current user session
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchUser,
  } = useQuery<User | null>({
    queryKey: ["auth", "session"],
    queryFn: authApi.getSession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      const { redirectUrl } = await authApi.googleLogin();
      return redirectUrl;
    },
    onSuccess: (redirectUrl) => {
      window.location.href = redirectUrl;
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onMutate: () => {
      // Clear all queries immediately
      queryClient.clear();
    },
    onError: () => {
      // Even on error, the logout function handles redirect
    },
  });

  /**
   * Initiate Google OAuth login
   */
  const login = () => {
    loginMutation.mutate();
  };

  /**
   * Logout and clear session
   */
  const logout = () => {
    logoutMutation.mutate();
  };

  /**
   * Get the current user
   */
  const getUser = () => user;

  /**
   * Get the user ID (email) for API calls
   */
  const getUserId = () => user?.email || null;

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  /**
   * Check if user has completed onboarding
   */
  const hasCompletedOnboarding = user?.onboardingComplete ?? false;

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    hasCompletedOnboarding,
    login,
    logout,
    getUser,
    getUserId,
    refetchUser,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
  };
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated (after loading)
  if (!isLoading && !isAuthenticated) {
    router.push("/login");
  }

  return { user, isLoading, isAuthenticated };
}

/**
 * Hook to require onboarding completion
 * Redirects to onboarding if not completed
 */
export function useRequireOnboarding() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, hasCompletedOnboarding } =
    useAuth();

  // Redirect to onboarding if not completed (after loading)
  if (!isLoading && isAuthenticated && !hasCompletedOnboarding) {
    router.push("/onboarding");
  }

  return { user, isLoading, isAuthenticated, hasCompletedOnboarding };
}
