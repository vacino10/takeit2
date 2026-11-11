import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Vyplní se z proměnných prostředí (viz README): EXPO_PUBLIC_SUPABASE_URL a EXPO_PUBLIC_SUPABASE_ANON_KEY
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zkhezjbvmefyqfcuytjz.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_n2Xnv9QOjMrtOhtXwhfhCg_y_jUvyX9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isConfigured = !SUPABASE_URL.includes('YOUR-PROJECT');
