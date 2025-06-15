"use client";

import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function CopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={copyToClipboard}
      className={className}
    >
      {isCopied ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
