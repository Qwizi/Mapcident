"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { toast } from "sonner"
import { registerAction } from "@/lib/api/auth"
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

const schema = z
  .object({
    email: z.string().email("Podaj prawidłowy adres e-mail"),
    username: z.string().min(3, "Nazwa użytkownika musi mieć min. 3 znaki"),
    password: z.string().min(8, "Hasło musi mieć min. 8 znaków"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  })
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await registerAction(data.email, data.username, data.password)
      toast.success("Konto utworzone — witaj!")
      window.location.href = "/"
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd rejestracji")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Rejestracja</CardTitle>
          <CardDescription>Utwórz konto w MapCident</CardDescription>
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
                      <Input type="email" placeholder="jan@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa użytkownika</FormLabel>
                    <FormControl>
                      <Input placeholder="jankowalski" {...field} />
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Powtórz hasło</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Tworzenie konta…" : "Zarejestruj się"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Masz już konto?{" "}
          <Link href="/login" className="ml-1 text-primary underline">
            Zaloguj się
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
