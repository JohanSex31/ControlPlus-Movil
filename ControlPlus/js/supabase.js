// =============================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores con los de tu proyecto
// =============================================
const SUPABASE_URL = 'https://zslsesmyvdbzueevcbkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbHNlc215dmRienVlZXZjYmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDgyOTcsImV4cCI6MjA5NDcyNDI5N30.hmUQkm1drzCYOEPCnajylA1lflzBJhWnZKt46IHbIlI';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
