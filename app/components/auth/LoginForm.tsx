import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Input } from "~/components/ui/Input"; // Assuming Input component exists
import { Button } from "~/components/ui/Button"; // Assuming Button component exists
import { Label } from "~/components/ui/Label";   // Assuming Label component exists

export interface LoginActionData {
  error?: string;
}

export default function LoginForm() {
  const actionData = useActionData<LoginActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting" && navigation.formData?.get("_action") === "login";

  return (
    <Form method="post" action="/api/auth" className="space-y-4">
      <input type="hidden" name="_action" value="login" />
      <div>
        <Label htmlFor="email-login">Email</Label>
        <Input
          type="email"
          name="email"
          id="email-login"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="password-login">Password</Label>
        <Input
          type="password"
          name="password"
          id="password-login"
          required
          autoComplete="current-password"
        />
      </div>
      {actionData?.error && (
        <p className="text-red-500 text-sm">{actionData.error}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Login"}
      </Button>
    </Form>
  );
}
