import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdwoxceqhgmgvmwjsbdr.supabase.co';
const SUPABASE_KEY = 'SUPABASE_ANON_KEY_REMOVED';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
