"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginAction } from "@/app/login/actions"
import { toast } from "sonner"
import { Command } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Iniciando sesión..." : "Ingresar"}
    </Button>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction] = useActionState(loginAction, undefined)

  useEffect(() => {
    if (state?.errors?.server) {
      toast.error(state.errors.server)
    }
  }, [state?.errors?.server])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-lg border-muted/50">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-4">
             <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Command className="size-6" />
              </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Bienvenido</CardTitle>
          <CardDescription>
            Ingresa tu email para acceder a la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@empresa.com"
                  required
                />
                {state?.errors?.email && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {state.errors.email[0]}
                  </p>
                )}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input id="password" name="password" type="password" required />
                {state?.errors?.password && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {state.errors.password[0]}
                  </p>
                )}
              </Field>
              <Field className="pt-2">
                <SubmitButton />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary">
         Al ingresar, aceptas nuestros <a href="#">Términos de Servicio</a> y <a href="#">Política de Privacidad</a>.
      </div>
    </div>
  )
}
