message: "Environment variable missing",
debug: {
  supabase_url: !!process.env.SUPABASE_URL,
  supabase_secret_key: !!process.env.SUPABASE_SECRET_KEY
}
