import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/chat");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight">
          HTML/CSS Generator Chatbot
        </h1>
        <p className="text-lg text-muted-foreground">
          Get instant HTML and CSS templates by chatting with our AI assistant.
          Sign up to get started!
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
