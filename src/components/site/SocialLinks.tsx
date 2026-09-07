import { Instagram, Linkedin } from "lucide-react";

import { Button } from "@/components/ui/button";

const LINKS = [
  { key: "social.instagram", label: "Instagram", Icon: Instagram },
  { key: "social.linkedin", label: "LinkedIn", Icon: Linkedin },
];

// Round buttons on the same size token as the wide ones, so a row of both
// lines up at one height whatever the theme does to button sizing.
export function SocialLinks({
  content,
  floating = false,
}: {
  content: Record<string, string>;
  floating?: boolean;
}) {
  return (
    <>
      {LINKS.map(({ key, label, Icon }) =>
        content[key] ? (
          <Button
            key={key}
            asChild
            size="lg"
            variant="outline"
            // Floating over the page, these sit on top of photographs — a
            // transparent outline button would disappear against one.
            className={`size-10 rounded-full p-0 ${
              floating ? "bg-background/90 shadow-lg backdrop-blur" : ""
            }`}
          >
            <a href={content[key]} target="_blank" rel="noreferrer noopener" aria-label={label}>
              <Icon className="size-4" />
            </a>
          </Button>
        ) : null,
      )}
    </>
  );
}
