import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { currentAccountQueryOptions } from '~/lib/account/hooks';
import { supabase } from '~/lib/supabase-client';

import { useSignUp } from './hooks';
import { GoogleButton } from '~/components/sso-buttons/google-button';
import { appName } from '~/lib/constants';

type SsoProvider = 'google' | 'azure';

interface SignUpFormValue {
  fullName: string;
  email: string;
  password: string;
  venueName: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrengthLabel(password: string): string {
  if (!password) return '';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return ['Weak', 'Weak', 'Fair', 'Strong'][score];
}

function fieldError(errors: unknown[]): string | null {
  const first = errors[0];
  return typeof first === 'string' ? first : null;
}

export default function SignUp() {
  const navigate = useNavigate();
  const signUpMutation = useSignUp();

  const [sessionUser, setSessionUser] = useState<
    { fullName: string; email: string } | null | undefined
  >(undefined);
  const [ssoSubmitting, setSsoSubmitting] = useState<SsoProvider | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState<
    string | null
  >(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) {
        setSessionUser(null);
        return;
      }
      setSessionUser({
        fullName: (user.user_metadata?.full_name as string | undefined) ?? '',
        email: user.email ?? '',
      });
    });
  }, []);

  const accountQuery = useQuery({
    ...currentAccountQueryOptions,
    enabled: !!sessionUser,
    retry: false,
  });

  useEffect(() => {
    if (accountQuery.data) {
      navigate('/', { replace: true });
    }
  }, [accountQuery.data, navigate]);

  async function completeSignUp(fullName: string, venueName: string) {
    setBootstrapError(null);
    try {
      await signUpMutation.mutateAsync({ fullName, venueName });
      navigate('/', { replace: true });
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  const form = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      venueName: '',
    } as SignUpFormValue,
    onSubmit: async ({ value }) => {
      setBootstrapError(null);
      const { data, error } = await supabase.auth.signUp({
        email: value.email,
        password: value.password,
        options: { data: { full_name: value.fullName } },
      });
      if (error) {
        setBootstrapError(error.message);
        return;
      }
      if (!data.session) {
        setAwaitingEmailConfirmation(value.email);
        return;
      }
      await completeSignUp(value.fullName, value.venueName);
    },
  });

  const venueOnlyForm = useForm({
    defaultValues: { venueName: '' },
    onSubmit: async ({ value }) => {
      if (!sessionUser) return;
      await completeSignUp(sessionUser.fullName, value.venueName);
    },
  });

  async function handleSso(provider: SsoProvider) {
    setSsoError(null);
    setSsoSubmitting(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href },
    });
    if (error) {
      setSsoError(error.message);
      setSsoSubmitting(null);
    }
  }

  if (sessionUser === undefined) {
    return null;
  }

  if (sessionUser && (accountQuery.isPending || accountQuery.isSuccess)) {
    return null;
  }

  function appNameTransform(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-sans text-sm font-semibold tracking-wide uppercase">
            Create your account
          </CardTitle>
          <CardDescription>
            Set up {appNameTransform(appName)} for your venue in a couple of minutes.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {awaitingEmailConfirmation ? (
            <Alert>
              <AlertDescription>
                Check {awaitingEmailConfirmation} for a confirmation link, then come back
                here to finish setting up your venue.
              </AlertDescription>
            </Alert>
          ) : sessionUser ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                venueOnlyForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <FieldDescription>
                  Signed in as {sessionUser.email || sessionUser.fullName}. Just need your
                  venue's name to finish setting up.
                </FieldDescription>
                <venueOnlyForm.Field name="venueName">
                  {field => (
                    <Field>
                      <FieldLabel htmlFor="venue-name">Venue name</FieldLabel>
                      <Input
                        id="venue-name"
                        required
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={e => field.handleChange(e.target.value)}
                        placeholder="e.g. Corner Cafe"
                      />
                    </Field>
                  )}
                </venueOnlyForm.Field>

                {bootstrapError && (
                  <Alert variant="destructive">
                    <AlertDescription>{bootstrapError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-1">
                  <Button
                    type="submit"
                    className="w-full font-semibold"
                    disabled={signUpMutation.isPending}
                  >
                    {signUpMutation.isPending
                      ? 'Setting up…'
                      : 'Start your free 2-month trial'}
                  </Button>
                  <p className="text-muted-foreground text-center text-xs">
                    No credit card required
                  </p>
                </div>
              </FieldGroup>
            </form>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                <div className="flex flex-col gap-2">
                  <GoogleButton
                    type="button"
                    className="w-full"
                    disabled={ssoSubmitting !== null}
                    signup
                    onClick={() => handleSso('google')}
                  >
                    Signup with Google
                  </GoogleButton>
                </div>

                {ssoError && (
                  <Alert variant="destructive">
                    <AlertDescription>{ssoError}</AlertDescription>
                  </Alert>
                )}

                <div className="relative -my-2 h-5 text-sm">
                  <Separator className="absolute inset-0 top-1/2" />
                  <span className="bg-card text-muted-foreground relative mx-auto block w-fit px-2">
                    or
                  </span>
                </div>

                <form.Field name="fullName">
                  {field => (
                    <Field>
                      <FieldLabel htmlFor="full-name">Full name</FieldLabel>
                      <Input
                        id="full-name"
                        required
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={e => field.handleChange(e.target.value)}
                        placeholder="Jamie Rivera"
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field
                  name="email"
                  validators={{
                    onBlur: ({ value }) =>
                      value && !EMAIL_PATTERN.test(value)
                        ? 'Enter a valid email address.'
                        : undefined,
                  }}
                >
                  {field => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor="work-email">Email</FieldLabel>
                      <Input
                        id="work-email"
                        type="email"
                        required
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        autoComplete="email"
                        onChange={e => field.handleChange(e.target.value)}
                        placeholder="you@example.com"
                      />
                      {fieldError(field.state.meta.errors) && (
                        <p className="text-destructive text-sm">
                          {fieldError(field.state.meta.errors)}
                        </p>
                      )}
                    </Field>
                  )}
                </form.Field>

                <form.Field
                  name="password"
                  validators={{
                    onBlur: ({ value }) =>
                      value && value.length < 8
                        ? 'Use at least 8 characters.'
                        : undefined,
                  }}
                >
                  {field => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={e => field.handleChange(e.target.value)}
                        placeholder="••••••••"
                      />
                      {field.state.value && (
                        <FieldDescription>
                          Password strength: {passwordStrengthLabel(field.state.value)}
                        </FieldDescription>
                      )}
                      {fieldError(field.state.meta.errors) && (
                        <p className="text-destructive text-sm">
                          {fieldError(field.state.meta.errors)}
                        </p>
                      )}
                    </Field>
                  )}
                </form.Field>

                <form.Field name="venueName">
                  {field => (
                    <Field>
                      <FieldLabel htmlFor="venue-name">Venue name</FieldLabel>
                      <Input
                        id="venue-name"
                        required
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={e => field.handleChange(e.target.value)}
                        placeholder="e.g. Corner Cafe"
                      />
                    </Field>
                  )}
                </form.Field>

                {bootstrapError && (
                  <Alert variant="destructive">
                    <AlertDescription>{bootstrapError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-1">
                  <Button
                    type="submit"
                    className="w-full font-semibold"
                    disabled={form.state.isSubmitting || signUpMutation.isPending}
                  >
                    {form.state.isSubmitting || signUpMutation.isPending
                      ? 'Setting up…'
                      : 'Start your free 2-month trial'}
                  </Button>
                  <p className="text-muted-foreground text-center text-xs">
                    No credit card required
                  </p>
                </div>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
