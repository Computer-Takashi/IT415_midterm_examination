// Public, low-privilege application credentials. Never place a service-role key here.
// The legacy anon JWT is used only because the Edge Function gateway verifies JWTs.
export const BACKEND = Object.freeze({
  url: 'https://jgcwnzrsdkosxtfrbzks.supabase.co/functions/v1/kiosk-checkout',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnY3duenJzZGtvc3h0ZnJiemtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODczNTQsImV4cCI6MjEwNjg2MzM1NH0.b9VdyPNoO_-OFmfkU2ur8DoIy45JgrLMlhNVrKxoYz8'
});
