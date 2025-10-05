// Test script for variations functionality
import { createSupabaseClientWithAuth } from "./supabase-client";

export async function testVariationsSetup() {
  console.log("Testing variations setup...");

  try {
    // Test 1: Check if variation_types table exists
    const { data: types, error: typesError } = await createSupabaseClientWithAuth("")
      .from("variation_types")
      .select("*")
      .limit(1);

    if (typesError) {
      console.error("❌ variation_types table not accessible:", typesError);
      return false;
    }

    console.log("✅ variation_types table accessible");

    // Test 2: Check if variation_options table exists
    const { data: options, error: optionsError } = await createSupabaseClientWithAuth("")
      .from("variation_options")
      .select("*")
      .limit(1);

    if (optionsError) {
      console.error("❌ variation_options table not accessible:", optionsError);
      return false;
    }

    console.log("✅ variation_options table accessible");

    // Test 3: Check if product_variations table exists
    const { data: variations, error: variationsError } = await createSupabaseClientWithAuth("")
      .from("product_variations")
      .select("*")
      .limit(1);

    if (variationsError) {
      console.error("❌ product_variations table not accessible:", variationsError);
      return false;
    }

    console.log("✅ product_variations table accessible");

    // Test 4: Check if system variation types exist
    const { data: systemTypes, error: systemTypesError } = await createSupabaseClientWithAuth("")
      .from("variation_types")
      .select("*")
      .eq("user_id", "system");

    if (systemTypesError) {
      console.error("❌ Error checking system variation types:", systemTypesError);
      return false;
    }

    console.log(`✅ Found ${systemTypes?.length || 0} system variation types`);

    // Test 5: Check if system variation options exist
    const { data: systemOptions, error: systemOptionsError } = await createSupabaseClientWithAuth("")
      .from("variation_options")
      .select("*")
      .eq("user_id", "system");

    if (systemOptionsError) {
      console.error("❌ Error checking system variation options:", systemOptionsError);
      return false;
    }

    console.log(`✅ Found ${systemOptions?.length || 0} system variation options`);

    return true;

  } catch (error) {
    console.error("❌ Unexpected error testing variations:", error);
    return false;
  }
}

export async function runVariationsTest() {
  const result = await testVariationsSetup();
  if (result) {
    console.log("🎉 All variations tests passed!");
  } else {
    console.log("❌ Some variations tests failed!");
  }
  return result;
}