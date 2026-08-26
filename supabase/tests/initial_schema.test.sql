begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'matches', 'matches table exists');
select has_table('public', 'match_teams', 'match teams table exists');
select has_table('public', 'match_participants', 'participants table exists');
select has_table('public', 'match_events', 'event journal exists');
select has_table('public', 'match_confirmations', 'confirmations table exists');

select has_function('public', 'create_match', array['public.match_mode', 'integer'], 'create_match RPC exists');
select has_function('public', 'join_match', array['text'], 'join_match RPC exists');
select has_function('public', 'add_goal', array['uuid', 'uuid', 'uuid'], 'add_goal RPC exists');
select has_function('public', 'cancel_goal', array['uuid', 'uuid', 'uuid'], 'cancel_goal RPC exists');
select has_function('public', 'confirm_result', array['uuid'], 'confirm_result RPC exists');
select has_function('public', 'reject_result', array['uuid'], 'reject_result RPC exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.matches'::regclass),
  'RLS is enabled on matches'
);
select ok(
  not has_table_privilege('authenticated', 'public.match_events', 'INSERT'),
  'clients cannot insert events directly'
);

select * from finish();
rollback;
