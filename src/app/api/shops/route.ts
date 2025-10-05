import { createSupabaseServerClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/user";
import { NextResponse } from "next/server";

// Example API route that requires authentication
export async function GET() {
  try {
    // Get current user from Clerk
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Create authenticated Supabase client
    const supabase = await createSupabaseServerClient();

    // Example: Fetch user's own data from a 'profiles' table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Example: Fetch user's shops from a 'shops' table
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('*')
      .eq('user_id', user.id);

    if (shopsError) {
      console.error('Shops fetch error:', shopsError);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Authenticated data fetched successfully',
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName
      },
      profile: profile || null,
      shops: shops || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Example: Create new shop (requires authentication)
export async function POST(request: Request) {
  try {
    // Get current user from Clerk
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, address } = body;

    if (!name) {
      return NextResponse.json({
        status: 'error',
        message: 'Shop name is required'
      }, { status: 400 });
    }

    // Create authenticated Supabase client
    const supabase = await createSupabaseServerClient();

    // Insert new shop with user as owner
    const { data: shop, error } = await supabase
      .from('shops')
      .insert({
        name,
        description: description || null,
        address: address || null,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Shop creation error:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to create shop',
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Shop created successfully',
      shop
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}