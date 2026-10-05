/**
 * Sign Up — creates the account in the SAME Supabase auth system the website
 * uses (no second user database). If "Confirm email" is on in Supabase, the
 * website's existing confirmation-email flow sends the link; otherwise the
 * user is signed straight in.
 */
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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
import { colors, fonts, radius } from "@/lib/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignUp() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function validate(): boolean {
    const next: typeof errors = {};
    if (fullName.trim().length < 2) next.fullName = "Please enter your full name.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (password.length < 6) next.password = "Use at least 6 characters.";
    else if (!/\d/.test(password)) next.password = "Include at least one number.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (busy) return;
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    const result = await signUp(email, password, fullName);
    if (!result.ok) {
      setFormError(result.error);
      setBusy(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (result.needsConfirmation) {
      router.replace({
        pathname: "/sign-in",
        params: { notice: "check-email" },
      });
    } else {
      router.replace("/home");
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Same account as the Cnaz Foods website, so your cart and orders follow you.
          </Text>
        </View>

        {formError ? (
          <View style={styles.formError}>
            <InlineError message={formError} />
          </View>
        ) : null}

        <View style={styles.form}>
          <Field
            label="Full name"
            placeholder="e.g. Ada Obi"
            autoComplete="name"
            textContentType="name"
            value={fullName}
            onChangeText={(value) => {
              setFullName(value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            error={errors.fullName}
          />
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
            placeholder="At least 6 characters, with a number"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
          />
          <Field
            label="Confirm password"
            placeholder="Repeat your password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
            }}
            error={errors.confirm}
          />
          <Button label={busy ? "Creating account…" : "Sign Up"} onPress={() => void handleSubmit()} busy={busy} />
        </View>

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

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <Pressable accessibilityRole="link" onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.switchLink}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 25,
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
    gap: 15,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
    padding: 20,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    marginBottom: 14,
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
  switchText: {
    fontSize: 14.5,
    color: colors.ink[600],
  },
  switchLink: {
    fontSize: 14.5,
    fontFamily: fonts.bodySemiBold,
    color: colors.brand[700],
  },
});
