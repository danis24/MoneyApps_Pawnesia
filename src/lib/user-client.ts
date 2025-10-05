import { useAuth, useUser } from "@clerk/nextjs";

// Client-side hook for getting current user
export function useCurrentUser() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  return {
    isLoaded,
    isSignedIn,
    user,
    id: user?.id,
  };
}

// Client-side utility for getting auth token
export async function getClientAuthToken() {
  // This should be called from client components
  // Note: In real implementation, you might need to use Clerk's client-side methods
  return null;
}