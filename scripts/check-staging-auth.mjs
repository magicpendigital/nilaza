import { createClient } from '@supabase/supabase-js';

const url = 'https://akgrokwnkfqnfjqrildi.supabase.co';
const key = 'sb_publishable_7mmXd4RtRx2xC0Mo6HfKsA_PHDVVbXg';

const sb = createClient(url, key);

async function testStagingUser() {
  const res1 = await sb.auth.signInWithPassword({ email: 'magicpendigital@gmail.com', password: 'magicpendigital' });
  console.log('Login with magicpendigital:', res1.error ? res1.error.message : 'SUCCESS id=' + res1.data.user.id);
  
  const res2 = await sb.auth.signInWithPassword({ email: 'magicpendigital@gmail.com', password: 'Password123!' });
  console.log('Login with Password123!:', res2.error ? res2.error.message : 'SUCCESS id=' + res2.data.user.id);

  // Check reset password
  const res3 = await sb.auth.resetPasswordForEmail('magicpendigital@gmail.com', {
    redirectTo: 'http://localhost:8081/?recovery=1'
  });
  console.log('Reset password request:', res3.error ? res3.error.message : 'SUCCESS (email dispatched by Supabase Cloud)');
}

testStagingUser().catch(console.error);
