import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking questions_for_students...");
  const { data: qs_student, error: err_student } = await supabase.from('questions_for_students').select('*').limit(5);
  console.log("questions_for_students error:", err_student);
  console.log("questions_for_students count:", qs_student?.length);

  console.log("Checking questions...");
  const { data: qs, error: err } = await supabase.from('questions').select('id, status').limit(5);
  console.log("questions error:", err);
  console.log("questions count:", qs?.length);
  if (qs && qs.length > 0) {
    console.log("Some questions status:", qs.map(q => q.status));
  }
}

test();
