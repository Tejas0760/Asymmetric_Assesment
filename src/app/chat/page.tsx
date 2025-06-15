"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/copy-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CodeIcon, EyeOpenIcon, ReloadIcon } from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateType = "basic" | "modern" | "saas";

const extractCodeBlocks = (content: string = "") => {
  const htmlMatch = content.match(/```html([\s\S]*?)```/s);
  const cssMatch = content.match(/```css([\s\S]*?)```/s);

  return {
    html: htmlMatch ? htmlMatch[1].trim() : "",
    css: cssMatch ? cssMatch[1].trim() : "",
    text: content.replace(/```(html|css)([\s\S]*?)```/gs, "").trim(),
  };
};

const processHtmlForPreview = (html: string) => {
  // Convert relative image paths to absolute
  return html.replace(
    /(<img[^>]+src=")(?!https?:\/\/)([^"]+)/g,
    "$1https://$2"
  );
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "html" | "css">(
    "preview"
  );
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [lastGeneratedCode, setLastGeneratedCode] = useState<{
    html: string;
    css: string;
  } | null>(null);
  const [template, setTemplate] = useState<TemplateType>("basic");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      const { html, css } = extractCodeBlocks(lastMessage.content);
      if (html || css) {
        setLastGeneratedCode({ html, css });
        setIframeKey(Date.now());
      }
    }
  }, [messages]);

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ReloadIcon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getDisplayName = (user?: { name?: string | null }) => {
    if (!user?.name) return "User";
    return user.name.trim().split(/\s+/)[0];
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          template,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/sign-in");
  };

  const lastMessage = messages[messages.length - 1];
  const hasCodeBlocks =
    lastMessage?.role === "assistant" &&
    (extractCodeBlocks(lastMessage.content).html ||
      extractCodeBlocks(lastMessage.content).css);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-semibold">Landing Page Generator</h1>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {getDisplayName(session?.user)}
            </span>

            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full p-0"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={session?.user?.image ?? undefined}
                        alt="User avatar"
                      />
                      <AvatarFallback className="bg-gray-100">
                        {getInitials(session?.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="w-40 bg-white shadow-lg rounded-md border"
                >
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer px-4 py-2 "
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r bg-white flex flex-col relative">
          <div className="bg-white border-b p-4">
            <div className="flex items-center gap-4">
              <Select
                value={template}
                onValueChange={(value) => setTemplate(value as TemplateType)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="bg-white ">
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {template === "basic"
                  ? "Simple layout"
                  : template === "modern"
                    ? "Modern design"
                    : "SaaS template"}
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p>Start by describing your landing page</p>
                    <p>
                      Example: &quot;Create a modern landing page for a SaaS
                      product&quot;
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <Card
                      className={`max-w-3xl ${message.role === "user" ? "bg-blue-50 border-blue-200" : "bg-white"}`}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {message.role === "user" ? (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-blue-500 text-white text-xs">
                                  Y
                                </AvatarFallback>
                              </Avatar>
                              You
                            </>
                          ) : (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-purple-500 text-white text-xs">
                                  AI
                                </AvatarFallback>
                              </Avatar>
                              Assistant
                            </>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none">
                            {extractCodeBlocks(message.content).text && (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: extractCodeBlocks(message.content)
                                    .text,
                                }}
                              />
                            )}
                            {(extractCodeBlocks(message.content).html ||
                              extractCodeBlocks(message.content).css) && (
                              <div className="mt-4">
                                <Badge variant="outline" className="mb-2">
                                  Generated Code
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="max-w-3xl bg-white">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-purple-500 text-white text-xs">
                            AI
                          </AvatarFallback>
                        </Avatar>
                        Assistant
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ReloadIcon className="h-4 w-4 animate-spin" />
                        Generating response...
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your landing page..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="w-1/2 bg-white flex flex-col">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 p-1">
              <EyeOpenIcon className="h-5 w-5" />
              Live Preview
            </h2>
          </div>

          {hasCodeBlocks ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "preview" | "html" | "css")
              }
              className="flex-1 flex flex-col"
            >
              <div className="border-b">
                <TabsList className="grid w-full grid-cols-3 rounded-none">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="preview" className="h-full m-0">
                  {lastGeneratedCode ? (
                    <iframe
                      key={`preview-${iframeKey}`}
                      ref={previewRef}
                      className="w-full h-full border-0 bg-white"
                      sandbox="allow-scripts allow-same-origin"
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <base href="https://example.com/">
                          <style>
                            ${lastGeneratedCode.css}
                            html, body { 
                              margin: 0;
                              padding: 0;
                              min-height: 100%;
                              overflow: auto;
                            }
                            * { box-sizing: border-box; }
                            img {
                              max-width: 100%;
                              height: auto;
                              display: block;
                            }
                          </style>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body>
                          ${processHtmlForPreview(lastGeneratedCode.html)}
                        </body>
                        </html>
                      `}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="html" className="h-full m-0 overflow-auto">
                  <div className="flex justify-end p-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadFile(
                          lastGeneratedCode?.html || "",
                          "index.html"
                        )
                      }
                    >
                      Download HTML
                    </Button>
                    <CopyButton
                      text={lastGeneratedCode?.html || ""}
                      className="h-8 px-3"
                    />
                  </div>
                  <ScrollArea className="h-[calc(100%-40px)] bg-[#1e1e1e]">
                    <div className="p-4">
                      <pre className="text-gray-200 text-sm font-mono">
                        {lastGeneratedCode?.html || "No HTML content"}
                      </pre>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="css" className="h-full m-0 overflow-auto">
                  <div className="flex justify-end p-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadFile(lastGeneratedCode?.css || "", "styles.css")
                      }
                    >
                      Download CSS
                    </Button>
                    <CopyButton
                      text={lastGeneratedCode?.css || ""}
                      className="h-8 px-3"
                    />
                  </div>
                  <ScrollArea className="h-[calc(100%-40px)] bg-[#1e1e1e]">
                    <div className="p-4">
                      <pre className="text-gray-200 text-sm font-mono">
                        {lastGeneratedCode?.css || "No CSS content"}
                      </pre>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <CodeIcon className="h-8 w-8 mx-auto mb-2" />
                <p>Generated code will appear here</p>
                <p className="text-sm">
                  Describe your landing page to see the preview
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
