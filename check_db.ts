
import { supabase } from './src/lib/supabase';

async function checkColumns() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in questions table:', Object.keys(data[0]));
  } else {
    console.log('No data in questions table, cannot check columns.');
  }
}

checkColumns();
