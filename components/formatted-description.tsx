import type { ReactNode } from "react";

export function FormattedDescription({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const content: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("## ")) {
      content.push(<h3 key={index}>{line.slice(3)}</h3>);
      index += 1;
      continue;
    }
    if (/^[-•]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-•]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-•]\s+/, "")); index += 1;
      }
      content.push(<ul key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, "")); index += 1;
      }
      content.push(<ol key={`ordered-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>);
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(## |[-•]\s+|\d+[.)]\s+)/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim()); index += 1;
    }
    content.push(<p key={`paragraph-${index}`}>{paragraph.join(" ")}</p>);
  }

  return <div className="formatted-description">{content}</div>;
}
