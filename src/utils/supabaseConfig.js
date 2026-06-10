const supabaseConfig = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key-here'
};

export const isSupabaseConfigured = () => {
  return supabaseConfig.url && !supabaseConfig.url.includes('your-project') && supabaseConfig.anonKey && !supabaseConfig.anonKey.includes('your-anon');
};

export default supabaseConfig;
