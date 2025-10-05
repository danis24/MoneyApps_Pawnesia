# Supabase + Clerk Integration - Fixed Implementation

This implementation fixes the authentication issues between Clerk and Supabase, addressing the 401 errors when fetching data.

## What Was Fixed

1. **Updated Supabase Client API**: Changed from deprecated `auth.setToken()` method to proper header-based authentication
2. **Server-Side Client**: Implemented proper `createSupabaseServerClient()` with Clerk token integration
3. **Client-Side Client**: Updated `createSupabaseClientWithAuth()` to use Authorization headers instead of deprecated method
4. **Removed Duplicate Files**: Cleaned up duplicate `supabase-server.ts` file
5. **Added Examples**: Created working examples for both server-side and client-side usage

## Usage Examples

### Server-Side (Recommended)

```typescript
import { createSupabaseServerClient } from "@/lib/supabase";

export async function getUserShops() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shops:', error);
    return [];
  }

  return data;
}
```

### Client-Side

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { createSupabaseClientWithAuth } from "@/lib/supabase";

function MyComponent() {
  const { getToken } = useAuth();

  const fetchData = async () => {
    const token = await getToken();
    const supabase = createSupabaseClientWithAuth(token);

    const { data, error } = await supabase
      .from('shops')
      .select('*');

    return data;
  };
}
```

### API Routes

```typescript
import { createSupabaseServerClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id);

  return NextResponse.json({ data });
}
```

## Database Setup

1. **Run the Migration**: Execute the SQL in `supabase/migrations/001_moneyapps_tables_with_rls.sql`
2. **Configure Clerk Integration**: Set up third-party auth in Supabase dashboard
3. **Set Environment Variables**: Copy from `.env.example` to `.env.local`

## Troubleshooting

### Still Getting 401 Errors?

1. **Check Clerk Setup**: Ensure third-party auth is configured in Supabase dashboard
2. **Verify Tokens**: Make sure you're using the correct Clerk token method
3. **RLS Policies**: Ensure RLS policies are correctly set up in your tables
4. **Environment Variables**: Double-check all required environment variables

### Common Issues

- **Clerk Template Issues**: If using `{ template: "supabase" }`, ensure the template is configured in Clerk dashboard
- **RLS Policies**: Make sure policies use `auth.jwt() ->> 'sub'` to match Clerk user IDs
- **Token Expiration**: Server-side tokens are handled automatically by Clerk middleware

## Testing

Use the provided examples to test your integration:

1. Visit `/api/db-test` to check database connection
2. Use the `SupabaseExample` component to test client-side operations
3. Use `/api/shops` endpoint to test server-side operations

## Required Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps

1. Set up the database tables using the provided migration
2. Configure Clerk third-party auth in Supabase dashboard
3. Test the integration using the provided examples
4. Implement your specific business logic using the patterns shown

This implementation should resolve the 401 authentication errors and provide a solid foundation for your MoneyApps project.