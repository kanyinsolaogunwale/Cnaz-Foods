/**
 * Sign In — email/password through the SAME Supabase auth as the website,
 * plus Google when the browser flow is available. Accounts created on the
 * website sign in here unchanged, and vice versa.
 */
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Field, InlineError } from "@/components/ui";
import { GoogleLogo } from "@/components/google-logo";
import { useAuth } from "@/context/auth-context";
import { getBackendConfig } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { ArrowLeft } from "reicon-react-native";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignIn() {
  const router = useRouter();
  const { user, loading, signInWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const googleAvailable = getBackendConfig()?.googleOAuthEnabled ?? false;

  // A session arriving out of band (e.g. the Google bridge redirecting back
  // into this page with tokens in the URL fragment) goes straight Home.
  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [loading, user, router]);

  // Back returns to whatever screen led here (e.g. onboarding); when sign-in
  // is the entry point there is nothing behind it, so go Home as a guest.
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home");
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (password.length < 6) next.password = "Enter your password (at least 6 characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (busy) return;
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    const result = await signInWithPassword(email, password);
    if (result.ok) {
      router.replace("/home");
    } else {
      setFormError(result.error);
      setBusy(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }

  async function handleGoogle() {
    if (googleBusy) return;
    setFormError(null);
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    if (result.ok) {
      router.replace("/home");
    } else {
      setFormError(result.error);
      setGoogleBusy(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={handleBack}
        hitSlop={8}
        style={styles.backButton}
      >
        <ArrowLeft size={20} color={colors.ink[700]} />
      </Pressable>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/splash-icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to keep your cart saved to your account and track your orders.
          </Text>
        </View>

        {formError ? (
          <View style={styles.formError}>
            <InlineError message={formError} />
          </View>
        ) : null}

        <View style={styles.form}>
          <Field
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
          />
          <Field
            label="Password"
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
          />
          <Button label={busy ? "Signing in…" : "Sign In"} onPress={() => void handleSubmit()} busy={busy} />
        </View>

        {googleAvailable ? (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              onPress={() => void handleGoogle()}
              disabled={googleBusy}
              style={({ pressed }) => [
                styles.googleButton,
                (pressed || googleBusy) && { opacity: 0.85 },
              ]}
            >
              <GoogleLogo size={20} />
              <Text style={styles.googleLabel}>
                {googleBusy ? "Opening Google…" : "Continue with Google"}
              </Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <Pressable accessibilityRole="link" onPress={() => router.push("/sign-up")} hitSlop={8}>
            <Text style={styles.switchLink}>Sign Up</Text>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          Accounts created on the Cnaz Foods website work here too, with the same account and the same cart.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backButton: {
    position: "absolute",
    top: 52,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[100],
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 84,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 22,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink[900],
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.ink[600],
    textAlign: "center",
  },
  formError: { marginBottom: 4 },
  form: {
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 20,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 22,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.ink[200] },
  dividerText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.ink[500],
    letterSpacing: 0.5,
  },
  googleButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[200],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.ink[900],
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 26,
  },
  switchText: {
    fontSize: 14.5,
    color: colors.ink[600],
  },
  switchLink: {
    fontSize: 14.5,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[700],
  },
  footnote: {
    marginTop: 18,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.ink[500],
    textAlign: "center",
  },
});
