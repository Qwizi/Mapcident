"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { toast } from "sonner"
import { loginAction } from "@/lib/api/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const schema = z.object({
  email: z.string().email("Podaj prawidłowy adres e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await loginAction(data.email, data.password)
      toast.success("Zalogowano pomyślnie")
      // Full page navigation — server re-renders Navbar with current user
      window.location.href = "/"
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd logowania")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Logowanie</CardTitle>
          <CardDescription>Zaloguj się do MapCident</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jan@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasło</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logowanie…" : "Zaloguj się"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <Link href="/register" className="ml-1 text-primary underline">
            Zarejestruj się
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
