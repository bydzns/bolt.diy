import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Input } from "~/components/ui/Input"; // Assuming Input component exists
import { Button } from "~/components/ui/Button"; // Assuming Button component exists
import { Label } from "~/components/ui/Label";   // Assuming Label component exists

export interface SignupActionData {
  error?: string;
  success?: boolean;
  message?: string;
}

export default function SignupForm() {
  const actionData = useActionData<SignupActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting" && navigation.formData?.get("_action") === "signup";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (passwordError && event.target.value === confirmPassword) {
      setPasswordError(null);
    }
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
    if (password !== event.target.value) {
      setPasswordError("Passwords do not match.");
    } else {
      setPasswordError(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (password !== confirmPassword) {
      event.preventDefault(); // Prevent form submission
      setPasswordError("Passwords do not match. Please correct them before submitting.");
    } else {
      setPasswordError(null);
    }
  };

  return (
    <Form method="post" action="/api/auth" className="space-y-4" onSubmit={handleSubmit}>
      <input type="hidden" name="_action" value="signup" />
      <div>
        <Label htmlFor="email-signup">Email</Label>
        <Input
          type="email"
          name="email"
          id="email-signup"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="password-signup">Password</Label>
        <Input
          type="password"
          name="password"
          id="password-signup"
          required
          value={password}
          onChange={handlePasswordChange}
          autoComplete="new-password"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword-signup">Confirm Password</Label>
        <Input
          type="password"
          name="confirmPassword"
          id="confirmPassword-signup"
          required
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          autoComplete="new-password"
        />
      </div>
      {passwordError && (
        <p className="text-red-500 text-sm">{passwordError}</p>
      )}
      {actionData?.error && (
        <p className="text-red-500 text-sm">{actionData.error}</p>
      )}
      {actionData?.success && actionData.message && (
        <p className="text-green-500 text-sm">{actionData.message}</p>
      )}
      <Button type="submit" disabled={isSubmitting || !!passwordError}>
        {isSubmitting ? "Signing up..." : "Sign Up"}
      </Button>
    </Form>
  );
}
