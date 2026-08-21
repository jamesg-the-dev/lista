import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login/route.tsx'),
  layout('layouts/AppLayout.tsx', [
    index('./routes/home.tsx'),
    route('roster', 'routes/roster/route.tsx'),
    route('dashboard', 'routes/dashboard/route.tsx'),
    route('staff', 'routes/staff/route.tsx'),
    route('staff/new', 'routes/staff/new.tsx'),
    route('staff/:staffId', 'routes/staff/profile.tsx'),
    route('settings', 'routes/settings/route.tsx', [
      index('routes/settings/index.tsx'),
      route('venue-profile', 'routes/settings/venue-profile.tsx'),
      route('award-pay', 'routes/settings/award-pay.tsx'),
      route('roster-rules', 'routes/settings/roster-rules.tsx'),
      route('staff-roles', 'routes/settings/staff-roles.tsx'),
    ]),
  ]),
] satisfies RouteConfig;
