
-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  email text,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for subscriptions
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  status text not null, -- 'active', 'past_due', 'canceled', 'simulated_pro'
  plan_id text not null, -- 'price_monthly', 'price_yearly'
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table subscriptions enable row level security;

create policy "Users can view own subscriptions."
  on subscriptions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own subscriptions."
  on subscriptions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own subscriptions."
  on subscriptions for update
  using ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for usage logs
create table usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  action_type text not null, -- 'generate_quiz', 'generate_study_guide'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table usage_logs enable row level security;

create policy "Users can view own usage logs."
  on usage_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert own usage logs."
  on usage_logs for insert
  with check ( auth.uid() = user_id );
