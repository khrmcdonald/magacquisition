import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload a JPEG Blob to vehicle-photos bucket.
// Returns the public URL string, or throws on error.
export async function uploadVehiclePhoto(blob, vin6, index) {
  const path = `${vin6}/${Date.now()}_${index}.jpg`;
  const { error } = await supabase.storage
    .from('vehicle-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(path);
  return data.publicUrl;
}
