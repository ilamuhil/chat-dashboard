"use client";
import AuthForm from "@/components/auth/AuthForm";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

const formSchema = z.object({
    email: z.email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export default function LoginPage() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          email: "",
          password: "",
        },
    });

    const login = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: form.getValues("email"),
            password: form.getValues("password"),
        });
        if (error) {
            console.error(error);
            return
        }
        else {
            console.log(data);
            redirect("/dashboard");
        }
    }
    return (
        <AuthForm mode="login" authflow={login} form={form} />
    );
}