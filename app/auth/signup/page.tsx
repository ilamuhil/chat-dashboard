"use client";

import AuthForm from "@/components/auth/AuthForm";
import supabase from "@/lib/supabase";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

const formSchema = z.object({
    email: z.email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});
export default function SignUpPage() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          email: "",
          password: "",
        },
    });
    const [verifyEmail, setVerifyEmail] = useState(false);
    const signUp = async () => {
        const { data, error } = await supabase.auth.signUp({
            email: form.getValues("email"),
            password: form.getValues("password"),
        });
        if (error) {
            console.error(error);
        }
        if (data) {
            console.log(data);
            setVerifyEmail(true)
        }
    }
    return (
        <AuthForm mode="signup" authflow={signUp} form={form} verifyEmail={verifyEmail} />
    );
}