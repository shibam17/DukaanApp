import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngvyuozqqmngwgnrxqhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndnl1b3pxcW1uZ3dnbnJ4cWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzYxODcsImV4cCI6MjEwNzAxMjE4N30.2Z7r75-JsWU1is2CrG-TSMX2cGiTr-P3X99YMrJhK4s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
