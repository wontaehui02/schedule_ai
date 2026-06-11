const url = "https://bhnjvtghqssqxhqpyqvc.supabase.co/rest/v1/schedule_ai?select=순번&limit=1";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobmp2dGdocXNzcXhocXB5cXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDE3NjAsImV4cCI6MjA5NjcxNzc2MH0.cF8mT1NLk63PjSuq5FX7-MY7qoDPDcjNoZAQKYxlRdQ";

fetch(url, {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
