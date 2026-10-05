/**
 * Shared UI primitives for the Cnaz Foods app — buttons, fields, chips and
 * state views. Touch targets are >= 44px, labels are explicit, errors are
 * tied to their field, and every destructive action asks first.
 */
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import {
  AlertTriangle,
  BagShopping,
  ClipboardText,
  Search,
} from "reicon-react-native";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";

// ---------------------------------------------------------------- Button
type ButtonVariant = "primary" | "secondary" | "danger" | "onDark";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}) {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.brand[600], fg: colors.white },
    secondary: { bg: colors.white, fg: colors.brand[700], border: colors.brand[600] },
    danger: { bg: colors.accent.DEFAULT, fg: colors.white },
    onDark: { bg: colors.gold.DEFAULT, fg: colors.ink[950] },
  };
  const tone = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone.bg, borderColor: tone.border ?? tone.bg, opacity: disabled || busy ? 0.55 : pressed ? 0.88 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={tone.fg} size="small" /> : icon}
      <Text style={[styles.buttonLabel, { color: tone.fg }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Chip
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? colors.brand[600] : pressed ? colors.brand[50] : colors.white },
      ]}
    >
      <Text style={[styles.chipLabel, { color: selected ? colors.white : colors.ink[700] }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Field
type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function Field({ label, error, hint, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.ink[300]}
        {...inputProps}
        style={[
          styles.input,
          error ? styles.inputInvalid : null,
          style,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- States
/** Kinds of drawn (never emoji) illustrations for empty and error states. */
export type StateKind = "cart" | "search" | "snacks" | "orders" | "warning";

const STATE_ICONS: Record<StateKind, typeof BagShopping> = {
  cart: BagShopping,
  search: Search,
  snacks: BagShopping,
  orders: ClipboardText,
  warning: AlertTriangle,
};

/** A soft drawn illustration: icon on a brand-green wash with accent dots. */
export function StateIllustration({ kind }: { kind: StateKind }) {
  const Icon = STATE_ICONS[kind];
  return (
    <View style={styles.illustWrap}>
      <View style={[styles.illustDotA]} />
      <View style={[styles.illustDotB]} />
      <View style={styles.illustRing} />
      <View style={styles.illustCircle}>
        <Icon size={34} color={colors.brand[600]} />
      </View>
    </View>
  );
}

export function EmptyState({
  kind,
  title,
  message,
  action,
}: {
  kind: StateKind;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.stateWrap}>
      <StateIllustration kind={kind} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.stateWrap}>
      <StateIllustration kind="warning" />
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {onRetry ? (
        <Button label="Try again" onPress={onRetry} variant="secondary" style={{ marginTop: 16 }} />
      ) : null}
    </View>
  );
}

// ------------------------------------------------------- Confirm dialog
/**
 * Centered confirmation dialog, mirroring the website's ConfirmDialog: a
 * dimmed backdrop, a white card with title and body, Cancel plus a confirm
 * action. Used for destructive or significant actions (sign out, delete
 * account) so a single tap can never trigger them by accident.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  busy,
  danger,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel={cancelLabel}
          onPress={busy ? undefined : onCancel}
          style={styles.modalBackdropTouch}
        />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {message ? <Text style={styles.modalMessage}>{message}</Text> : null}
          {children}
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [styles.modalCancel, busy && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.modalCancelLabel}>{cancelLabel}</Text>
            </Pressable>
            <Button
              label={confirmLabel}
              variant={danger ? "danger" : "primary"}
              onPress={onConfirm}
              busy={busy}
              style={styles.modalConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.inlineError}>
      <Text style={styles.inlineErrorText}>{message}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, shadowSoft, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  buttonLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.ink[200],
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 38,
    justifyContent: "center",
  },
  chipLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: colors.ink[800],
  },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.ink[200],
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15.5,
    color: colors.ink[900],
  },
  inputInvalid: {
    borderColor: colors.accent.DEFAULT,
    backgroundColor: colors.accent.soft,
  },
  errorText: {
    color: colors.accent.dark,
    fontSize: 12.5,
    fontFamily: fonts.bodyMedium,
  },
  hintText: {
    color: colors.ink[500],
    fontSize: 12.5,
  },
  stateWrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  illustWrap: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  illustCircle: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
    alignItems: "center",
    justifyContent: "center",
  },
  illustRing: {
    position: "absolute",
    top: 0,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand[200],
    borderStyle: "dashed",
  },
  illustDotA: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand[200],
  },
  illustDotB: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold.soft,
  },
  stateTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink[900],
    textAlign: "center",
  },
  stateMessage: {
    marginTop: 6,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.ink[600],
    textAlign: "center",
  },
  inlineError: {
    backgroundColor: colors.accent.soft,
    borderColor: "rgba(179,38,30,0.3)",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inlineErrorText: {
    color: colors.accent.dark,
    fontSize: 13.5,
    fontFamily: fonts.bodyMedium,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink[100],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,15,8,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBackdropTouch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 17.5,
    color: colors.ink[900],
  },
  modalMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink[600],
  },
  modalActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ink[200],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modalCancelLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink[700],
  },
  modalConfirm: {
    flexGrow: 1,
    flexBasis: 0,
  },
});
