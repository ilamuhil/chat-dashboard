"use client";
import AuthForm from "@/components/auth/AuthForm";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import supabase from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

const formSchema = z.object({
    email: z.email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export default function LoginPage() {
    const router = useRouter();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          email: "",
          password: "",
        },
    });
    const [error, setError] = useState<string | null>(null);
    const login = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: form.getValues("email"),
            password: form.getValues("password"),
        });
        if (error) {
            console.error(error);
            setError(error.message);
            form.reset();
            setTimeout(() => {
                setError(null);
            }, 3000);
            return
        }
        else {
            console.log(data);
            // Use router.push instead of redirect to trigger loading.tsx
            router.push("/dashboard");
        }
    }
    return (
        <AuthForm mode="login" authflow={login} form={form} error={error} />
    );
}