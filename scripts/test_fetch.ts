import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  let allData: any[] = [];
  let from = 0;
  let to = 999;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.from('questions').select('*').range(from, to);
    if (error) {
       console.log("Error:", error);
       break;
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < 1000) {
         hasMore = false;
      } else {
         from += 1000;
         to += 1000;
      }
    } else {
      hasMore = false;
    }
  }
  
  console.log("Total fetched:", allData.length);
}

testFetch();
